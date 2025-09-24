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

    // Extract token and create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const token = authHeader.replace(/^Bearer\s+/i, '');
    if (!token) {
      console.error('Authorization token missing in header');
      throw new Error('Unauthorized');
    }

    // Get current user using the provided JWT (avoid session-based auth in edge runtime)
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
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
      .maybeSingle();

    // Get user progression data
    const { data: progressionData } = await supabase
      .rpc('analyze_user_progression', { p_user_id: user.id });

    const progression = progressionData?.[0] || {
      completed_tricks: [],
      current_tier: 'beginner',
      available_tricks: [],
      skill_level: 'beginner'
    };

    // Get recent trick attempts
    const { data: recentAttempts } = await supabase
      .from('trick_attempts')
      .select('trick_name, status, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10);

    // Get trick progression data for context
    const { data: trickProgressions } = await supabase
      .from('trick_progressions')
      .select('*');

    if (profileError) {
      console.error('Error fetching profile:', profileError);
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


    // Helper function to safely parse JSON with fallback
    const safeJsonParse = (jsonString: any, fallback = []) => {
      if (!jsonString || typeof jsonString !== 'string') {
        return fallback;
      }
      try {
        const parsed = JSON.parse(jsonString);
        return Array.isArray(parsed) ? parsed : fallback;
      } catch (error) {
        console.warn('Failed to parse JSON:', jsonString, error);
        return fallback;
      }
    };

    // Build progression context for AI
    const progressionContext = `
User Progression Analysis:
- Skill Level: ${progression.skill_level}
- Current Tier: ${progression.current_tier}
- Completed Tricks: ${progression.completed_tricks?.join(', ') || 'None yet'}
- Available Next Tricks: ${progression.available_tricks?.slice(0, 5).join(', ') || 'None available'}
- Recent Attempts: ${recentAttempts?.slice(0, 3).map(a => `${a.trick_name} (${a.status})`).join(', ') || 'No recent attempts'}

Trick Progression Schema Context:
${trickProgressions?.slice(0, 10).map(t => {
  const prerequisites = safeJsonParse(t.prerequisites, []);
  const tags = safeJsonParse(t.tags, []);
  return `${t.name} (${t.tier}): prerequisites [${prerequisites.join(', ')}], tags [${tags.join(', ')}]`;
}).join('\n') || ''}
`;

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

    // Create system prompt based on context and progression
    let systemPrompt = `You are a personalized skateboarding coach providing advice to ${name}.

User Profile:
${personalContext.join(' ')}

${progressionContext}

CRITICAL COACHING CONTEXT:
- The user's learning goals: "${userProfile.learning_goals || 'Not specified'}"
- If they mention feeling "plateaued" or wanting "switch" tricks, they are ADVANCED, not beginner
- If they mention specific advanced tricks (fakie kickflips, hardflips, 360 flips), treat them as advanced
- Don't suggest basic tricks like ollies unless they specifically ask about fundamentals

CONVERSATIONAL APPROACH:
- If the user is asking directly for specific trick advice or being firm about a request, provide the information immediately
- If the user reiterates a request or says things like "I want to learn [trick]" or "teach me [trick]", give them the detailed advice they're asking for
- ONLY ask clarifying questions for genuinely vague requests like "help me skate better"
- When users mention specific tricks, provide concrete step-by-step guidance
- If they're frustrated or insistent ("you're not listening", "just tell me"), give them what they want immediately
- Break complex advice into digestible responses but don't withhold information they're clearly requesting

RESPONSE STRUCTURE:
- For direct trick requests: Give immediate, detailed step-by-step instructions
- For vague requests: Ask 1-2 short, natural questions
- For tips: Provide 2-3 concrete, actionable steps + 1 practice tip
- Always end with an encouraging follow-up question about their progress or challenges

CONVERSATION FLOW EXAMPLES:
User: "How do I hardflip?"
You: "For hardflips, you need to combine a frontside shuvit with a kickflip motion. Start with your front foot positioned like a kickflip, back foot centered. Pop down and slightly forward while your front foot flicks down and out. The board will rotate frontside while flipping. Practice frontside shuvits and kickflips separately first. What tricks do you have consistent right now?"

User: "I wanna start learning switch tricks"
You: "Are there any tricks specifically you want to learn? Or do you want to start with the basics?"

User: "You're not listening - I want hardflip tips!"
You: [Give immediate detailed hardflip breakdown with steps, foot positioning, and practice progression]

Based on their profile and goals:
- Respond directly to specific trick requests with concrete advice
- Only ask questions when the request is genuinely unclear
- Provide actionable steps that match their skill level
- Address their stated goals immediately when clearly expressed

Communication Style:
- Match the ${readingLevel} reading level
- Be encouraging, supportive, and conversational
- Use skateboarding terminology appropriately for their skill level
- Give specific, actionable advice ONLY after gathering context
- Reference their actual goals and aspirations
- Keep responses short and engaging

IMPORTANT: Always ASK QUESTIONS FIRST to understand their specific situation before giving detailed advice. Think of yourself as having a natural conversation, not providing immediate comprehensive answers.`;

    // Adjust system prompt based on context
    if (context === 'trick_analysis') {
      systemPrompt += `

You're analyzing their trick attempt. Focus on:
- Technique specific to tricks they're working on
- Progression advice based on prerequisites they've mastered
- Next logical steps in their skateboarding journey
- Reference specific mechanics from trick tags (flip, rotation, spin, etc.)`;
    } else if (context === 'general_coaching') {
      systemPrompt += `

Provide general coaching advice considering:
- Their current skill level and completed tricks
- Suggest practice routines for tricks they're ready to learn
- Help them understand the progression pathway
- Address any specific goals they've mentioned`;
    } else {
      systemPrompt += `

Respond as their personal skateboarding coach. Consider:
- Their current progression level and what tricks they're ready for
- Use their completed tricks to understand their skill level
- Suggest appropriate next tricks based on prerequisites
- Reference technique tips specific to trick tags (fundamental, pop, flip, rotation, spin, combo, etc.)
- Be encouraging about their progress and realistic about next steps`;
    }

    // Call OpenAI
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      console.error('OpenAI API key not configured');
      throw new Error('OpenAI API key not configured');
    }
    console.log('OpenAI API key found, making request...');

    const requestBody = {
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message }
      ],
      max_tokens: 500,
      temperature: 0.7,
    };
    console.log('OpenAI request body:', JSON.stringify(requestBody, null, 2));

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
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
        experience: userProfile.started_skating_year ? new Date().getFullYear() - userProfile.started_skating_year : null,
        skillLevel: progression.skill_level,
        completedTricks: progression.completed_tricks,
        availableTricks: progression.available_tricks.slice(0, 5)
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in personalized-coach function:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      details: 'Failed to generate personalized coaching response'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});