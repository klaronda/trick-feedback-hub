import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const MAX_FREE_UPLOADS = 5;

export function useUploadGuard() {
  const [checking, setChecking] = useState(false);
  const [exhausted, setExhausted] = useState<boolean>(false);
  const [monthlyCount, setMonthlyCount] = useState<number>(0);

  // Fetch initial status via RPC
  const fetchStatus = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .rpc('get_upload_status_for_current_user');
      if (error) throw error;
      
      const row = Array.isArray(data) ? data[0] : data;
      setMonthlyCount(Number(row?.monthly_count ?? 0));
      setExhausted(Boolean(row?.free_uploads_exhausted ?? false));
    } catch (err) {
      console.error('Failed to fetch upload status', err);
      // Fallback: assume not exhausted but inform user on failures
      setExhausted(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();

    // Real-time subscription to users table for subscription changes
    const channel = supabase
      .channel('user-subscription-changes')
      .on(
        'postgres_changes',
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'users'
        },
        (payload) => {
          const newRow = payload?.new;
          if (!newRow) return;
          
          // Refresh status when subscription changes
          fetchStatus();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchStatus]);

  const showUpgradeModal = useCallback(() => {
    toast.error('Monthly upload limit reached.', {
      description: 'You\'ve reached your 5 free uploads for this month. Upgrade to Pro to upload more.',
      action: {
        label: 'Upgrade',
        onClick: async () => {
          try {
            const user = (await supabase.auth.getUser()).data.user;
            if (!user?.email) {
              toast.error('You must be logged in to upgrade.');
              return;
            }

            const { data, error } = await supabase.functions.invoke('create-checkout-session', {
              body: { customerEmail: user.email },
            });

            if (error) throw error;

            if (data?.url) {
              window.open(data.url, '_blank');
            }
          } catch (error) {
            console.error('Checkout error:', error);
            toast.error('Failed to start checkout. Please try again.');
          }
        },
      },
    });
  }, []);

  const handleServerInsertError = useCallback((err: any) => {
    const msg = (err?.message ?? '').toLowerCase();
    // P0001 is the error code we raised server-side; fallback on message text
    if (err?.code === 'P0001' || msg.includes('monthly upload limit reached')) {
      setExhausted(true);
      showUpgradeModal();
      return true;
    }
    return false;
  }, [showUpgradeModal]);

  const checkAndNavigate = useCallback(async (navigateToUpload: () => void) => {
    if (checking) return;
    setChecking(true);

    try {
      // Quick guard using local flag (most up-to-date via realtime)
      if (exhausted || monthlyCount >= MAX_FREE_UPLOADS) {
        // Return false to indicate upload was blocked
        return false;
      }

      // Not exhausted: navigate to upload screen
      // Navigate first for faster UX; actual insert is still protected server-side
      navigateToUpload();
      return true;
    } catch (err: any) {
      console.error('Upload pre-check failed', err);

      // If server says limit reached (race scenario during an upload attempt),
      // handle it here; otherwise fallback behavior:
      const handled = handleServerInsertError(err);
      if (!handled) {
        // Fallback: allow navigation but inform user the server will enforce limits
        toast.error('Upload check failed', {
          description: 'Could not verify uploads. You can try uploading but the server will enforce limits.',
        });
        navigateToUpload();
        return true;
      }
      return false;
    } finally {
      setChecking(false);
    }
  }, [checking, exhausted, monthlyCount, handleServerInsertError, showUpgradeModal]);

  const invalidateCache = useCallback(() => {
    // Refresh status after upload
    fetchStatus();
  }, [fetchStatus]);

  return { 
    checking, 
    checkAndNavigate, 
    handleServerInsertError, 
    exhausted, 
    monthlyCount,
    invalidateCache
  };
}