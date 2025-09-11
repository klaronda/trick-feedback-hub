-- Create RPC function to get monthly trick attempt count for current user
CREATE OR REPLACE FUNCTION public.get_monthly_trick_attempt_count()
RETURNS INTEGER AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_count int;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT COUNT(*)
  INTO v_count
  FROM public.trick_attempts
  WHERE user_id = v_user_id
    AND created_at >= date_trunc('month', now())
    AND created_at < (date_trunc('month', now()) + interval '1 month');

  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;