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
      throw new Error('No authorization header');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const openaiKey = Deno.env.get('OPENAI_API_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    
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
      // Fallback: generate fresh tips if rotation fails
      return await generateFreshTips(user, profile, recentAttempts, openaiKey, supabase);
    }

    // If we have existing tips, return them
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

    // Generate new tips if none exist
    return await generateFreshTips(user, profile, recentAttempts, openaiKey, supabase);

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

async function generateFreshTips(user: any, profile: any, recentAttempts: any[], openaiKey: string, supabase: any) {
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

  // Create prompt for OpenAI based on the specification
  const systemPrompt = `You are Lovable, a helpful product coach that generates a single Daily Trick Tip tailored to a specific user and context. Produce a single tip card and the metadata required by our app in strict JSON (no explanatory text).

User Context:
- user_id: ${user.id}
- display_name: ${profile?.first_name || null}
- age: ${age}
- experience_years: ${experienceYears}
- skill_level: ${determineSkillLevel(experienceYears, formattedAttempts)}
- recent_attempts: ${JSON.stringify(formattedAttempts)}
- preferences: {
    tone_pref: ${profile?.tone_pref || 'encouraging'},
    focus: ${profile?.focus || 'consistency'}
  }
- stance: ${profile?.stance || 'regular'}
- learning_goals: ${profile?.learning_goals || 'general improvement'}

Generate ONE tip following the exact JSON schema:
{
  "result": "ok",
  "user_id": "${user.id}",
  "tip": {
    "id": "tt-${new Date().toISOString().split('T')[0]}-01",
    "greeting": string | null,
    "tip_text": string (max 2 sentences),
    "actionable_step": string (single imperative sentence),
    "safety_note": string | null,
    "difficulty": "${determineSkillLevel(experienceYears, formattedAttempts)}",
    "tags": array of 2-4 short strings,
    "estimated_time_min": integer,
    "saved_from": null,
    "generated_at": "${new Date().toISOString()}"
  },
  "metadata": {
    "source_model": "lovable-v1",
    "confidence": number between 0.5-1.0,
    "reason": "one sentence explaining why this tip fits"
  },
  "debug": null
}

Make the tip specific, actionable, and appropriate for their skill level. Reference recent attempts if relevant.`;

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
          { role: 'user', content: 'Generate a personalized daily trick tip for this user.' }
        ],
        max_tokens: 500,
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
          id: `tt-${new Date().toISOString().split('T')[0]}-01`,
          greeting: profile?.first_name ? `Hey ${profile.first_name}!` : null,
          tip_text: "Focus on your stance and balance today. Keep your knees slightly bent and your weight centered over the board.",
          actionable_step: "Practice riding for 10 minutes, focusing on maintaining a stable stance.",
          safety_note: "Always wear protective gear and practice in a safe area.",
          difficulty: determineSkillLevel(experienceYears, formattedAttempts),
          tags: ["balance", "basics", "stance"],
          estimated_time_min: 10,
          saved_from: null,
          generated_at: new Date().toISOString()
        },
        metadata: {
          source_model: "lovable-v1-fallback",
          confidence: 0.7,
          reason: "Generated fallback tip due to AI parsing error"
        }
      };
    }
    
    // Store the generated tip in user_daily_tips
    const { error: insertError } = await supabase
      .from('user_daily_tips')
      .insert({
        user_id: user.id,
        slot: 1,
        tip: tipResponse.tip
      });

    if (insertError) {
      console.error('Error storing tip:', insertError);
    }

    return new Response(JSON.stringify({
      success: true,
      tips: [{
        slot: 1,
        tip: tipResponse.tip
      }]
    }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });

  } catch (error) {
    console.error('Error generating tip with AI:', error);
    throw error;
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