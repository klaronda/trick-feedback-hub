import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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

    // Create context based on selected improvement areas
    const improvementContext = selectedTags.length > 0 
      ? `The user wants to improve on: ${selectedTags.join(', ')}. `
      : '';

    const feedbackContext = feedback 
      ? `Here's the AI feedback they received: "${feedback}". `
      : '';

    const systemPrompt = `You are an expert skateboarding coach with years of experience helping skaters improve their tricks. 

${improvementContext}${feedbackContext}

Be encouraging, specific, and practical in your advice. Focus on actionable tips that can help them improve their ${trickName || 'trick'}. Keep responses concise but helpful, around 2-3 sentences.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: question }
        ],
        max_tokens: 200,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('OpenAI API error:', response.status, errorData);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const coachResponse = data.choices[0].message.content;

    console.log('Coach response generated successfully');

    return new Response(JSON.stringify({ 
      response: coachResponse 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in coach-chat function:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Failed to get coach response' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});