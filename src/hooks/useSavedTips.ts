import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
// Toast removed per user request

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
  is_pinned?: boolean;
  pinned_at?: string | null;
}

export function useSavedTips() {
  const [savedTips, setSavedTips] = useState<SavedTip[]>([]);
  const [loading, setLoading] = useState(false);
  // Toast removed per user request

  const fetchSavedTips = async () => {
    console.log('🔍 Fetching saved tips...');
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('saved_trick_tips')
        .select('*')
        .order('is_pinned', { ascending: false })
        .order('pinned_at', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;

      console.log('✅ Fetched saved tips:', data?.length || 0, 'tips');
      console.log('📋 Saved tips data:', data);
      setSavedTips(data || []);
    } catch (error) {
      console.error('❌ Error fetching saved tips:', error);
      // Toast notification removed per user request
    } finally {
      setLoading(false);
    }
  };

  const togglePin = async (tipId: number) => {
    try {
      const { data, error } = await supabase.rpc('toggle_tip_pin', {
        tip_id: tipId
      });

      if (error) throw error;

      // Refresh the list to reflect changes
      await fetchSavedTips();

      return data; // Returns true if pinned, false if unpinned
    } catch (error) {
      console.error('Error toggling pin:', error);
      throw error;
    }
  };

  const saveTip = async (tip: TrickTip, source: string = 'daily-tips') => {
    console.log('💾 Saving tip:', tip.id, tip.headline);
    
    // Check if user is pro before allowing save
    const { data: userPlan } = await supabase
      .from('profiles')
      .select('plan_name, is_subscribed')
      .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
      .single();
    
    const isPro = userPlan?.plan_name === 'pro' || userPlan?.is_subscribed;
    if (!isPro) {
      console.log('⚠️ User is not pro, cannot save tip');
      return;
    }
    
    try {
      // Check for duplicates before saving
      const { data: existingTips, error: checkError } = await supabase
        .from('saved_trick_tips')
        .select('id')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .contains('tip', { id: tip.id });

      if (checkError) throw checkError;

      if (existingTips && existingTips.length > 0) {
        console.log('⚠️ Tip already saved, skipping');
        return;
      }

      console.log('🔄 Calling save_trick_tip function...');
      const { error } = await supabase.rpc('save_trick_tip', {
        tip_data: tip as any,
        source: source
      });

      if (error) throw error;

      console.log('✅ Tip saved successfully, refreshing list...');
      // Refresh the list
      await fetchSavedTips();

      // Toast notification removed per user request
    } catch (error) {
      console.error('❌ Error saving tip:', error);
      // Toast notification removed per user request
    }
  };

  const unsaveTip = async (tipId: number, onConfirm?: () => void) => {
    if (onConfirm) {
      onConfirm();
      return;
    }

    try {
      // Get tip data before deletion for notification
      const tipToDelete = savedTips.find(tip => tip.id === tipId);
      
      const { error } = await supabase
        .from('saved_trick_tips')
        .delete()
        .eq('id', tipId);

      if (error) throw error;

      // Note: Database trigger will handle notification creation automatically

      // Remove from local state
      setSavedTips(prev => prev.filter(tip => tip.id !== tipId));

      // Toast notification removed per user request
    } catch (error) {
      console.error('Error unsaving tip:', error);
      // Toast notification removed per user request
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
    togglePin,
    canUnsaveFromHomepage,
    refetch: fetchSavedTips
  };
}