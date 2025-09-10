import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { UploadAttempt } from "@/components/UploadAttempt";
import { AttemptsList } from "@/components/AttemptsList";
import { AttemptDetails } from "@/components/AttemptDetails";
import { PlanBadge } from "@/components/ui/PlanBadge";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

type AppView = 'list' | 'upload' | 'details';

const Index = () => {
  const [currentView, setCurrentView] = useState<AppView>('list');
  const [selectedAttemptId, setSelectedAttemptId] = useState<string>("");
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userPlan, setUserPlan] = useState<{ plan_name: string | null; is_subscribed: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

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

  const handleUploadSuccess = (attemptId: string) => {
    setSelectedAttemptId(attemptId);
    setCurrentView('details');
  };

  const handleViewDetails = (attemptId: string) => {
    setSelectedAttemptId(attemptId);
    setCurrentView('details');
  };

  const handleUploadNew = () => {
    setCurrentView('upload');
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
                      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
                        headers: {
                          Authorization: `Bearer ${session?.access_token}`,
                        },
                      });

                      if (error) throw error;

                      if (data?.url) {
                        window.location.href = data.url;
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
