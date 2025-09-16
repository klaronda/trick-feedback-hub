-- Manually convert the current test user to Pro
-- Set Pro plan and subscription flags in both profiles and users tables

-- Update profiles entry
UPDATE public.profiles
SET plan_name = 'pro',
    is_subscribed = true,
    free_uploads_exhausted = false,
    updated_at = now()
WHERE user_id = '0b4226f9-3742-4e75-a021-8e0f62c95c70';

-- Update users entry
UPDATE public.users
SET plan_name = 'pro',
    is_subscribed = true,
    subscribed_at = COALESCE(subscribed_at, now())
WHERE id = '0b4226f9-3742-4e75-a021-8e0f62c95c70';