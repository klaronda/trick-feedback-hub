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
    console.log('Starting daily tips refresh process...');

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables');
    }

    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    // Clean up all expired tips globally
    console.log('Cleaning up expired tips...');
    const { error: cleanupError } = await supabaseClient
      .from('user_daily_tips')
      .delete()
      .lt('expires_at', new Date().toISOString());

    if (cleanupError) {
      console.error('Error cleaning up expired tips:', cleanupError);
    }

    // Get all Pro users who need fresh tips (have less than 3 non-expired tips)
    console.log('Finding Pro users who need fresh tips...');
    
    const { data: proUsers, error: usersError } = await supabaseClient
      .from('users')
      .select('id, plan_name, is_subscribed')
      .eq('is_subscribed', true)
      .eq('plan_name', 'pro');

    if (usersError) {
      console.error('Error fetching Pro users:', usersError);
      throw usersError;
    }

    console.log(`Found ${proUsers?.length || 0} Pro users`);

    let refreshedCount = 0;
    let generatedCount = 0;

    if (proUsers && proUsers.length > 0) {
      for (const user of proUsers) {
        try {
          // Check how many non-expired tips this user has
          const { data: existingTips, error: tipsError } = await supabaseClient
            .from('user_daily_tips')
            .select('id, slot')
            .eq('user_id', user.id)
            .gt('expires_at', new Date().toISOString());

          if (tipsError) {
            console.error(`Error checking tips for user ${user.id}:`, tipsError);
            continue;
          }

          const tipCount = existingTips?.length || 0;
          console.log(`User ${user.id} has ${tipCount} non-expired tips`);

          // If user has less than 3 tips, generate new ones
          if (tipCount < 3) {
            console.log(`Generating fresh tips for user ${user.id}...`);
            
            // Call generate-tips-batch for this user
            const { error: generateError } = await supabaseClient.functions.invoke('generate-tips-batch', {
              body: { userId: user.id }
            });

            if (generateError) {
              console.error(`Error generating tips for user ${user.id}:`, generateError);
              continue;
            }

            generatedCount++;
            console.log(`Successfully triggered tip generation for user ${user.id}`);
          }

          refreshedCount++;
        } catch (userError) {
          console.error(`Error processing user ${user.id}:`, userError);
          continue;
        }
      }
    }

    console.log(`Daily tips refresh completed. Processed ${refreshedCount} users, generated tips for ${generatedCount} users.`);

    return new Response(JSON.stringify({
      success: true,
      processedUsers: refreshedCount,
      generatedTips: generatedCount,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in daily-tips-refresh function:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});