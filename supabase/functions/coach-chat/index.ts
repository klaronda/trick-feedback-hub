import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const { question, selectedTags, trickName, feedback } = await req.json();

    console.log('Coach chat request:', { question, selectedTags, trickName });

    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    let userProfile = null;
    let personalizationContext = '';

    // Try to get user profile for personalization
    if (authHeader) {
      try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseKey, {
          global: { headers: { Authorization: authHeader } },
        });

        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('user_id', user.id)
            .single();

          if (profile) {
            userProfile = profile;
            
            // Calculate age and reading level
            let age = 16;
            let readingLevel = '10th grade';
            
            if (profile.birthday) {
              const birthDate = new Date(profile.birthday);
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

            // Build personalization context
            const name = profile.first_name || 'there';
            personalizationContext = `The user ${name} is ${age} years old. Use ${readingLevel} level language. `;
            
            if (profile.stance) {
              personalizationContext += `Their stance is ${profile.stance}. `;
            }
            
            if (profile.started_skating_year) {
              const yearsSkating = new Date().getFullYear() - profile.started_skating_year;
              personalizationContext += `They have ${yearsSkating} years of skating experience. `;
            }
          }
        }
      } catch (error) {
        console.log('Could not fetch user profile for personalization:', error instanceof Error ? error.message : 'Unknown error');
      }
    }

    // Create context based on selected improvement areas
    const improvementContext = selectedTags.length > 0 
      ? `The user wants to improve on: ${selectedTags.join(', ')}. `
      : '';

    const feedbackContext = feedback 
      ? `Here's the AI feedback they received: "${feedback}". `
      : '';

    const systemPrompt = `You are a friendly skateboarding coach helping skaters get better. 

${personalizationContext}${improvementContext}${feedbackContext}

Give short, simple advice that's easy to follow. Use everyday words and keep it to 1-2 sentences. Focus on one clear tip they can try right away for their ${trickName || 'trick'}. ${userProfile?.first_name ? `Address them by their first name (${userProfile.first_name})` : ''}.`;

    // Use appropriate model and parameters
    const modelConfig = {
      model: 'gpt-5-mini-2025-08-07',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: question }
      ],
      max_completion_tokens: 120,
    };

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(modelConfig),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('OpenAI API error:', response.status, errorData);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const coachResponse = data.choices[0].message.content;

    console.log('Personalized coach response generated successfully');

    return new Response(JSON.stringify({ 
      response: coachResponse 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in coach-chat function:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Failed to get coach response' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});