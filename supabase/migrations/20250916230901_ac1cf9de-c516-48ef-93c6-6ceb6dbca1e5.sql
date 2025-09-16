-- Fix security issue: add search_path to save_trick_tip function
CREATE OR REPLACE FUNCTION public.save_trick_tip(
  tip_data jsonb,
  source text DEFAULT 'daily-tips'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid := auth.uid();
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  INSERT INTO public.saved_trick_tips (user_id, tip, saved_from)
  VALUES (current_user_id, tip_data, source);
END;
$$;