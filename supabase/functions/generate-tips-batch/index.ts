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

    // Get all pro users
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

    console.log(`Found ${proUsers?.length || 0} pro users`);
    let processedUsers = 0;
    let totalTipsGenerated = 0;

    // Process each pro user
    for (const user of proUsers || []) {
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

        // Get user profile and recent attempts
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user.id)
          .single();

        const { data: recentAttempts } = await supabase
          .from('trick_attempts')
          .select('trick_name, created_at, feedback')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(5);

        // Generate needed tips
        const usedSlots = currentTips?.map(t => t.slot) || [];
        const availableSlots = [1, 2, 3, 4, 5, 6].filter(slot => !usedSlots.includes(slot));
        
        const generatedTips = [];
        for (let i = 0; i < Math.min(neededTips, availableSlots.length); i++) {
          const slot = availableSlots[i];
          const tip = await generateSingleTip(user, profile, recentAttempts || [], openaiKey, supabase, slot, generatedTips);
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

async function generateSingleTip(user: any, profile: any, recentAttempts: any[], openaiKey: string, supabase: any, slot: number, previousTips: any[] = []) {
  const age = profile?.birthday ? 
    new Date().getFullYear() - new Date(profile.birthday).getFullYear() : null;
  
  const experience = profile?.started_skating_year ? 
    new Date().getFullYear() - profile.started_skating_year : null;

  const skillLevel = determineSkillLevel(experience, recentAttempts);

  // Get saved topics to avoid repetition
  const { data: savedTips } = await supabase
    .from('saved_trick_tips')
    .select('tip')
    .eq('user_id', user.id)
    .limit(10);

  const savedTopics = savedTips?.map(st => st.tip?.headline || st.tip?.tip_text) || [];

  const formattedAttempts = recentAttempts.map(attempt => ({
    trick: attempt.trick_name,
    date: new Date(attempt.created_at).toLocaleDateString(),
    feedback: attempt.feedback || 'No feedback yet'
  }));

  // Create variation based on slot number
  const focusAreas = [
    "fundamentals and balance",
    "trick progression and technique", 
    "mindset and practice methods",
    "safety and injury prevention",
    "style and flow development",
    "advanced skills and creativity"
  ];
  const currentFocus = focusAreas[slot - 1] || "general improvement";

  const previousTipSummaries = previousTips.map(tip => ({
    headline: tip.headline,
    category: tip.badge_category,
    tags: tip.tags
  }));

  const systemPrompt = `You are Lovable, a skateboarding coach that generates personalized Daily Trick Tips. Follow the 5-step generation protocol EXACTLY.

USER PROFILE:
- Skill Level: ${skillLevel}
- Age: ${age || 'Not specified'}
- Experience: ${experience ? `${experience} years` : 'Not specified'}
- Stance: ${profile?.stance || 'Not specified'}
- Focus: ${profile?.focus || 'general improvement'}
- Goals: ${profile?.learning_goals || 'general improvement'}
- Recent Tricks: ${JSON.stringify(formattedAttempts)}
- Previously Saved Topics: ${JSON.stringify(savedTopics)}

TIP SLOT ${slot} REQUIREMENTS:
- Focus Area: ${currentFocus}
- Must be DIFFERENT from these already generated tips: ${JSON.stringify(previousTipSummaries)}
- Avoid duplicate categories, headlines, or similar content

GENERATION PROTOCOL (Follow these 5 steps):
1. Generate an idea that benefits user's skateboarding progression (subtle personalization, don't be blatant about data usage)
2. Create actionable steps (be specific, not generic)
3. Add safety considerations appropriate to their level
4. Estimate realistic time commitment
5. Format as JSON with exact structure below

Return ONLY valid JSON with this exact structure:
{
  "headline": "Clear, specific headline (max 60 chars)",
  "teaser_text": "Brief engaging summary (max 100 chars)",
  "detailed_content": "Full tip explanation with specific steps",
  "badge_category": "Category name (Fundamentals|Technique|Safety|Mindset|Style|Advanced)",
  "greeting": "Personal greeting mentioning their progress or goals",
  "tip_text": "Main actionable advice",
  "actionable_step": "Specific step they can take today",
  "safety_note": "Relevant safety consideration",
  "difficulty": "beginner|intermediate|advanced",
  "tags": ["tag1", "tag2", "tag3"],
  "estimated_time_min": 15
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
          { role: 'user', content: `Generate a ${currentFocus} focused tip for slot ${slot}` }
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
      tipData = createFallbackTip(slot, currentFocus);
    }

    // Store in database
    const { error: insertError } = await supabase
      .from('user_daily_tips')
      .insert({
        user_id: user.id,
        slot: slot,
        tip: tipData
      });

    if (insertError) {
      console.error('Error inserting tip:', insertError);
    }

    return tipData;

  } catch (error) {
    console.error('Error generating tip:', error);
    const fallbackTip = createFallbackTip(slot, currentFocus);
    
    // Store fallback tip
    await supabase
      .from('user_daily_tips')
      .insert({
        user_id: user.id,
        slot: slot,
        tip: fallbackTip
      });

    return fallbackTip;
  }
}

function createFallbackTip(slot: number, focus: string) {
  const fallbackTips = [
    {
      headline: "Practice Balance Today",
      teaser_text: "Improve your board control with simple balance exercises",
      detailed_content: "Spend 10 minutes practicing stationary balance on your board. Stand on your board on carpet or grass, focusing on keeping your weight centered. This builds the foundation for all skateboarding skills.",
      badge_category: "Fundamentals",
      greeting: "Let's work on your foundation today!",
      tip_text: "Balance is the cornerstone of skateboarding - practice it daily",
      actionable_step: "Stand on your board for 30 seconds without moving",
      safety_note: "Practice on a soft surface first",
      difficulty: "beginner",
      tags: ["balance", "fundamentals", "practice"],
      estimated_time_min: 10
    },
    {
      headline: "Focus on Your Stance",
      teaser_text: "Perfect your riding position for better control",
      detailed_content: "Check your foot positioning while riding. Your front foot should be positioned comfortably over the front bolts, and your back foot should be perpendicular to the board on the tail.",
      badge_category: "Technique",
      greeting: "Time to refine your technique!",
      tip_text: "Proper foot positioning unlocks better board control",
      actionable_step: "Practice adjusting your foot position while stationary",
      safety_note: "Make sure you're comfortable before trying while moving",
      difficulty: "beginner",
      tags: ["stance", "positioning", "control"],
      estimated_time_min: 15
    }
  ];
  
  return fallbackTips[slot % 2];
}

function determineSkillLevel(experience: number | null, recentAttempts: any[]): string {
  if (!experience || experience < 1) return 'beginner';
  if (experience < 3) return 'intermediate';
  return 'advanced';
}