-- Add onboarding fields to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS first_name TEXT,
ADD COLUMN IF NOT EXISTS last_name TEXT,
ADD COLUMN IF NOT EXISTS started_skating_year INTEGER,
ADD COLUMN IF NOT EXISTS stance TEXT CHECK (stance IN ('regular', 'goofy')),
ADD COLUMN IF NOT EXISTS gender TEXT CHECK (gender IN ('male', 'female', 'other')),
ADD COLUMN IF NOT EXISTS birthday DATE,
ADD COLUMN IF NOT EXISTS learning_goals TEXT,
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;

-- Update the handle_new_user function to include the new fields
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, plan_name, is_subscribed, created_at, updated_at)
  VALUES (new.id, 'free', false, now(), now())
  ON CONFLICT (user_id) DO NOTHING;
  
  INSERT INTO public.users (id, plan_name, is_subscribed, created_at)
  VALUES (new.id, 'free', false, now())
  ON CONFLICT (id) DO NOTHING;
  
  RETURN new;
END;
$$;