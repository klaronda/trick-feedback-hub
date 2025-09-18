-- Create user_notifications table
CREATE TABLE public.user_notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('video_upload', 'coach_review', 'tip_saved', 'tip_removed', 'video_deleted', 'profile_updated', 'subscription_upgraded', 'subscription_downgraded')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own notifications" 
ON public.user_notifications 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" 
ON public.user_notifications 
FOR UPDATE 
USING (auth.uid() = user_id);

-- System can insert notifications
CREATE POLICY "System can insert notifications" 
ON public.user_notifications 
FOR INSERT 
WITH CHECK (true);

-- System can delete old notifications
CREATE POLICY "System can delete old notifications" 
ON public.user_notifications 
FOR DELETE 
USING (true);

-- Add index for performance
CREATE INDEX idx_user_notifications_user_created ON public.user_notifications(user_id, created_at DESC);
CREATE INDEX idx_user_notifications_unread ON public.user_notifications(user_id, is_read, created_at DESC);

-- Function to create notification
CREATE OR REPLACE FUNCTION public.create_notification(
  p_user_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_description TEXT,
  p_metadata JSONB DEFAULT '{}'
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
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

-- Function to handle video upload notifications
CREATE OR REPLACE FUNCTION public.handle_video_upload_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
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

-- Function to handle coach review notifications
CREATE OR REPLACE FUNCTION public.handle_coach_review_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
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

-- Function to handle video deletion notifications
CREATE OR REPLACE FUNCTION public.handle_video_deletion_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
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

-- Function to handle tip saved notifications
CREATE OR REPLACE FUNCTION public.handle_tip_saved_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
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

-- Function to handle tip removed notifications
CREATE OR REPLACE FUNCTION public.handle_tip_removed_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
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

-- Function to handle profile update notifications
CREATE OR REPLACE FUNCTION public.handle_profile_update_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
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

-- Create triggers
CREATE TRIGGER trigger_video_upload_notification
  AFTER INSERT ON public.trick_attempts
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_video_upload_notification();

CREATE TRIGGER trigger_coach_review_notification
  AFTER UPDATE ON public.trick_attempts
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_coach_review_notification();

CREATE TRIGGER trigger_video_deletion_notification
  AFTER UPDATE ON public.trick_attempts
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_video_deletion_notification();

CREATE TRIGGER trigger_tip_saved_notification
  AFTER INSERT ON public.saved_trick_tips
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_tip_saved_notification();

CREATE TRIGGER trigger_tip_removed_notification
  AFTER DELETE ON public.saved_trick_tips
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_tip_removed_notification();

CREATE TRIGGER trigger_profile_update_notification
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_profile_update_notification();

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_notifications;