-- Fix search_path for notification functions
CREATE OR REPLACE FUNCTION public.create_notification(
  p_user_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_description TEXT,
  p_metadata JSONB DEFAULT '{}'
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert the notification
  INSERT INTO public.user_notifications (user_id, type, title, description, metadata)
  VALUES (p_user_id, p_type, p_title, p_description, p_metadata);
  
  -- Clean up old notifications (keep only last 50 per user)
  DELETE FROM public.user_notifications 
  WHERE user_id = p_user_id 
    AND id NOT IN (
      SELECT id FROM public.user_notifications 
      WHERE user_id = p_user_id 
      ORDER BY created_at DESC 
      LIMIT 50
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_video_upload_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.create_notification(
    NEW.user_id,
    'video_upload',
    'Video uploaded',
    'Your ' || COALESCE(NEW.trick_name, 'video') || ' attempt has been uploaded successfully',
    jsonb_build_object('video_id', NEW.id, 'trick_name', NEW.trick_name)
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_coach_review_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only create notification when status changes to completed and wasn't completed before
  IF NEW.status = 'Completed' AND (OLD.status IS NULL OR OLD.status != 'Completed') THEN
    PERFORM public.create_notification(
      NEW.user_id,
      'coach_review',
      'Coach reviewed your video',
      'Your ' || COALESCE(NEW.trick_name, 'video') || ' attempt has been reviewed',
      jsonb_build_object('video_id', NEW.id, 'trick_name', NEW.trick_name)
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_video_deletion_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only create notification when deleted_at is set and wasn't set before
  IF NEW.deleted_at IS NOT NULL AND (OLD.deleted_at IS NULL) THEN
    PERFORM public.create_notification(
      NEW.user_id,
      'video_deleted',
      'Video deleted',
      'Your ' || COALESCE(NEW.trick_name, 'video') || ' attempt has been deleted',
      jsonb_build_object('video_id', NEW.id, 'trick_name', NEW.trick_name)
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_tip_saved_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  tip_headline TEXT;
BEGIN
  -- Extract headline from tip data
  tip_headline := COALESCE(NEW.tip->>'headline', 'Tip');
  
  PERFORM public.create_notification(
    NEW.user_id,
    'tip_saved',
    'Tip saved',
    tip_headline || ' has been saved to your profile',
    jsonb_build_object('tip_id', NEW.id, 'tip_headline', tip_headline)
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_tip_removed_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  tip_headline TEXT;
BEGIN
  -- Extract headline from tip data
  tip_headline := COALESCE(OLD.tip->>'headline', 'Tip');
  
  PERFORM public.create_notification(
    OLD.user_id,
    'tip_removed',
    'Tip removed',
    tip_headline || ' has been removed from your saved tips',
    jsonb_build_object('tip_id', OLD.id, 'tip_headline', tip_headline)
  );
  RETURN OLD;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_profile_update_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only create notification for meaningful profile updates (exclude updated_at changes)
  IF (OLD.first_name IS DISTINCT FROM NEW.first_name) OR
     (OLD.last_name IS DISTINCT FROM NEW.last_name) OR
     (OLD.learning_goals IS DISTINCT FROM NEW.learning_goals) OR
     (OLD.focus IS DISTINCT FROM NEW.focus) OR
     (OLD.stance IS DISTINCT FROM NEW.stance) OR
     (OLD.gender IS DISTINCT FROM NEW.gender) OR
     (OLD.birthday IS DISTINCT FROM NEW.birthday) OR
     (OLD.started_skating_year IS DISTINCT FROM NEW.started_skating_year) THEN
    
    PERFORM public.create_notification(
      NEW.user_id,
      'profile_updated',
      'Profile updated',
      'Your profile information has been updated',
      jsonb_build_object('profile_id', NEW.id)
    );
  END IF;
  RETURN NEW;
END;
$$;