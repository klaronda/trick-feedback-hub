-- Create RPC function to get upload status for current user
CREATE OR REPLACE FUNCTION public.get_upload_status_for_current_user()
RETURNS TABLE(monthly_count integer, free_uploads_exhausted boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_count int;
  v_is_subscribed boolean;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Get current month upload count
  SELECT COUNT(*)
  INTO v_count
  FROM public.trick_attempts
  WHERE user_id = v_user_id
    AND created_at >= date_trunc('month', now())
    AND created_at < (date_trunc('month', now()) + interval '1 month');

  -- Get subscription status
  SELECT COALESCE(users.is_subscribed, false)
  INTO v_is_subscribed
  FROM public.users
  WHERE users.id = v_user_id;

  -- Return status
  RETURN QUERY
  SELECT 
    v_count::integer as monthly_count,
    (NOT v_is_subscribed AND v_count >= 5)::boolean as free_uploads_exhausted;
END;
$$;