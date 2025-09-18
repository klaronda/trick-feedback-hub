-- Create triggers for saved trick tips notifications

-- Trigger for when a tip is saved (INSERT)
CREATE TRIGGER handle_tip_saved_notification_trigger
  AFTER INSERT ON public.saved_trick_tips
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_tip_saved_notification();

-- Trigger for when a tip is removed (DELETE)  
CREATE TRIGGER handle_tip_removed_notification_trigger
  AFTER DELETE ON public.saved_trick_tips
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_tip_removed_notification();