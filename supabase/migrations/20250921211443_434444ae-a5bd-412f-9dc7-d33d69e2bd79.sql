-- Add user preference fields to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS notifications_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS camera_access_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS microphone_access_enabled BOOLEAN DEFAULT true;