-- Create daily_trick_tips table for storing generated tips
CREATE TABLE public.daily_trick_tips (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  slot INTEGER NOT NULL,
  tip_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '24 hours')
);

-- Enable RLS
ALTER TABLE public.daily_trick_tips ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own daily tips" 
ON public.daily_trick_tips 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "System can insert daily tips" 
ON public.daily_trick_tips 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "System can update daily tips" 
ON public.daily_trick_tips 
FOR UPDATE 
USING (true);

CREATE POLICY "System can delete expired tips" 
ON public.daily_trick_tips 
FOR DELETE 
USING (true);

-- Create index for performance
CREATE INDEX idx_daily_trick_tips_user_id ON public.daily_trick_tips(user_id);
CREATE INDEX idx_daily_trick_tips_expires_at ON public.daily_trick_tips(expires_at);

-- Create function to clean up expired tips
CREATE OR REPLACE FUNCTION public.cleanup_expired_daily_tips()
RETURNS VOID AS $$
BEGIN
  DELETE FROM public.daily_trick_tips 
  WHERE expires_at < now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the rotate_and_refill_daily_tips function to work with the new table
CREATE OR REPLACE FUNCTION public.rotate_and_refill_daily_tips(p_user_id UUID)
RETURNS TABLE(slot INTEGER, tip JSONB) AS $$
DECLARE
  existing_tips_count INTEGER;
BEGIN
  -- Clean up expired tips first
  PERFORM public.cleanup_expired_daily_tips();
  
  -- Check how many non-expired tips this user has
  SELECT COUNT(*) INTO existing_tips_count
  FROM public.daily_trick_tips 
  WHERE user_id = p_user_id AND expires_at > now();
  
  -- If user has fewer than 3 tips, generate new ones
  IF existing_tips_count < 3 THEN
    -- Remove all existing tips for this user to start fresh
    DELETE FROM public.daily_trick_tips WHERE user_id = p_user_id;
    
    -- Generate 3 new tips
    FOR i IN 1..3 LOOP
      INSERT INTO public.daily_trick_tips (user_id, slot, tip_data)
      VALUES (
        p_user_id, 
        i, 
        public.generate_trick_tip(p_user_id)
      );
    END LOOP;
  END IF;
  
  -- Return all current tips for this user
  RETURN QUERY
  SELECT dtt.slot, dtt.tip_data
  FROM public.daily_trick_tips dtt
  WHERE dtt.user_id = p_user_id AND dtt.expires_at > now()
  ORDER BY dtt.slot;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;