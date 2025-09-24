-- Add expires_at column to user_daily_tips table
ALTER TABLE public.user_daily_tips 
ADD COLUMN expires_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + interval '24 hours');

-- Update existing tips to expire in 24 hours
UPDATE public.user_daily_tips 
SET expires_at = generated_at + interval '24 hours' 
WHERE expires_at IS NULL;

-- Make expires_at NOT NULL
ALTER TABLE public.user_daily_tips 
ALTER COLUMN expires_at SET NOT NULL;

-- Add index for better performance when querying expired tips
CREATE INDEX idx_user_daily_tips_expires_at ON public.user_daily_tips(expires_at);
CREATE INDEX idx_user_daily_tips_user_expires ON public.user_daily_tips(user_id, expires_at);

-- Update the cleanup function to use expires_at
CREATE OR REPLACE FUNCTION public.cleanup_expired_daily_tips()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.user_daily_tips 
  WHERE expires_at < now();
END;
$$;