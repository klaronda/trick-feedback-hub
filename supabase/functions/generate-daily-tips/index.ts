import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing environment variables')
      return new Response(JSON.stringify({ error: 'Server configuration error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // Get authenticated user from the Authorization header JWT
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Extract user from JWT token
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      console.error('Auth error:', authError)
      return new Response(JSON.stringify({ error: 'Authentication failed' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log('Authenticated user:', user.id)

    // Check if user is pro
    const { data: userPlan, error: planError } = await supabase
      .from('users')
      .select('plan_name, is_subscribed')
      .eq('id', user.id)
      .single()

    if (planError) {
      console.error('Error fetching user plan:', planError)
      return new Response(JSON.stringify({ error: 'Failed to fetch user plan' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const isPro = userPlan?.plan_name === 'pro' || userPlan?.is_subscribed
    console.log(`User ${user.id} plan check: plan_name=${userPlan?.plan_name}, is_subscribed=${userPlan?.is_subscribed}, isPro=${isPro}`)
    if (!isPro) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Pro subscription required',
        tips: [] 
      }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Get pre-stored tips from user_daily_tips table
    const { data: storedTips, error: tipsError } = await supabase
      .from('user_daily_tips')
      .select('slot, tip')
      .eq('user_id', user.id)
      .order('slot', { ascending: true })
      .limit(3)

    if (tipsError) {
      console.error('Error fetching stored tips:', tipsError)
      return new Response(JSON.stringify({ error: 'Failed to fetch tips' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // If we have pre-stored tips, return them
    if (storedTips && storedTips.length > 0) {
      console.log(`Found ${storedTips.length} pre-stored tips for user ${user.id}`)
      
      // Update last_shown_at for the tips being shown
      await supabase
        .from('user_daily_tips')
        .update({ last_shown_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .in('slot', storedTips.map(t => t.slot))

      return new Response(JSON.stringify({
        success: true,
        tips: storedTips
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // If no pre-stored tips, trigger batch generation (this shouldn't happen often)
    console.log(`No pre-stored tips found for user ${user.id}, triggering batch generation`)
    
    const { error: batchError } = await supabase.functions.invoke('generate-tips-batch', {
      body: { userId: user.id }
    })

    if (batchError) {
      console.error('Error triggering batch generation:', batchError)
    }

    // Return fallback tips for immediate use
    const fallbackTips = [
      {
        slot: 1,
        tip: {
          headline: "Practice Balance Today",
          teaser_text: "Improve your board control with simple balance exercises",
          badge_category: "Fundamentals",
          tip_text: "Balance is the cornerstone of skateboarding - practice it daily",
          actionable_step: "Stand on your board for 30 seconds without moving",
          difficulty: "beginner",
          tags: ["balance", "fundamentals"],
          estimated_time_min: 10
        }
      },
      {
        slot: 2,
        tip: {
          headline: "Focus on Your Stance", 
          teaser_text: "Perfect your riding position for better control",
          badge_category: "Technique",
          tip_text: "Proper foot positioning unlocks better board control",
          actionable_step: "Practice adjusting your foot position while stationary",
          difficulty: "beginner",
          tags: ["stance", "positioning"],
          estimated_time_min: 15
        }
      },
      {
        slot: 3,
        tip: {
          headline: "Set Practice Goals",
          teaser_text: "Structure your sessions for better progress",
          badge_category: "Mindset",
          tip_text: "Having clear goals makes your practice more effective",
          actionable_step: "Choose one specific skill to focus on today",
          difficulty: "beginner", 
          tags: ["goals", "practice"],
          estimated_time_min: 5
        }
      }
    ]

    return new Response(JSON.stringify({
      success: true,
      tips: fallbackTips,
      note: "Pre-generation in progress, you'll see personalized tips soon!"
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Error in generate-daily-tips function:', error)
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})