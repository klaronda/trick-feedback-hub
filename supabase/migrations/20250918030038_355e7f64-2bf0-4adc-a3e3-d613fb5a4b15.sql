-- Fix the rotate_and_refill_daily_tips function to not call the old generate_trick_tip function
-- and instead let the edge function handle all tip generation

CREATE OR REPLACE FUNCTION public.rotate_and_refill_daily_tips(p_user_id uuid, p_seen_slots smallint[])
 RETURNS TABLE(slot smallint, tip jsonb)
 LANGUAGE plpgsql
AS $function$
DECLARE
  existing_tips jsonb[] := array[]::jsonb[];
  existing_slots smallint[] := array[]::smallint[];
  unseen_slots smallint[] := array[]::smallint[];
  s_count int := 0;
  i int;
  cur_tip jsonb;
BEGIN
  -- Normalize null to empty array
  IF p_seen_slots IS NULL THEN
    p_seen_slots := ARRAY[]::smallint[];
  END IF;

  -- Lock the user's rows so concurrent opens don't race
  FOR i IN 1..3 LOOP
    SELECT user_daily_tips.tip INTO cur_tip
    FROM public.user_daily_tips
    WHERE user_id = p_user_id AND user_daily_tips.slot = i
    FOR UPDATE
    LIMIT 1;

    IF cur_tip IS NOT NULL THEN
      existing_tips := existing_tips || cur_tip;
      existing_slots := existing_slots || i;
    END IF;
  END LOOP;

  -- If user didn't open the app (client passes empty seen array), return existing tips unchanged
  IF array_length(p_seen_slots,1) IS NULL OR array_length(p_seen_slots,1) = 0 THEN
    FOR i IN 1..array_length(existing_slots,1) LOOP
      slot := existing_slots[i];
      tip := existing_tips[i];
      RETURN NEXT;
    END LOOP;
    RETURN;
  END IF;

  s_count := array_length(p_seen_slots,1);

  -- Build list of unseen slots (FIFO order preserved by slot number)
  FOR i IN 1..3 LOOP
    IF NOT (i = ANY(p_seen_slots)) THEN
      unseen_slots := unseen_slots || i;
    END IF;
  END LOOP;

  -- For any case where we need new tips, clear all existing tips
  -- The edge function will handle generating new tips
  IF s_count >= 1 THEN
    DELETE FROM public.user_daily_tips WHERE user_id = p_user_id;
    -- Return empty so edge function generates new tips
    RETURN;
  END IF;

  -- Fallback: return existing tips if no seen slots
  FOR i IN 1..array_length(existing_slots,1) LOOP
    slot := existing_slots[i];
    tip := existing_tips[i];
    RETURN NEXT;
  END LOOP;

  RETURN;
END;
$function$;

-- Clean up old tips to force regeneration with new format
DELETE FROM public.user_daily_tips;

-- Remove the old generate_trick_tip function since it's not needed anymore
DROP FUNCTION IF EXISTS public.generate_trick_tip();