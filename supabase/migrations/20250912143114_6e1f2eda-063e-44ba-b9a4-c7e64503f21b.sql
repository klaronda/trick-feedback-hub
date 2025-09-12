-- Add onboarding_completed column to users table
ALTER TABLE public.users ADD COLUMN onboarding_completed boolean DEFAULT false;