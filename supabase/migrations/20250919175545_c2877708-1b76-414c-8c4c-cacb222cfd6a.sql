-- Add profile_image_url column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN profile_image_url TEXT;