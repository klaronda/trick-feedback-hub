import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { UploadAttempt } from "@/components/UploadAttempt";
import { AttemptsList } from "@/components/AttemptsList";
import { AttemptDetails } from "@/components/AttemptDetails";
import { PlanBadge } from "@/components/ui/PlanBadge";
import { supabase } from "@/integrations/supabase/client";
import { useUploadGuard } from "@/hooks/useUploadGuard";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { User, Session } from "@supabase/supabase-js";

type AppView = 'list' | 'upload' | 'details';

const Index = () => {
  const [currentView, setCurrentView] = useState<AppView>('list');
  const [selectedAttemptId, setSelectedAttemptId] = useState<string>("");
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userPlan, setUserPlan] = useState<{ plan_name: string | null; is_subscribed: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const [showQuotaModal, setShowQuotaModal] = useState(false);
  const [isUpgrading, setIsUpgrading] = useState(false);
  const navigate = useNavigate();
  const { checking, checkAndNavigate, invalidateCache } = useUploadGuard();

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('Auth state changed:', event, session?.user?.id);
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        // Only redirect to auth if we're on the main page and not authenticated
        if (!session && window.location.pathname === '/') {
          console.log('Redirecting to auth - no session');
          navigate('/auth');
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('Initial session check:', session?.user?.id);
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      // Only redirect to auth if we're on the main page and not authenticated
      if (!session && window.location.pathname === '/') {
        console.log('Initial redirect to auth - no session');
        navigate('/auth');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const fetchUserPlan = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('plan_name, is_subscribed')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching user plan:', error);
        // Set default values if user record doesn't exist
        setUserPlan({ plan_name: 'free', is_subscribed: false });
        return;
      }

      setUserPlan(data || { plan_name: 'free', is_subscribed: false });
    } catch (error) {
      console.error('Error fetching user plan:', error);
      setUserPlan({ plan_name: 'free', is_subscribed: false });
    }
  };

  useEffect(() => {
    if (user?.id) {
      // Defer to avoid blocking initial render
      setTimeout(() => {
        fetchUserPlan(user.id);
      }, 0);
    } else {
      setUserPlan(null);
    }
  }, [user?.id]);

  // Refresh plan when returning from checkout tab
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible' && user?.id) {
        fetchUserPlan(user.id);
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [user?.id]);

  const handleUpgrade = async () => {
    setIsUpgrading(true);
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user?.email) {
        alert("You must be logged in to upgrade.");
        return;
      }

      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: {
          customerEmail: user.email,
        },
      });

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, '_blank');
        setShowQuotaModal(false);
        invalidateCache(); // Clear cache when user might upgrade
      }
    } catch (error) {
      console.error('Checkout error:', error);
      alert("Failed to start checkout. Please try again.");
    } finally {
      setIsUpgrading(false);
    }
  };

  const handleUploadSuccess = (attemptId: string) => {
    setSelectedAttemptId(attemptId);
    setCurrentView('details');
  };

  const handleViewDetails = (attemptId: string) => {
    setSelectedAttemptId(attemptId);
    setCurrentView('details');
  };

  const handleUploadNew = async () => {
    if (userPlan?.plan_name === 'free') {
      const shouldShowUpgrade = await checkAndNavigate(() => setCurrentView('upload'));
      if (shouldShowUpgrade) {
        setShowQuotaModal(true);
        return;
      }
    } else {
      setCurrentView('upload');
    }
  };

  const handleBackToList = () => {
    setCurrentView('list');
    setSelectedAttemptId("");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect to auth
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold">
              Skate Coach <span className="text-primary">(MVP)</span>
            </h1>
            <div className="flex items-center gap-3">
              {/* User Avatar & Plan */}
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                  {user?.email?.charAt(0).toUpperCase() || 'U'}
                </div>
                {userPlan && (
                  <span className="text-sm text-muted-foreground">
                    Plan: <span className="font-medium">{userPlan.plan_name === 'pro' ? 'Pro' : 'Free'}</span>
                  </span>
                )}
              </div>
              
              {/* Upgrade Button */}
              {userPlan?.plan_name !== 'pro' && (
                <button
                  onClick={async () => {
                    try {
                      const user = (await supabase.auth.getUser()).data.user;
                      if (!user?.email) {
                        alert("You must be logged in to upgrade.");
                        return;
                      }

                      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
                        body: {
                          customerEmail: user.email,
                        },
                      });

                      if (error) throw error;

                      if (data?.url) {
                        window.open(data.url, '_blank');
                      }
                    } catch (error) {
                      console.error('Checkout error:', error);
                      alert("Failed to start checkout. Please try again.");
                    }
                  }}
                  className="px-3 py-1 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                >
                  Upgrade to Pro
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Quota Modal */}
      {showQuotaModal && (
        <div className="max-w-2xl mx-auto mb-6">
          <Alert className="border-amber-200 bg-amber-50">
            <Crown className="h-4 w-4 text-amber-600" />
            <AlertTitle className="text-amber-800">Monthly upload limit reached</AlertTitle>
            <AlertDescription className="text-amber-700 space-y-3">
              <p>You've reached your 5 free uploads for this month. Upgrade to Pro to upload unlimited videos and unlock priority processing.</p>
              <div className="flex gap-2 pt-2">
                <Button 
                  onClick={handleUpgrade}
                  disabled={isUpgrading}
                  className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
                >
                  {isUpgrading ? "Processing..." : "Upgrade to Pro"}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setShowQuotaModal(false)}
                  className="border-amber-300 text-amber-700 hover:bg-amber-100"
                >
                  Maybe later
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-12">
        {currentView === 'upload' && (
          <UploadAttempt 
            onUploadSuccess={handleUploadSuccess} 
            userPlan={userPlan}
          />
        )}
        
        {currentView === 'list' && (
          <AttemptsList 
            onViewDetails={handleViewDetails}
            onUploadNew={handleUploadNew}
            userPlan={userPlan}
            checking={checking}
          />
        )}
        
        {currentView === 'details' && selectedAttemptId && (
          <AttemptDetails 
            attemptId={selectedAttemptId}
            onBack={handleBackToList}
          />
        )}
      </main>
    </div>
  );
};

export default Index;
