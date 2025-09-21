-- Update handle_new_user function to include preference defaults
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    user_id, 
    plan_name, 
    is_subscribed, 
    notifications_enabled,
    camera_access_enabled,
    microphone_access_enabled,
    created_at, 
    updated_at
  )
  VALUES (
    new.id, 
    'free', 
    false, 
    true,
    true,
    true,
    now(), 
    now()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    notifications_enabled = COALESCE(profiles.notifications_enabled, true),
    camera_access_enabled = COALESCE(profiles.camera_access_enabled, true),
    microphone_access_enabled = COALESCE(profiles.microphone_access_enabled, true);
  
  INSERT INTO public.users (id, plan_name, is_subscribed, created_at)
  VALUES (new.id, 'free', false, now())
  ON CONFLICT (id) DO NOTHING;
  
  RETURN new;
END;
$$;