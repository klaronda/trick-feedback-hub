-- Update the generate_trick_tip function to call the edge function instead of placeholder
CREATE OR REPLACE FUNCTION public.generate_trick_tip()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  current_user_id uuid := auth.uid();
  tip_response jsonb;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Call the generate-daily-tips edge function
  SELECT net.http_post(
    url := 'https://ezktqnzawbemjhvnawmt.supabase.co/functions/v1/generate-daily-tips',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('request.jwt.claims', true)::jsonb->>'token'
    ),
    body := '{}'::jsonb
  ) INTO tip_response;

  -- If edge function call fails, return fallback tip
  IF tip_response IS NULL OR NOT (tip_response->'success')::boolean THEN
    RETURN jsonb_build_object(
      'id', 'fallback-' || extract(epoch from now())::text,
      'headline', 'Master Your Balance',
      'teaser_text', 'Build core stability through focused practice sessions.',
      'detailed_content', '1. Position feet shoulder-width apart\n2. Keep knees slightly bent\n3. Practice on flat ground first\n4. Focus on weight distribution',
      'badge_category', 'Fundamentals',
      'actionable_step', 'Practice balance for 10 minutes daily.',
      'safety_note', 'Always wear protective gear.',
      'difficulty', 'beginner',
      'tags', ARRAY['balance', 'basics'],
      'estimated_time_min', 10,
      'generated_at', now()::text
    );
  END IF;

  -- Extract the tip from the response
  RETURN (tip_response->'tips'->0->'tip');
END;
$function$;