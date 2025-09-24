import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const openaiKey = Deno.env.get('OPENAI_API_KEY');

    if (!supabaseUrl || !supabaseKey || !openaiKey) {
      console.error('Missing environment variables');
      return new Response(JSON.stringify({ error: 'Server configuration error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check if this is for a specific user or all pro users
    const { userId } = await req.json().catch(() => ({}));

    let usersToProcess = [];
    
    if (userId) {
      // Single user mode
      const { data: singleUser, error: singleUserError } = await supabase
        .from('users')
        .select('id')
        .eq('id', userId)
        .eq('plan_name', 'pro')
        .eq('is_subscribed', true)
        .single();
        
      if (singleUserError || !singleUser) {
        return new Response(JSON.stringify({ error: 'User not found or not pro subscriber' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      usersToProcess = [singleUser];
      console.log(`Processing single user: ${userId}`);
    } else {
      // All pro users mode
      const { data: proUsers, error: usersError } = await supabase
        .from('users')
        .select('id')
        .eq('plan_name', 'pro')
        .eq('is_subscribed', true);

      if (usersError) {
        console.error('Error fetching pro users:', usersError);
        return new Response(JSON.stringify({ error: 'Failed to fetch users' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      usersToProcess = proUsers || [];
      console.log(`Found ${usersToProcess.length} pro users`);
    }

    let processedUsers = 0;
    let totalTipsGenerated = 0;

    // Process each pro user
    for (const user of usersToProcess) {
      try {
        // Check current tip count for this user
        const { data: currentTips, error: tipsError } = await supabase
          .from('user_daily_tips')
          .select('slot')
          .eq('user_id', user.id);

        if (tipsError) {
          console.error(`Error checking tips for user ${user.id}:`, tipsError);
          continue;
        }

        const currentCount = currentTips?.length || 0;
        const neededTips = 6 - currentCount;

        if (neededTips <= 0) {
          console.log(`User ${user.id} already has ${currentCount} tips, skipping`);
          continue;
        }

        console.log(`Generating ${neededTips} tips for user ${user.id}`);

        // Get user profile and progression data
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user.id)
          .single();

        const { data: progressionData } = await supabase
          .rpc('analyze_user_progression', { p_user_id: user.id });

        const progression = progressionData?.[0] || {
          completed_tricks: [],
          current_tier: 'beginner',
          available_tricks: [],
          skill_level: 'beginner'
        };

        // Get recent attempts for context
        const { data: recentAttempts } = await supabase
          .from('trick_attempts')
          .select('trick_name, status, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(10);

        // Generate needed tips
        const usedSlots = currentTips?.map(t => t.slot) || [];
        const availableSlots = [1, 2, 3, 4, 5, 6].filter(slot => !usedSlots.includes(slot));
        
        const generatedTips = [];
        for (let i = 0; i < Math.min(neededTips, availableSlots.length); i++) {
          const slot = availableSlots[i];
          const tip = await generateSingleTip(user, profile, recentAttempts || [], progression, openaiKey, supabase, slot, generatedTips);
          generatedTips.push(tip);
          totalTipsGenerated++;
        }

        processedUsers++;
        
        // Add small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (userError) {
        console.error(`Error processing user ${user.id}:`, userError);
        continue;
      }
    }

    console.log(`Batch generation complete: ${processedUsers} users processed, ${totalTipsGenerated} tips generated`);

    return new Response(JSON.stringify({
      success: true,
      processedUsers,
      totalTipsGenerated
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Batch generation error:', error);
    return new Response(JSON.stringify({ error: 'Batch generation failed' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function generateSingleTip(user: any, profile: any, recentAttempts: any[], progression: any, openaiKey: string, supabase: any, slot: number, previousTips: any[] = []) {
  const age = profile?.birthday ? 
    new Date().getFullYear() - new Date(profile.birthday).getFullYear() : null;
  
  const experience = profile?.started_skating_year ? 
    new Date().getFullYear() - profile.started_skating_year : null;

  const skillLevel = progression.skill_level;

  // Get saved topics to avoid repetition
  const { data: savedTips } = await supabase
    .from('saved_trick_tips')
    .select('tip')
    .eq('user_id', user.id)
    .limit(10);

  const savedTopics = savedTips?.map((st: any) => st.tip?.headline || st.tip?.tip_text) || [];

  const formattedAttempts = recentAttempts.map(attempt => ({
    trick: attempt.trick_name,
    date: new Date(attempt.created_at).toLocaleDateString(),
    status: attempt.status || 'No status'
  }));

  // Determine tip focus based on slot and progression
  let tipFocus = '';
  let tipType = '';

  switch (slot) {
    case 1:
      // Technique refinement for current tricks
      if (progression.completed_tricks.length > 0) {
        tipFocus = `technique refinement for ${progression.completed_tricks.slice(-3).join(', ')}`;
        tipType = 'technique';
      } else {
        tipFocus = 'fundamental skateboarding basics like board setup and balance';
        tipType = 'fundamentals';
      }
      break;
    case 2:
      // Next trick suggestions based on progression
      if (progression.available_tricks.length > 0) {
        const nextTricks = progression.available_tricks.slice(0, 3).join(', ');
        tipFocus = `preparing for your next tricks: ${nextTricks}`;
        tipType = 'progression';
      } else {
        tipFocus = 'building consistency with tricks you\'re currently working on';
        tipType = 'consistency';
      }
      break;
    case 3:
      // Training/practice routine based on skill level
      tipFocus = `training routine for ${progression.skill_level} level skaters`;
      tipType = 'training';
      break;
    default:
      tipFocus = 'general skateboarding improvement';
      tipType = 'general';
  }

  const previousTipSummaries = previousTips.map(tip => ({
    headline: tip.headline,
    category: tip.badge_category,
    tags: tip.tags
  }));

  // Calculate user age for appropriate language
  const userAge = profile?.birthday 
    ? Math.floor((new Date().getTime() - new Date(profile.birthday).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    : 25;

  let readingLevel = 'adult';
  if (userAge < 13) readingLevel = 'elementary';
  else if (userAge < 16) readingLevel = 'middle-school';
  else if (userAge < 18) readingLevel = 'high-school';

  const systemPrompt = `You are a skateboarding coach creating personalized daily tips.

User Profile:
- Name: ${profile?.first_name || 'Skater'}
- Age: ${userAge} (use ${readingLevel} reading level)
- Stance: ${profile?.stance || 'unknown'}
- Skill Level: ${progression.skill_level}
- Current Tier: ${progression.current_tier}
- Learning Goals: ${profile?.learning_goals || 'general improvement'}

Progression Context:
- Completed Tricks: ${progression.completed_tricks.join(', ') || 'None yet'}
- Available Next Tricks: ${progression.available_tricks.slice(0, 5).join(', ') || 'None available'}
- Recent Attempts: ${recentAttempts?.slice(0, 3).map(a => `${a.trick_name} (${a.status})`).join(', ') || 'No recent attempts'}

Generate a tip focused on: ${tipFocus}

Requirements:
- Create a catchy, motivating headline (max 50 characters)
- Write engaging content (max 200 words) appropriate for ${readingLevel} level
- Include specific, actionable advice
- Reference their actual progression and skill level
- Use encouraging tone matching their preferences
- If suggesting new tricks, ensure prerequisites are met
- For switch/nollie tricks, focus on stance-specific progression

Format as JSON:
{
  "headline": "Catchy tip headline",
  "content": "Detailed tip content with specific advice",
  "type": "${tipType}",
  "difficulty": "${progression.skill_level}",
  "tags": ["relevant", "tags"]
}`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Generate a ${tipType} tip for slot ${slot}` }
        ],
        max_tokens: 800,
        temperature: 0.8
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    let tipData;
    try {
      tipData = JSON.parse(content);
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', content);
      tipData = createFallbackTip(progression.skill_level, tipType, slot);
    }

    // Store in database with expiration
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + 24) // Expire in 24 hours
    
    const { error: insertError } = await supabase
      .from('user_daily_tips')
      .insert({
        user_id: user.id,
        slot: slot,
        tip: tipData,
        expires_at: expiresAt.toISOString()
      });

    if (insertError) {
      console.error('Error inserting tip:', insertError);
    }

    return tipData;

  } catch (error) {
    console.error('Error generating tip:', error);
    const fallbackTip = createFallbackTip(progression?.skill_level || 'beginner', tipType, slot);
    
    // Store fallback tip with expiration
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + 24)
    
    await supabase
      .from('user_daily_tips')
      .insert({
        user_id: user.id,
        slot: slot,
        tip: fallbackTip,
        expires_at: expiresAt.toISOString()
      });

    return fallbackTip;
  }
}

function createFallbackTip(skillLevel: string, tipType: string, slot: number) {
  const fallbackTips = {
    beginner: [
      {
        headline: "Master Your Stance",
        content: "Spend 10 minutes today just standing on your board. Feel the balance, shift your weight, and get comfortable. This foundation will help with every trick you learn!",
        type: "fundamentals",
        difficulty: "beginner",
        tags: ["stance", "balance", "fundamentals"]
      },
      {
        headline: "Practice Pushing",
        content: "Work on smooth, controlled pushing today. Push with your back foot while keeping your front foot centered on the board. Aim for 3-4 strong pushes in a row.",
        type: "technique",
        difficulty: "beginner", 
        tags: ["pushing", "basics", "control"]
      },
      {
        headline: "Build Board Feel",
        content: "Try riding with your eyes closed for short distances (safely!). This helps develop the board feel that's essential for all skateboarding progression.",
        type: "training",
        difficulty: "beginner",
        tags: ["board-feel", "balance", "progression"]
      }
    ],
    intermediate: [
      {
        headline: "Consistency Challenge",
        content: "Pick one trick you can land sometimes and try to hit it 5 times in a row. Consistency is key to moving to the next level!",
        type: "consistency",
        difficulty: "intermediate",
        tags: ["consistency", "progression", "practice"]
      },
      {
        headline: "Analyze Your Pop",
        content: "Focus on your pop timing today. The sharper and quicker your back foot snap, the higher and more controlled your tricks will be.",
        type: "technique", 
        difficulty: "intermediate",
        tags: ["pop", "technique", "improvement"]
      },
      {
        headline: "Commit Fully",
        content: "Choose one trick you're scared of and commit 100% for 10 attempts. Often the mental game is what's holding you back!",
        type: "training",
        difficulty: "intermediate", 
        tags: ["commitment", "mental", "breakthrough"]
      }
    ],
    advanced: [
      {
        headline: "Perfect Your Catch",
        content: "Work on catching your tricks higher and with more control. The catch timing separates good tricks from perfect ones.",
        type: "technique",
        difficulty: "advanced",
        tags: ["catch", "control", "precision"]
      },
      {
        headline: "Combo Flow",
        content: "Try linking two tricks together today. Focus on the transition between tricks and maintaining speed through both.",
        type: "progression", 
        difficulty: "advanced",
        tags: ["combos", "flow", "progression"]
      },
      {
        headline: "Spot Challenges",
        content: "Find a new spot or obstacle to skate today. Adapting your tricks to different terrain builds real skill.",
        type: "training",
        difficulty: "advanced",
        tags: ["spots", "adaptation", "challenge"]
      }
    ]
  };

  const tips = fallbackTips[skillLevel as keyof typeof fallbackTips] || fallbackTips.beginner;
  return tips[(slot - 1) % tips.length];
}

function determineSkillLevel(experience: number | null, recentAttempts: any[]): string {
  if (!experience || experience < 1) return 'beginner';
  if (experience < 3) return 'intermediate';
  return 'advanced';
}