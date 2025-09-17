import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

interface TrickTip {
  id: string;
  headline?: string;
  teaser_text?: string;
  detailed_content?: string;
  badge_category?: string;
  greeting: string | null;
  tip_text: string;
  actionable_step: string;
  safety_note: string | null;
  difficulty: string;
  tags: string[];
  estimated_time_min: number;
  generated_at: string;
}

interface SavedTip {
  id: number;
  created_at: string;
  tip: any; // Using any to match Json type from Supabase
  saved_from: string | null;
  user_id: string;
}

export function useSavedTips() {
  const [savedTips, setSavedTips] = useState<SavedTip[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchSavedTips = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('saved_trick_tips')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setSavedTips(data || []);
    } catch (error) {
      console.error('Error fetching saved tips:', error);
      toast({
        title: "Error loading saved tips",
        description: "Failed to load your saved tips. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const saveTip = async (tip: TrickTip, source: string = 'daily-tips') => {
    try {
      // Check for duplicates before saving
      const { data: existingTips, error: checkError } = await supabase
        .from('saved_trick_tips')
        .select('id')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .contains('tip', { id: tip.id });

      if (checkError) throw checkError;

      if (existingTips && existingTips.length > 0) {
        toast({
          title: "Tip already saved",
          description: "This tip is already in your saved tips.",
        });
        return;
      }

      const { error } = await supabase.rpc('save_trick_tip', {
        tip_data: tip as any,
        source: source
      });

      if (error) throw error;

      // Refresh the list
      fetchSavedTips();

      toast({
        title: "Tip saved",
        description: "Tip has been saved to your profile.",
      });
    } catch (error) {
      console.error('Error saving tip:', error);
      toast({
        title: "Error saving tip",
        description: "Failed to save the tip. Please try again.",
        variant: "destructive",
      });
    }
  };

  const unsaveTip = async (tipId: number) => {
    try {
      const { error } = await supabase
        .from('saved_trick_tips')
        .delete()
        .eq('id', tipId);

      if (error) throw error;

      // Remove from local state
      setSavedTips(prev => prev.filter(tip => tip.id !== tipId));

      toast({
        title: "Tip removed",
        description: "Tip has been removed from your saved tips.",
      });
    } catch (error) {
      console.error('Error unsaving tip:', error);
      toast({
        title: "Error removing tip",
        description: "Failed to remove the tip. Please try again.",
        variant: "destructive",
      });
    }
  };

  const canUnsaveFromHomepage = (createdAt: string): boolean => {
    const created = new Date(createdAt);
    const now = new Date();
    
    // Convert to PT timezone
    const nowPT = new Date(now.toLocaleString("en-US", {timeZone: "America/Los_Angeles"}));
    const createdPT = new Date(created.toLocaleString("en-US", {timeZone: "America/Los_Angeles"}));
    
    // Check if it's the same day and before 11:59 PM PT
    const isSameDay = nowPT.toDateString() === createdPT.toDateString();
    const currentHour = nowPT.getHours();
    const currentMinute = nowPT.getMinutes();
    const beforeDeadline = currentHour < 23 || (currentHour === 23 && currentMinute < 59);
    
    return isSameDay && beforeDeadline;
  };

  useEffect(() => {
    fetchSavedTips();
  }, []);

  return {
    savedTips,
    loading,
    saveTip,
    unsaveTip,
    canUnsaveFromHomepage,
    refetch: fetchSavedTips
  };
}