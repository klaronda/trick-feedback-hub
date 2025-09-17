-- Create a SECURITY DEFINER function to aggregate top tricks across all users for the last 7 days
CREATE OR REPLACE FUNCTION public.get_top_tricks_last_7_days(limit_count integer DEFAULT 5)
RETURNS TABLE(trick_name text, attempt_count integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT t.trick_name, COUNT(*)::int AS attempt_count
  FROM public.trick_attempts t
  WHERE t.created_at >= now() - interval '7 days'
    AND t.trick_name IS NOT NULL
  GROUP BY t.trick_name
  ORDER BY attempt_count DESC, t.trick_name ASC
  LIMIT limit_count;
$$;