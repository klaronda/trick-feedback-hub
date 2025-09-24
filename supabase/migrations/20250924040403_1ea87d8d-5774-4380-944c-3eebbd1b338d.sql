-- Create trick progressions table
CREATE TABLE public.trick_progressions (
  trick_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  tier TEXT NOT NULL CHECK (tier IN ('beginner', 'intermediate', 'advanced')),
  prerequisites JSONB NOT NULL DEFAULT '[]'::jsonb,
  tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.trick_progressions ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read trick progressions (they're reference data)
CREATE POLICY "Trick progressions are publicly readable" 
ON public.trick_progressions 
FOR SELECT 
USING (true);

-- Insert the trick progression data
INSERT INTO public.trick_progressions (trick_id, name, tier, prerequisites, tags) VALUES
('ollie', 'Ollie', 'beginner', '[]'::jsonb, '["fundamental", "pop"]'::jsonb),
('shuvit', 'Shuvit', 'beginner', '["ollie"]'::jsonb, '["spin"]'::jsonb),
('frontside-180', 'Frontside 180', 'beginner', '["ollie"]'::jsonb, '["rotation"]'::jsonb),
('fakie-half-cab', 'Fakie Half Cab', 'beginner', '["frontside-180"]'::jsonb, '["fakie", "rotation"]'::jsonb),
('pop-shuvit', 'Pop Shuvit', 'intermediate', '["shuvit", "ollie"]'::jsonb, '["pop", "spin"]'::jsonb),
('fakie-pop-shuvit', 'Fakie Pop Shuvit', 'intermediate', '["pop-shuvit", "fakie-half-cab"]'::jsonb, '["fakie", "spin"]'::jsonb),
('kickflip', 'Kickflip', 'intermediate', '["ollie"]'::jsonb, '["flip", "front-foot"]'::jsonb),
('heelflip', 'Heelflip', 'intermediate', '["ollie"]'::jsonb, '["flip", "front-foot"]'::jsonb),
('frontside-shuvit', 'Frontside Shuvit', 'intermediate', '["pop-shuvit"]'::jsonb, '["spin"]'::jsonb),
('fakie-frontside-shuvit', 'Fakie Frontside Shuvit', 'intermediate', '["frontside-shuvit", "fakie-half-cab"]'::jsonb, '["fakie", "spin"]'::jsonb),
('backside-180', 'Backside 180', 'intermediate', '["frontside-180"]'::jsonb, '["rotation"]'::jsonb),
('fakie-frontside-180', 'Fakie Frontside 180', 'intermediate', '["backside-180", "fakie-half-cab"]'::jsonb, '["fakie", "rotation"]'::jsonb),
('varial-flip', 'Varial Flip', 'intermediate', '["kickflip", "pop-shuvit"]'::jsonb, '["flip", "spin", "combo"]'::jsonb),
('fakie-varial-flip', 'Fakie Varial Flip', 'intermediate', '["varial-flip", "fakie-pop-shuvit"]'::jsonb, '["fakie", "combo"]'::jsonb),
('fakie-bigspin', 'Fakie Bigspin', 'intermediate', '["fakie-frontside-shuvit", "fakie-pop-shuvit"]'::jsonb, '["fakie", "spin", "body-rotation"]'::jsonb),
('backside-flip', 'Backside Flip', 'advanced', '["kickflip", "backside-180"]'::jsonb, '["flip", "rotation"]'::jsonb),
('frontside-flip', 'Frontside Flip', 'advanced', '["kickflip", "frontside-180"]'::jsonb, '["flip", "rotation"]'::jsonb),
('half-cab-flip', 'Half Cab Flip', 'advanced', '["kickflip", "fakie-half-cab"]'::jsonb, '["fakie", "flip", "rotation"]'::jsonb),
('fakie-backside-flip', 'Fakie Backside Flip', 'advanced', '["fakie-frontside-180", "kickflip"]'::jsonb, '["fakie", "flip", "rotation"]'::jsonb),
('fakie-flip', 'Fakie Flip', 'intermediate', '["kickflip", "fakie-half-cab"]'::jsonb, '["fakie", "flip"]'::jsonb),
('fakie-heelflip', 'Fakie Heelflip', 'intermediate', '["heelflip", "fakie-half-cab"]'::jsonb, '["fakie", "flip"]'::jsonb),
('hardflip', 'Hardflip', 'advanced', '["kickflip", "frontside-shuvit"]'::jsonb, '["flip", "combo"]'::jsonb),
('360-flip', '360 Flip (Tre Flip)', 'advanced', '["kickflip", "pop-shuvit", "varial-flip"]'::jsonb, '["flip", "spin", "combo"]'::jsonb),
('fakie-hardflip', 'Fakie Hardflip', 'advanced', '["hardflip", "fakie-flip"]'::jsonb, '["fakie", "flip"]'::jsonb),
('backside-bigspin', 'Backside Bigspin', 'advanced', '["backside-180", "pop-shuvit"]'::jsonb, '["spin", "rotation"]'::jsonb),
('inward-heelflip', 'Inward Heelflip', 'advanced', '["heelflip", "pop-shuvit"]'::jsonb, '["flip", "combo"]'::jsonb);

-- Add progression context to trick attempts
ALTER TABLE public.trick_attempts 
ADD COLUMN IF NOT EXISTS skill_level TEXT,
ADD COLUMN IF NOT EXISTS progression_context JSONB DEFAULT '{}'::jsonb;

-- Create function to analyze user progression
CREATE OR REPLACE FUNCTION public.analyze_user_progression(p_user_id UUID)
RETURNS TABLE(
  completed_tricks TEXT[],
  current_tier TEXT,
  available_tricks TEXT[],
  skill_level TEXT
) AS $$
DECLARE
  user_tricks TEXT[];
  user_tier TEXT := 'beginner';
  next_tricks TEXT[];
  calculated_skill TEXT := 'beginner';
BEGIN
  -- Get tricks user has attempted successfully (completed status or multiple attempts)
  SELECT ARRAY_AGG(DISTINCT LOWER(trick_name)) INTO user_tricks
  FROM public.trick_attempts 
  WHERE user_id = p_user_id 
    AND trick_name IS NOT NULL
    AND (status = 'Completed' OR 
         trick_name IN (
           SELECT trick_name 
           FROM public.trick_attempts 
           WHERE user_id = p_user_id 
           GROUP BY trick_name 
           HAVING COUNT(*) >= 3
         ));

  -- Determine user's current tier based on completed tricks
  IF user_tricks && (SELECT ARRAY_AGG(trick_id) FROM public.trick_progressions WHERE tier = 'advanced') THEN
    user_tier := 'advanced';
    calculated_skill := 'advanced';
  ELSIF user_tricks && (SELECT ARRAY_AGG(trick_id) FROM public.trick_progressions WHERE tier = 'intermediate') THEN
    user_tier := 'intermediate';
    calculated_skill := 'intermediate';
  END IF;

  -- Find available next tricks (prerequisites met)
  SELECT ARRAY_AGG(tp.trick_id) INTO next_tricks
  FROM public.trick_progressions tp
  WHERE tp.trick_id != ALL(COALESCE(user_tricks, ARRAY[]::TEXT[]))
    AND (
      tp.prerequisites = '[]'::jsonb OR
      tp.prerequisites::jsonb <@ to_jsonb(COALESCE(user_tricks, ARRAY[]::TEXT[]))
    );

  RETURN QUERY SELECT 
    COALESCE(user_tricks, ARRAY[]::TEXT[]),
    user_tier,
    COALESCE(next_tricks, ARRAY[]::TEXT[]),
    calculated_skill;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;