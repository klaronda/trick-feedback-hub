import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import Stripe from "https://esm.sh/stripe@14.21.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const signature = req.headers.get('stripe-signature');
    const body = await req.text();
    
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
      apiVersion: '2023-10-16',
    });

    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
    if (!webhookSecret) {
      throw new Error('STRIPE_WEBHOOK_SECRET not configured');
    }

    let event;
    try {
      event = stripe.webhooks.constructEvent(body, signature!, webhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return new Response('Webhook signature verification failed', { status: 400 });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    console.log('Processing webhook event:', event.type);

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.user_id;
        
        if (!userId) {
          console.error('No user_id in session metadata');
          break;
        }

        console.log(`Upgrading user ${userId} to Pro after successful checkout`);

        // Update both profiles and users tables
        await Promise.all([
          supabase
            .from('profiles')
            .upsert({
              user_id: userId,
              plan_name: 'pro',
              is_subscribed: true,
              free_uploads_exhausted: false,
              updated_at: new Date().toISOString()
            }),
          supabase
            .from('users')
            .upsert({
              id: userId,
              plan_name: 'pro',
              is_subscribed: true,
              subscribed_at: new Date().toISOString(),
              stripe_customer_id: session.customer as string
            })
        ]);

        console.log(`Successfully upgraded user ${userId} to Pro`);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        // Find user by Stripe customer ID
        const { data: user } = await supabase
          .from('users')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .single();

        if (user) {
          console.log(`Downgrading user ${user.id} to free after subscription cancellation`);
          
          await Promise.all([
            supabase
              .from('profiles')
              .update({
                plan_name: 'free',
                is_subscribed: false,
                updated_at: new Date().toISOString()
              })
              .eq('user_id', user.id),
            supabase
              .from('users')
              .update({
                plan_name: 'free',
                is_subscribed: false
              })
              .eq('id', user.id)
          ]);

          console.log(`Successfully downgraded user ${user.id} to free`);
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});