import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User } from '@supabase/supabase-js';

interface ProfileStats {
  totalUploads: number;
  monthlyUploads: number;
  coachChats: number;
  loading: boolean;
}

export const useProfileStats = (user: User | null) => {
  const [stats, setStats] = useState<ProfileStats>({
    totalUploads: 0,
    monthlyUploads: 0,
    coachChats: 0,
    loading: true
  });

  useEffect(() => {
    if (!user) {
      setStats(prev => ({ ...prev, loading: false }));
      return;
    }

    const fetchStats = async () => {
      try {
        // Get total uploads (all-time)
        const { count: totalUploads, error: totalError } = await supabase
          .from('trick_attempts')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id);

        if (totalError) throw totalError;

        // Get monthly upload status
        const { data: uploadStatus, error: monthlyError } = await supabase
          .rpc('get_upload_status_for_current_user');

        if (monthlyError) throw monthlyError;

        // Get coach chats count (from video_ai_responses table)
        const { count: coachChats, error: chatError } = await supabase
          .from('video_ai_responses')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id);

        if (chatError) throw chatError;

        setStats({
          totalUploads: totalUploads || 0,
          monthlyUploads: uploadStatus?.[0]?.monthly_count || 0,
          coachChats: coachChats || 0,
          loading: false
        });
      } catch (error) {
        console.error('Error fetching profile stats:', error);
        setStats(prev => ({ ...prev, loading: false }));
      }
    };

    fetchStats();
  }, [user]);

  return stats;
};