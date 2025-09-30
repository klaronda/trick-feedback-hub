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

    // Process FIFO logic for viewed tips first
    console.log('Processing FIFO logic for viewed tips...');
    const { error: fifoError } = await supabaseClient.rpc('process_daily_tips_fifo');
    
    if (fifoError) {
      console.error('Error processing FIFO logic:', fifoError);
    }

    // Get all Pro users who need fresh tips (have less than 6 total tips)
    console.log('Finding Pro users who need fresh tips...');
    
    // Check both profiles and users tables for Pro users
    const { data: profileUsers } = await supabaseClient
      .from('profiles')
      .select('user_id')
      .or('plan_name.eq.pro,is_subscribed.eq.true');

    const { data: tableUsers } = await supabaseClient
      .from('users')
      .select('id')
      .eq('is_subscribed', true)
      .eq('plan_name', 'pro');

    // Combine and deduplicate user IDs
    const profileIds = new Set((profileUsers || []).map(p => p.user_id));
    const tableIds = new Set((tableUsers || []).map(u => u.id));
    const allProIds = new Set([...profileIds, ...tableIds]);
    
    const proUsers = Array.from(allProIds).map(id => ({ id }));
    
    console.log(`Found ${proUsers.length} Pro users (${profileIds.size} from profiles, ${tableIds.size} from users table)`);

    let refreshedCount = 0;
    let generatedCount = 0;

    if (proUsers && proUsers.length > 0) {
      for (const user of proUsers) {
        try {
          // Check how many total tips this user has (maintain 6-tip pool)
          const { data: existingTips, error: tipsError } = await supabaseClient
            .from('user_daily_tips')
            .select('id, slot')
            .eq('user_id', user.id)
            .gt('expires_at', new Date().toISOString()); // Only count non-expired tips

          if (tipsError) {
            console.error(`Error checking tips for user ${user.id}:`, tipsError);
            continue;
          }

          const tipCount = existingTips?.length || 0;
          console.log(`User ${user.id} has ${tipCount} total tips`);

          // If user has less than 6 tips, generate new ones to fill the pool
          if (tipCount < 6) {
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