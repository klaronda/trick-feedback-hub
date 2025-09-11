import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const MAX_FREE_UPLOADS = 5;
const CACHE_TTL_MS = 30 * 1000; // short client cache (30s)

let cachedCount: { value: number; ts: number } | null = null;

export function useUploadGuard() {
  const [checking, setChecking] = useState(false);
  const { toast } = useToast();

  const showUpgradeModal = useCallback(() => {
    return new Promise((resolve) => {
      // This will be handled by the component that uses this hook
      resolve(true);
    });
  }, []);

  const handleServerLimitError = useCallback((err: any) => {
    const msg = (err?.message ?? '').toLowerCase();
    // P0001 is the error code we raised server-side; fallback on message text
    if (err?.code === 'P0001' || msg.includes('monthly upload limit reached') || msg.includes('quota_exceeded')) {
      return true;
    }
    return false;
  }, []);

  const checkAndNavigate = useCallback(async (navigateToUpload: () => void): Promise<boolean> => {
    if (checking) return false;
    setChecking(true);

    try {
      // Use cached value if fresh
      const now = Date.now();
      if (cachedCount && now - cachedCount.ts < CACHE_TTL_MS) {
        if (cachedCount.value >= MAX_FREE_UPLOADS) {
          return true; // Show upgrade modal
        } else {
          navigateToUpload();
          return false;
        }
      }

      // Call RPC to get the current user's monthly count
      const { data, error } = await supabase.rpc('get_monthly_trick_attempt_count');

      if (error) throw error;

      const count = Number(data ?? 0);
      // update cache
      cachedCount = { value: count, ts: Date.now() };

      if (count >= MAX_FREE_UPLOADS) {
        return true; // Show upgrade modal
      }

      // Optional optimistic increment to reduce repeated checks in a session
      cachedCount.value = count + 1;

      // proceed to upload page
      navigateToUpload();
      return false;
    } catch (err: any) {
      console.error('Upload pre-check failed', err);

      // If server says limit reached (race scenario during an upload attempt),
      // handle it here; otherwise fallback behavior:
      const handled = handleServerLimitError(err);
      if (handled) {
        return true; // Show upgrade modal
      } else {
        // Fallback: allow navigation but inform user the server will enforce limits
        toast({
          title: "Upload check failed",
          description: "Could not verify uploads. You can try uploading but the server will enforce limits.",
          variant: "destructive"
        });
        navigateToUpload();
        return false;
      }
    } finally {
      setChecking(false);
    }
  }, [checking, handleServerLimitError, toast]);

  const invalidateCache = useCallback(() => {
    cachedCount = null;
  }, []);

  return { 
    checking, 
    checkAndNavigate, 
    handleServerLimitError, 
    invalidateCache 
  };
}