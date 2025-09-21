import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UserPreferences {
  notifications_enabled: boolean;
  camera_access_enabled: boolean;
  microphone_access_enabled: boolean;
}

export const useUserPreferences = () => {
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const fetchPreferences = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('No user found in fetchPreferences');
        return;
      }

      console.log('Fetching preferences for user:', user.id);
      
      const { data, error } = await supabase
        .from('profiles')
        .select('notifications_enabled, camera_access_enabled, microphone_access_enabled')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Database error fetching preferences:', error);
        throw error;
      }

      console.log('Raw preferences data:', data);

      const preferences = {
        notifications_enabled: data?.notifications_enabled ?? true,
        camera_access_enabled: data?.camera_access_enabled ?? true,
        microphone_access_enabled: data?.microphone_access_enabled ?? true,
      };

      console.log('Setting preferences:', preferences);
      setPreferences(preferences);
    } catch (error) {
      console.error('Error fetching preferences:', error);
      // Set defaults if fetch fails
      const defaultPreferences = {
        notifications_enabled: true,
        camera_access_enabled: true,
        microphone_access_enabled: true,
      };
      console.log('Setting default preferences:', defaultPreferences);
      setPreferences(defaultPreferences);
    } finally {
      setIsLoading(false);
    }
  };

  const updatePreferences = async (newPreferences: UserPreferences) => {
    try {
      setIsSaving(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('profiles')
        .update({
          notifications_enabled: newPreferences.notifications_enabled,
          camera_access_enabled: newPreferences.camera_access_enabled,
          microphone_access_enabled: newPreferences.microphone_access_enabled,
          preferences_updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);

      if (error) throw error;

      setPreferences(newPreferences);
      return true;
    } catch (error) {
      console.error('Error updating preferences:', error);
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    fetchPreferences();
  }, []);

  return {
    preferences,
    isLoading,
    isSaving,
    updatePreferences,
    refetch: fetchPreferences,
  };
};