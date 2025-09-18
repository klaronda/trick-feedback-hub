import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('No authorization header provided');
      throw new Error('No authorization header');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY');
    const openaiKey = Deno.env.get('OPENAI_API_KEY');

    if (!supabaseUrl || !supabaseKey || !openaiKey) {
      console.error('Missing environment variables:', { 
        hasSupabaseUrl: !!supabaseUrl, 
        hasSupabaseKey: !!supabaseKey, 
        hasOpenaiKey: !!openaiKey 
      });
      throw new Error('Missing required environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error('Authentication error:', userError);
      throw new Error('Unauthorized');
    }

    console.log('Authenticated user:', user.id);

    
    let seenSlots = [];
    
    // Only parse body if it exists
    if (req.headers.get('content-type')?.includes('application/json')) {
      try {
        const body = await req.json();
        seenSlots = body.seenSlots || [];
      } catch (e) {
        // Ignore JSON parsing errors for empty bodies
        console.log('No valid JSON body provided, using default empty seenSlots');
      }
    }

    // Get user profile data
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (profileError) {
      console.log('Profile error:', profileError);
    }

    // Get last 5 trick attempts for recent activity analysis
    const { data: recentAttempts, error: attemptsError } = await supabase
      .from('trick_attempts')
      .select('trick_name, feedback, analysis_data, created_at, status')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5);

    if (attemptsError) {
      console.log('Attempts error:', attemptsError);
    }

    // Use existing rotate_and_refill_daily_tips function for tip management
    const { data: tipsData, error: tipsError } = await supabase
      .rpc('rotate_and_refill_daily_tips', {
        p_user_id: user.id,
        p_seen_slots: seenSlots || []
      });

    if (tipsError) {
      console.log('Tips rotation error:', tipsError);
    }

    // If we have existing tips from the function, return them
    if (tipsData && tipsData.length > 0) {
      const formattedTips = tipsData.map((tipData: any) => ({
        slot: tipData.slot,
        tip: tipData.tip
      }));

      return new Response(JSON.stringify({
        success: true,
        tips: formattedTips
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Generate 3 new tips if none exist or when rotation function returns empty
    console.log('Generating fresh tips for user:', user.id);
    
    // Generate tips sequentially to ensure variety by passing previous tips
    const tip1 = await generateSingleTip(user, profile, recentAttempts, openaiKey, supabase, 1, []);
    const tip2 = await generateSingleTip(user, profile, recentAttempts, openaiKey, supabase, 2, [tip1.tip]);
    const tip3 = await generateSingleTip(user, profile, recentAttempts, openaiKey, supabase, 3, [tip1.tip, tip2.tip]);
    
    return new Response(JSON.stringify({
      success: true,
      tips: [tip1, tip2, tip3]
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-daily-tips function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function generateSingleTip(user: any, profile: any, recentAttempts: any[], openaiKey: string, supabase: any, slot: number, previousTips: any[] = []) {
  // Calculate user age and experience
  const age = profile?.birthday ? 
    new Date().getFullYear() - new Date(profile.birthday).getFullYear() : null;
  
  const experienceYears = profile?.started_skating_year ? 
    new Date().getFullYear() - profile.started_skating_year : 0;

  // Prepare recent attempts data for AI
  const formattedAttempts = (recentAttempts || []).map(attempt => ({
    trick_name: attempt.trick_name || 'Unknown',
    result: attempt.status === 'Completed' ? 'success' : 
           attempt.status === 'Pending' ? 'partial' : 'fail',
    notes: attempt.feedback || null
  }));

  // Get saved tips for user context and to avoid repetition
  const { data: savedTips, error: savedTipsError } = await supabase
    .from('saved_trick_tips')
    .select('tip')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(10);

  if (savedTipsError) {
    console.log('Error fetching saved tips:', savedTipsError);
  }

  // Extract topics from saved tips to understand user preferences
  const savedTopics = (savedTips || []).map(saved => {
    const tip = saved.tip;
    return {
      tags: tip.tags || [],
      difficulty: tip.difficulty,
      topic: tip.headline || tip.tip_text?.substring(0, 30)
    };
  });

  // Create variation based on slot number and previous tips
  const focusAreas = [
    "fundamentals and balance", 
    "trick progression and technique", 
    "mindset and practice methods"
  ];
  const currentFocus = focusAreas[slot - 1] || "general improvement";
  
  // Format previous tips to avoid duplication
  const previousTipSummaries = previousTips.map(tip => ({
    headline: tip.headline,
    category: tip.badge_category,
    tags: tip.tags
  }));

  // Create enhanced prompt for OpenAI following the 5-step protocol
  const systemPrompt = `You are Lovable, a skateboarding coach that generates personalized Daily Trick Tips. Follow the 5-step generation protocol EXACTLY.

USER PROFILE:
- Name: ${profile?.first_name || 'Skater'}
- Age: ${age || 'unknown'}
- Experience: ${experienceYears} years
- Skill Level: ${determineSkillLevel(experienceYears, formattedAttempts)}
- Stance: ${profile?.stance || 'regular'}
- Goals: ${profile?.learning_goals || 'general improvement'}
- Recent Tricks: ${JSON.stringify(formattedAttempts)}
- Previously Saved Topics: ${JSON.stringify(savedTopics)}

TIP SLOT ${slot} REQUIREMENTS:
- Focus Area: ${currentFocus}
- Must be DIFFERENT from these already generated tips: ${JSON.stringify(previousTipSummaries)}
- Avoid duplicate categories, headlines, or similar content

GENERATION PROTOCOL (Follow these 5 steps):
1. Generate an idea that benefits user's skateboarding progression (subtle personalization, don't be blatant about data usage)
2. Create Tip Body: 1-3 short paragraphs with actionable content (can use bullets/numbers)
3. Generate Teaser: ONE sentence, max 20 words, summarizes the tip body
4. Generate Title: Max 4 words, encapsulates the tip specifically
5. Generate Category: Max 2 words for badge (Basics, Flip Tricks, Mindset, etc.)

WRITING STYLE:
- Keep sentences short and readable
- NO semicolons, max 1 exclamation point or none
- Vary opening words - don't always start with "Place" or "Position"
- Use action words: Master, Improve, Focus, Practice, Build, etc.
- Be subtle about personalization - don't say "because you uploaded X"
- Make it feel natural and progressive

CONTENT REQUIREMENTS:
- Title: 4 words max, specific (NOT "Practice Tip")
- Teaser: 20 words max, one sentence
- Body: 1-3 short paragraphs, actionable
- Category: 2 words max for badge
- Consistent data across card and modal

Generate EXACTLY this JSON structure:
{
  "result": "ok",
  "user_id": "${user.id}",
  "tip": {
    "id": "tt-${new Date().toISOString().split('T')[0]}-${Math.floor(Math.random() * 1000)}",
    "headline": "Specific 4 Word Title",
    "teaser_text": "One engaging sentence under 20 words that summarizes the tip body.",
    "detailed_content": "Short paragraph 1 with actionable content.\n\nOptional paragraph 2 with additional context.\n\nOptional paragraph 3 if needed for completeness.",
    "badge_category": "Two Words",
    "actionable_step": "Single clear imperative sentence for immediate action",
    "safety_note": "Safety reminder if applicable" or null,
    "difficulty": "${determineSkillLevel(experienceYears, formattedAttempts)}",
    "tags": ["tag1", "tag2", "tag3"],
    "estimated_time_min": 5,
    "generated_at": "${new Date().toISOString()}"
  }
}

Focus on natural progression. Be subtle with personalization.`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5-mini-2025-08-07',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: 'Generate a personalized daily trick tip following the 5-step protocol. Be subtle with personalization.' }
        ],
        max_completion_tokens: 600,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('OpenAI response:', JSON.stringify(data, null, 2));
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message || !data.choices[0].message.content) {
      console.error('Invalid OpenAI response structure:', data);
      throw new Error('Invalid response from OpenAI API');
    }

    const aiResponseContent = data.choices[0].message.content.trim();
    console.log('AI response content:', aiResponseContent);

    if (!aiResponseContent) {
      throw new Error('Empty response from OpenAI API');
    }

    let tipResponse;
    try {
      tipResponse = JSON.parse(aiResponseContent);
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', aiResponseContent);
      // Generate a fallback tip if AI response isn't valid JSON
      tipResponse = {
        result: "ok",
        user_id: user.id,
        tip: {
          id: `tt-${new Date().toISOString().split('T')[0]}-fallback`,
          headline: "Master Balance Fundamentals",
          teaser_text: "Build core stability for all tricks. Perfect your stance with focused practice sessions.",
          detailed_content: "1. Position feet shoulder-width apart on the board\n2. Keep knees slightly bent and relaxed\n3. Focus your weight over the center of the board\n4. Practice rolling slowly while maintaining posture\n5. Gradually increase speed as comfort improves\n\nConsistent balance is the foundation for every skateboarding trick.",
          badge_category: "Basics",
          actionable_step: "Practice riding for 10 minutes, focusing on maintaining a stable stance.",
          safety_note: "Always wear protective gear and practice in a safe area.",
          difficulty: determineSkillLevel(experienceYears, formattedAttempts),
          tags: ["balance", "basics", "stance"],
          estimated_time_min: 10,
          generated_at: new Date().toISOString()
        }
      };
    }
    
    // Store the generated tip in user_daily_tips
    const { error: insertError } = await supabase
      .from('user_daily_tips')
      .insert({
        user_id: user.id,
        slot: slot,
        tip: tipResponse.tip
      });

    if (insertError) {
      console.error('Error storing tip:', insertError);
    }

    return {
      slot: slot,
      tip: tipResponse.tip
    };

  } catch (error) {
    console.error('Error generating tip with AI:', error);
    
    // Return a fallback tip instead of throwing
    const fallbackTip = {
      id: `tt-${new Date().toISOString().split('T')[0]}-fallback-${slot}`,
      headline: "Build Your Foundation",
      teaser_text: "Master the basics with consistent practice and proper technique.",
      detailed_content: "Focus on fundamental skateboarding skills:\n\n1. Perfect your stance and balance\n2. Practice pushing and riding smoothly\n3. Work on stopping safely\n4. Build confidence through repetition\n\nConsistent practice of basics creates a strong foundation for all tricks.",
      badge_category: "Basics",
      actionable_step: "Practice riding for 15 minutes focusing on balance and control.",
      safety_note: "Always wear protective gear and practice in a safe area.",
      difficulty: determineSkillLevel(experienceYears, formattedAttempts),
      tags: ["basics", "foundation", "practice"],
      estimated_time_min: 15,
      generated_at: new Date().toISOString()
    };

    // Store the fallback tip
    try {
      await supabase
        .from('user_daily_tips')
        .insert({
          user_id: user.id,
          slot: slot,
          tip: fallbackTip
        });
    } catch (insertError) {
      console.error('Error storing fallback tip:', insertError);
    }

    return {
      slot: slot,
      tip: fallbackTip
    };
  }
}

function determineSkillLevel(experienceYears: number, recentAttempts: any[]): string {
  // Basic skill level determination
  if (experienceYears < 1) return 'beginner';
  if (experienceYears < 3) return 'intermediate';
  
  // Check complexity of recent tricks
  const advancedTricks = ['kickflip', 'heelflip', 'tre flip', 'hardflip', 'switch', 'nollie'];
  const hasAdvancedTricks = recentAttempts.some(attempt => 
    advancedTricks.some(trick => 
      attempt.trick_name?.toLowerCase().includes(trick)
    )
  );
  
  if (experienceYears >= 3 && hasAdvancedTricks) return 'advanced';
  if (experienceYears >= 2) return 'intermediate';
  
  return 'beginner';
}