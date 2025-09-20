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
    console.log('Personalized coach request:', { message, context });
    
    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('No authorization header found');
      throw new Error('No authorization header');
    }
    console.log('Auth header found:', authHeader.substring(0, 20) + '...');

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error('User authentication failed:', userError);
      throw new Error('Unauthorized');
    }
    console.log('Authenticated user:', user.id);

    // Get user profile for personalization
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (profileError) {
      console.error('Error fetching profile:', profileError);
      // Create a default profile if none exists
      const defaultProfile = {
        user_id: user.id,
        first_name: 'there',
        stance: null,
        birthday: null,
        started_skating_year: null,
        learning_goals: null,
        gender: null
      };
      console.log('Using default profile for user:', user.id);
      // Continue with default profile instead of throwing error
    }

    const userProfile = profile || {
      first_name: 'there',
      stance: null,
      birthday: null,
      started_skating_year: null,
      learning_goals: null,
      gender: null
    };

    // Calculate age and reading level
    let age = 16; // Default age
    let readingLevel = '10th grade';
    
    if (userProfile.birthday) {
      const birthDate = new Date(userProfile.birthday);
      const today = new Date();
      age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      
      // Determine reading level based on age - scales with age up to 10th grade at 16
      if (age <= 6) {
        readingLevel = '2nd grade';
      } else if (age === 7) {
        readingLevel = '3rd grade';
      } else if (age === 8 || age === 9) {
        readingLevel = '4th grade';  
      } else if (age === 10 || age === 11) {
        readingLevel = '5th grade';
      } else if (age === 12 || age === 13) {
        readingLevel = '6th grade';
      } else if (age === 14 || age === 15) {
        readingLevel = '8th grade';
      } else {
        readingLevel = '10th grade'; // 16+ stays at 10th grade
      }
    }


    // Build personalized context
    const personalContext = [];
    
    // Age and reading level
    personalContext.push(`The user is ${age} years old. Please use ${readingLevel} level language and concepts.`);
    
    // Gender consideration
    if (userProfile.gender) {
      personalContext.push(`The user identifies as ${userProfile.gender}.`);
    }
    
    // Skating experience
    if (userProfile.started_skating_year) {
      const currentYear = new Date().getFullYear();
      const yearsSkating = currentYear - userProfile.started_skating_year;
      personalContext.push(`They started skating in ${userProfile.started_skating_year} (${yearsSkating} years of experience).`);
    }
    
    // Stance
    if (userProfile.stance) {
      personalContext.push(`Their skating stance is ${userProfile.stance}.`);
    }
    
    // Learning goals
    if (userProfile.learning_goals) {
      personalContext.push(`Their learning goals are: ${userProfile.learning_goals}`);
    }
    
    // Name for personalization
    const name = userProfile.first_name ? userProfile.first_name : 'there';

    // Create system prompt based on context
    let systemPrompt = `You are an expert skateboarding coach providing personalized advice. 

User Profile:
${personalContext.join(' ')}

Guidelines:
- Always address the user by their first name (${name}) when appropriate
- Tailor your language complexity to their age and reading level
- Consider their skating experience level when giving advice
- Reference their stance (${userProfile.stance || 'unknown'}) when relevant to tricks or techniques
- Keep their learning goals in mind: ${userProfile.learning_goals || 'general improvement'}
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
        name: userProfile.first_name,
        stance: userProfile.stance,
        experience: userProfile.started_skating_year ? new Date().getFullYear() - userProfile.started_skating_year : null
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