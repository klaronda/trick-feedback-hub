-- Fix ambiguous column reference in rotate_and_refill_daily_tips function
CREATE OR REPLACE FUNCTION public.rotate_and_refill_daily_tips(p_user_id uuid, p_seen_slots smallint[])
 RETURNS TABLE(slot smallint, tip jsonb)
 LANGUAGE plpgsql
AS $$
DECLARE
  existing_tips jsonb[] := array[]::jsonb[];
  existing_slots smallint[] := array[]::smallint[];
  unseen_slots smallint[] := array[]::smallint[];
  s_count int := 0;
  i int;
  new_tips jsonb[] := array[]::jsonb[];
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

  -- CASE: all three seen -> generate 3 new tips
  IF s_count >= 3 THEN
    DELETE FROM public.user_daily_tips WHERE user_id = p_user_id;
    FOR i IN 1..3 LOOP
      INSERT INTO public.user_daily_tips (user_id, slot, tip)
      VALUES (p_user_id, i, public.generate_trick_tip())
      RETURNING user_daily_tips.tip INTO cur_tip;
      new_tips := new_tips || cur_tip;
    END LOOP;

  ELSIF s_count = 2 THEN
    -- Move the single unseen tip to slot 1, generate new tips for slots 2 & 3
    -- Find the unseen tip's content (if exists)
    IF array_length(unseen_slots,1) >= 1 THEN
      SELECT user_daily_tips.tip INTO cur_tip FROM public.user_daily_tips WHERE user_id = p_user_id AND user_daily_tips.slot = unseen_slots[1] LIMIT 1;
    ELSE
      cur_tip := public.generate_trick_tip();
    END IF;

    new_tips := new_tips || cur_tip; -- slot 1
    -- generate slot 2 and 3
    new_tips := new_tips || public.generate_trick_tip();
    new_tips := new_tips || public.generate_trick_tip();

    DELETE FROM public.user_daily_tips WHERE user_id = p_user_id;
    FOR i IN 1..3 LOOP
      INSERT INTO public.user_daily_tips (user_id, slot, tip)
      VALUES (p_user_id, i, new_tips[i])
      RETURNING user_daily_tips.tip INTO cur_tip;
      -- no-op
    END LOOP;

  ELSIF s_count = 1 THEN
    -- Move the two unseen tips up preserving FIFO order, generate one new tip for slot 3
    -- unseen_slots should contain two slots in ascending order
    IF array_length(unseen_slots,1) IS NULL THEN
      -- no unseen tips stored, just generate 3
      DELETE FROM public.user_daily_tips WHERE user_id = p_user_id;
      FOR i IN 1..3 LOOP
        INSERT INTO public.user_daily_tips (user_id, slot, tip)
        VALUES (p_user_id, i, public.generate_trick_tip())
        RETURNING user_daily_tips.tip INTO cur_tip;
        new_tips := new_tips || cur_tip;
      END LOOP;
    ELSE
      -- slot1 = tip from unseen_slots[1] (if exists) else generate
      IF array_length(unseen_slots,1) >= 1 THEN
        SELECT user_daily_tips.tip INTO cur_tip FROM public.user_daily_tips WHERE user_id = p_user_id AND user_daily_tips.slot = unseen_slots[1] LIMIT 1;
      ELSE
        cur_tip := public.generate_trick_tip();
      END IF;
      new_tips := new_tips || cur_tip;

      -- slot2 = tip from unseen_slots[2] (if exists) else generate
      IF array_length(unseen_slots,1) >= 2 THEN
        SELECT user_daily_tips.tip INTO cur_tip FROM public.user_daily_tips WHERE user_id = p_user_id AND user_daily_tips.slot = unseen_slots[2] LIMIT 1;
      ELSE
        cur_tip := public.generate_trick_tip();
      END IF;
      new_tips := new_tips || cur_tip;

      -- slot3 = new generated tip
      new_tips := new_tips || public.generate_trick_tip();

      DELETE FROM public.user_daily_tips WHERE user_id = p_user_id;
      FOR i IN 1..3 LOOP
        INSERT INTO public.user_daily_tips (user_id, slot, tip)
        VALUES (p_user_id, i, new_tips[i])
        RETURNING user_daily_tips.tip INTO cur_tip;
      END LOOP;
    END IF;

  ELSE
    -- fallback: if no seen slots matched, return existing
    FOR i IN 1..array_length(existing_slots,1) LOOP
      slot := existing_slots[i];
      tip := existing_tips[i];
      RETURN NEXT;
    END LOOP;
    RETURN;
  END IF;

  -- Return current 3 slots in order
  FOR i IN 1..3 LOOP
    SELECT user_daily_tips.tip INTO cur_tip FROM public.user_daily_tips WHERE user_id = p_user_id AND user_daily_tips.slot = i LIMIT 1;
    slot := i;
    tip := cur_tip;
    RETURN NEXT;
  END LOOP;

  RETURN;
END;
$$;