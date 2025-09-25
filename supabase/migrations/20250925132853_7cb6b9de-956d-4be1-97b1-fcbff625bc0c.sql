-- Add viewed_at column to track when tips are actually viewed
ALTER TABLE user_daily_tips ADD COLUMN IF NOT EXISTS viewed_at timestamp with time zone;

-- Add indexes for efficient FIFO operations (only if they don't exist)
CREATE INDEX IF NOT EXISTS idx_user_daily_tips_user_slot ON user_daily_tips(user_id, slot);
CREATE INDEX IF NOT EXISTS idx_user_daily_tips_viewed ON user_daily_tips(user_id, viewed_at);

-- Update the cleanup function to handle FIFO logic
CREATE OR REPLACE FUNCTION public.process_daily_tips_fifo()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    user_record RECORD;
    viewed_count INTEGER;
    tip_record RECORD;
    new_slot INTEGER;
BEGIN
    -- Process each Pro user
    FOR user_record IN 
        SELECT DISTINCT u.id
        FROM users u
        WHERE u.plan_name = 'pro' AND u.is_subscribed = true
    LOOP
        -- Count how many tips were viewed yesterday
        SELECT COUNT(*) INTO viewed_count
        FROM user_daily_tips
        WHERE user_id = user_record.id
        AND viewed_at >= (CURRENT_DATE - INTERVAL '1 day')
        AND viewed_at < CURRENT_DATE;

        -- If tips were viewed, implement FIFO logic
        IF viewed_count > 0 THEN
            -- Remove viewed tips and shift remaining tips up
            DELETE FROM user_daily_tips 
            WHERE user_id = user_record.id 
            AND viewed_at >= (CURRENT_DATE - INTERVAL '1 day')
            AND viewed_at < CURRENT_DATE;

            -- Shift remaining tips up by updating their slots
            new_slot := 1;
            FOR tip_record IN 
                SELECT id, slot 
                FROM user_daily_tips 
                WHERE user_id = user_record.id 
                ORDER BY slot
            LOOP
                UPDATE user_daily_tips 
                SET slot = new_slot 
                WHERE id = tip_record.id;
                new_slot := new_slot + 1;
            END LOOP;
        END IF;
    END LOOP;
END;
$function$;

-- Create function to mark tip as viewed
CREATE OR REPLACE FUNCTION public.mark_tip_as_viewed(tip_id bigint)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    current_user_id UUID := auth.uid();
BEGIN
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    UPDATE user_daily_tips
    SET viewed_at = now()
    WHERE id = tip_id 
    AND user_id = current_user_id
    AND viewed_at IS NULL;

    RETURN FOUND;
END;
$function$;