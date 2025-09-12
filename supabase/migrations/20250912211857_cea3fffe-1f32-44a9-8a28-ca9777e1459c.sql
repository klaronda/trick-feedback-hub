-- Create profiles table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  plan_name TEXT DEFAULT 'free',
  is_subscribed BOOLEAN DEFAULT false,
  free_uploads_exhausted BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Fix the insert_trick_attempt function to match what the frontend is calling
DROP FUNCTION IF EXISTS public.insert_trick_attempt(user_id uuid, trick_name text, video_path text);
CREATE OR REPLACE FUNCTION public.insert_trick_attempt(
  user_id uuid, 
  trick_name text, 
  video_path text
) RETURNS SETOF trick_attempts
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  uploads_this_month int;
  user_plan_name text;
  v_inserted public.trick_attempts%ROWTYPE;
BEGIN
  -- Get user plan from profiles table
  SELECT plan_name INTO user_plan_name 
  FROM public.profiles 
  WHERE profiles.user_id = insert_trick_attempt.user_id;
  
  -- Default to 'free' if not found
  IF user_plan_name IS NULL THEN
    user_plan_name := 'free';
  END IF;

  -- If free plan, enforce quota
  IF user_plan_name = 'free' THEN
    SELECT count(*)
    INTO uploads_this_month
    FROM trick_attempts
    WHERE trick_attempts.user_id = insert_trick_attempt.user_id
      AND date_trunc('month', created_at) = date_trunc('month', now());

    IF uploads_this_month >= 5 THEN
      RAISE EXCEPTION 'monthly upload limit reached' USING ERRCODE='P0001';
    END IF;
  END IF;

  -- Insert and return the new row
  INSERT INTO trick_attempts (id, user_id, trick_name, video_path, created_at)
  VALUES (gen_random_uuid(), insert_trick_attempt.user_id, insert_trick_attempt.trick_name, insert_trick_attempt.video_path, now())
  RETURNING * INTO v_inserted;

  RETURN NEXT v_inserted;
END;
$$;

-- Create or update get_upload_status_for_current_user function
DROP FUNCTION IF EXISTS public.get_upload_status_for_current_user();
CREATE OR REPLACE FUNCTION public.get_upload_status_for_current_user()
RETURNS TABLE(monthly_count integer, free_uploads_exhausted boolean)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_id UUID := auth.uid();
  monthly_uploads integer;
  is_exhausted boolean;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Count uploads this month
  SELECT COUNT(*)::integer INTO monthly_uploads
  FROM public.trick_attempts
  WHERE user_id = current_user_id
    AND date_trunc('month', created_at) = date_trunc('month', now());

  -- Check if exhausted (5 or more uploads for free users)
  SELECT COALESCE(
    (SELECT monthly_uploads >= 5 AND plan_name = 'free' 
     FROM public.profiles 
     WHERE profiles.user_id = current_user_id), 
    (monthly_uploads >= 5)
  ) INTO is_exhausted;

  RETURN QUERY SELECT monthly_uploads, is_exhausted;
END;
$$;

-- Create function to automatically create profile for new users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- Create trigger for new user signup (if not exists)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();