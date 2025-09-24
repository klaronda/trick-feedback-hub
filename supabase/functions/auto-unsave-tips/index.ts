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
    // Verify this is a scheduled call by checking for the secret
    const scheduledSecret = Deno.env.get('SCHEDULED_JOB_SECRET');
    const authHeader = req.headers.get('authorization');
    
    if (!authHeader || !authHeader.includes(scheduledSecret || '')) {
      return new Response('Unauthorized', { status: 401 });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Calculate 11:59 PM PT yesterday
    const now = new Date();
    const yesterdayPT = new Date(now.toLocaleString("en-US", {timeZone: "America/Los_Angeles"}));
    yesterdayPT.setDate(yesterdayPT.getDate() - 1);
    yesterdayPT.setHours(23, 59, 59, 999);

    // Convert back to UTC for database query
    const cutoffUTC = new Date(yesterdayPT.toLocaleString("en-US", {timeZone: "UTC"}));

    console.log(`Removing saved tips from before: ${cutoffUTC.toISOString()}`);

    // Delete saved tips that were saved from daily tips and are older than cutoff
    const { data, error } = await supabase
      .from('saved_trick_tips')
      .delete()
      .eq('saved_from', 'daily-tips')
      .lt('created_at', cutoffUTC.toISOString())
      .select();

    if (error) {
      console.error('Error removing old saved tips:', error);
      throw error;
    }

    console.log(`Successfully removed ${Array.isArray(data) ? data.length : 0} old saved tips`);

    return new Response(JSON.stringify({
      success: true,
      removed_count: Array.isArray(data) ? data.length : 0,
      cutoff_time: cutoffUTC.toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in auto-unsave-tips function:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});