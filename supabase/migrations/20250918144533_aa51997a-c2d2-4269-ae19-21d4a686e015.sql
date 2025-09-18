-- Add pinning functionality to saved_trick_tips table
ALTER TABLE public.saved_trick_tips 
ADD COLUMN is_pinned BOOLEAN DEFAULT false,
ADD COLUMN pinned_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Create function to toggle pin status with 3-pin limit
CREATE OR REPLACE FUNCTION public.toggle_tip_pin(tip_id bigint)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  current_user_id UUID := auth.uid();
  current_pin_status BOOLEAN;
  pinned_count INTEGER;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Get current pin status
  SELECT is_pinned INTO current_pin_status
  FROM public.saved_trick_tips
  WHERE id = tip_id AND user_id = current_user_id;

  IF current_pin_status IS NULL THEN
    RAISE EXCEPTION 'Tip not found or access denied';
  END IF;

  -- If trying to pin, check if user already has 3 pinned tips
  IF NOT current_pin_status THEN
    SELECT COUNT(*) INTO pinned_count
    FROM public.saved_trick_tips
    WHERE user_id = current_user_id AND is_pinned = true;

    IF pinned_count >= 3 THEN
      RAISE EXCEPTION 'Maximum of 3 pinned tips allowed';
    END IF;

    -- Pin the tip
    UPDATE public.saved_trick_tips
    SET is_pinned = true, pinned_at = now()
    WHERE id = tip_id AND user_id = current_user_id;

    -- Create pin notification
    PERFORM public.create_notification(
      current_user_id,
      'tip_pinned',
      'Tip pinned',
      'Tip has been pinned to the top of your saved tips',
      jsonb_build_object('tip_id', tip_id)
    );

    RETURN true;
  ELSE
    -- Unpin the tip
    UPDATE public.saved_trick_tips
    SET is_pinned = false, pinned_at = NULL
    WHERE id = tip_id AND user_id = current_user_id;

    -- Create unpin notification
    PERFORM public.create_notification(
      current_user_id,
      'tip_unpinned',
      'Tip unpinned',
      'Tip has been unpinned and moved back to chronological order',
      jsonb_build_object('tip_id', tip_id)
    );

    RETURN false;
  END IF;
END;
$$;