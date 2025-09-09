-- Create RPC function to get user plan details
CREATE OR REPLACE FUNCTION public.get_user_plan(user_id UUID)
RETURNS TABLE(plan_name TEXT, is_subscribed BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    users.plan_name,
    users.is_subscribed
  FROM public.users
  WHERE users.id = user_id;
END;
$$;