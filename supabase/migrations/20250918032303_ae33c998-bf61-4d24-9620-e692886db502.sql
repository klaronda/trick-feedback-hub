-- Create cron job to run tip generation daily at 2 AM UTC
SELECT cron.schedule(
  'generate-daily-tips-batch',
  '0 2 * * *', -- Every day at 2 AM UTC
  $$
  SELECT
    net.http_post(
        url:='https://ezktqnzawbemjhvnawmt.supabase.co/functions/v1/generate-tips-batch',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV6a3Rxbnphd2JlbWpodm5hd210Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzE3MTU3OSwiZXhwIjoyMDcyNzQ3NTc5fQ.WGBWKwxBRm9yy2TgKY2rKOJ4GHwfUSkJdZAfOaM4QNQ"}'::jsonb,
        body:='{"scheduled": true}'::jsonb
    ) as request_id;
  $$
);

-- Add index for better performance on user_daily_tips queries
CREATE INDEX IF NOT EXISTS idx_user_daily_tips_user_slot ON user_daily_tips(user_id, slot);
CREATE INDEX IF NOT EXISTS idx_user_daily_tips_generated_at ON user_daily_tips(generated_at);

-- Clean up old tips (older than 7 days) to prevent table bloat
CREATE OR REPLACE FUNCTION cleanup_old_daily_tips()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM user_daily_tips 
  WHERE generated_at < now() - interval '7 days';
END;
$$;

-- Schedule cleanup to run daily at 3 AM UTC
SELECT cron.schedule(
  'cleanup-old-daily-tips',
  '0 3 * * *',
  'SELECT cleanup_old_daily_tips();'
);