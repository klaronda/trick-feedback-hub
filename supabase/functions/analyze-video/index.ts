import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2';

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
    const { attempt_id, video_path, user_id } = await req.json();
    
    if (!attempt_id || !video_path) {
      return new Response(
        JSON.stringify({ error: 'Missing attempt_id or video_path' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // user_id can be optional for now
    if (!user_id) {
      console.warn("⚠️ No user_id provided in payload");
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Analyzing video for attempt:', attempt_id);

    // Get the attempt details
    const { data: attempt, error: fetchError } = await supabase
      .from('trick_attempts')
      .select('*')
      .eq('id', attempt_id)
      .single();

    if (fetchError || !attempt) {
      console.error('Error fetching attempt:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Attempt not found' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Simulate AI analysis (replace with actual video analysis)
    console.log('Analyzing trick:', attempt.trick_name);
    
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    let feedback = "Great attempt! Keep practicing your form and timing.";

    if (openAIApiKey) {
      try {
        const prompt = `Analyze a skateboard trick attempt called "${attempt.trick_name}". Provide constructive coaching feedback in 2-3 sentences focusing on technique, form, and improvement suggestions. Be encouraging but specific.`;

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openAIApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              { 
                role: 'system', 
                content: 'You are an expert skateboard coach providing constructive feedback on trick attempts. Be encouraging, specific, and helpful.' 
              },
              { role: 'user', content: prompt }
            ],
            max_tokens: 150,
            temperature: 0.7,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          feedback = data.choices[0].message.content.trim();
          console.log('Generated AI feedback:', feedback);
        } else {
          console.error('OpenAI API error:', response.status);
        }
      } catch (error) {
        console.error('Error calling OpenAI:', error);
      }
    }

    // Update the attempt with feedback and status
    const { error: updateError } = await supabase
      .from('trick_attempts')
      .update({
        status: 'Reviewed',
        feedback: feedback
      })
      .eq('id', attempt_id);

    if (updateError) {
      console.error('Error updating attempt:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update attempt' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Successfully analyzed and updated attempt:', attempt_id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        feedback: feedback,
        status: 'Reviewed'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in analyze-video function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});