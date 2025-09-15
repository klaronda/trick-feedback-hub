import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, context = 'general' } = await req.json();
    
    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Get user profile for personalization
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (profileError) {
      console.error('Error fetching profile:', profileError);
      throw new Error('Failed to fetch user profile');
    }

    // Calculate age and reading level
    let age = 16; // Default age
    let readingLevel = '10th grade';
    
    if (profile.birthday) {
      const birthDate = new Date(profile.birthday);
      const today = new Date();
      age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      
      // Determine reading level based on age (cap at 10th grade for under 16)
      if (age < 16) {
        readingLevel = '10th grade';
      } else if (age >= 16 && age <= 18) {
        readingLevel = 'high school';
      } else {
        readingLevel = 'adult';
      }
    }

    // Build personalized context
    const personalContext = [];
    
    // Age and reading level
    personalContext.push(`The user is ${age} years old. Please use ${readingLevel} level language and concepts.`);
    
    // Gender consideration
    if (profile.gender) {
      personalContext.push(`The user identifies as ${profile.gender}.`);
    }
    
    // Skating experience
    if (profile.started_skating_year) {
      const currentYear = new Date().getFullYear();
      const yearsSkating = currentYear - profile.started_skating_year;
      personalContext.push(`They started skating in ${profile.started_skating_year} (${yearsSkating} years of experience).`);
    }
    
    // Stance
    if (profile.stance) {
      personalContext.push(`Their skating stance is ${profile.stance}.`);
    }
    
    // Learning goals
    if (profile.learning_goals) {
      personalContext.push(`Their learning goals are: ${profile.learning_goals}`);
    }
    
    // Name for personalization
    const name = profile.first_name ? profile.first_name : 'there';

    // Create system prompt based on context
    let systemPrompt = `You are an expert skateboarding coach providing personalized advice. 

User Profile:
${personalContext.join(' ')}

Guidelines:
- Always address the user by their first name (${name}) when appropriate
- Tailor your language complexity to their age and reading level
- Consider their skating experience level when giving advice
- Reference their stance (${profile.stance || 'unknown'}) when relevant to tricks or techniques
- Keep their learning goals in mind: ${profile.learning_goals || 'general improvement'}
- Be encouraging and supportive
- If they're under 18, emphasize safety and proper protective equipment
- Use skateboarding terminology they would understand based on their experience level`;

    // Adjust system prompt based on context
    if (context === 'trick_analysis') {
      systemPrompt += `

You are specifically analyzing a skateboarding trick attempt. Provide:
- Technical feedback on form and execution
- Specific tips for improvement
- Safety considerations
- Next steps for progression
- Encouragement and positive reinforcement`;
    } else if (context === 'general_coaching') {
      systemPrompt += `

You are providing general skateboarding coaching advice. Focus on:
- Skill development appropriate for their level
- Practice routines and exercises
- Motivation and goal setting
- General skateboarding tips and techniques`;
    }

    // Call OpenAI
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5-2025-08-07',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ],
        max_completion_tokens: 500,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('OpenAI API error:', error);
      throw new Error('Failed to get AI response');
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

    // Log the interaction for analytics
    console.log(`Personalized coaching response generated for user ${user.id}, age ${age}, reading level: ${readingLevel}`);

    return new Response(JSON.stringify({ 
      response: aiResponse,
      userContext: {
        age,
        readingLevel,
        name: profile.first_name,
        stance: profile.stance,
        experience: profile.started_skating_year ? new Date().getFullYear() - profile.started_skating_year : null
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in personalized-coach function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      details: 'Failed to generate personalized coaching response'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});