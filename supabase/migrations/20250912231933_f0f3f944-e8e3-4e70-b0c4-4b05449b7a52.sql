-- Update user to Pro plan for testing
UPDATE users 
SET plan_name = 'pro', is_subscribed = true 
WHERE id = '33e2314c-d4f7-4df9-86c8-a10948627e83';