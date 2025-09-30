-- Enable required extensions for scheduling and HTTP calls
create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

-- Ensure primary key exists on id
do $$
begin
  if not exists (
    select 1 from pg_constraint 
    where conrelid = 'public.user_daily_tips'::regclass 
      and contype = 'p'
  ) then
    alter table public.user_daily_tips add primary key (id);
  end if;
end $$;

-- Enforce one tip per slot per user (unique constraint)
do $$
begin
  if not exists (
    select 1 from pg_constraint 
    where conrelid = 'public.user_daily_tips'::regclass 
      and conname = 'user_daily_tips_user_slot_key'
  ) then
    alter table public.user_daily_tips
      add constraint user_daily_tips_user_slot_key unique (user_id, slot);
  end if;
end $$;

-- Helpful index for lookups/cleanup
create index if not exists idx_user_daily_tips_user_expires
  on public.user_daily_tips (user_id, expires_at);

-- Schedule the daily refresh to run every day at 07:00 UTC
-- This ensures the FIFO logic runs automatically each day
select
  cron.schedule(
    'daily-tips-refresh-0700',
    '0 7 * * *',
    $$
    select net.http_post(
      url := 'https://ezktqnzawbemjhvnawmt.supabase.co/functions/v1/daily-tips-refresh',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV6a3Rxbnphd2JlbWpodm5hd210Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcxNzE1NzksImV4cCI6MjA3Mjc0NzU3OX0.Qy9sKQJiGGAgVYhsPQ-Dbph11OBKV3fCtULwsUvyULA"}'::jsonb,
      body := '{}'::jsonb
    );
    $$
  );

-- Trigger a one-time refresh immediately to populate expired pools
select net.http_post(
  url := 'https://ezktqnzawbemjhvnawmt.supabase.co/functions/v1/daily-tips-refresh',
  headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV6a3Rxbnphd2JlbWpodm5hd210Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcxNzE1NzksImV4cCI6MjA3Mjc0NzU3OX0.Qy9sKQJiGGAgVYhsPQ-Dbph11OBKV3fCtULwsUvyULA"}'::jsonb,
  body := '{}'::jsonb
);