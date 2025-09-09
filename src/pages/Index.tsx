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
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        // Fetch user plan if logged in
        if (session?.user) {
          await fetchUserPlan(session.user.id);
        } else {
          setUserPlan(null);
        }
        
        setLoading(false);
        
        // Redirect to auth if not logged in
        if (!session) {
          navigate('/auth');
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      // Fetch user plan if logged in
      if (session?.user) {
        await fetchUserPlan(session.user.id);
      }
      
      setLoading(false);
      
      // Redirect to auth if not logged in
      if (!session) {
        navigate('/auth');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const fetchUserPlan = async (userId: string) => {
    try {
      // Query using RPC but bypass strict TS typing by casting
      const { data, error } = await (supabase as any)
        .rpc('get_user_plan', { user_id: userId });

      if (error) {
        console.error('Error fetching user plan:', error);
        // Set default values if user record doesn't exist
        setUserPlan({ plan_name: 'free', is_subscribed: false });
        return;
      }

      const plan = Array.isArray(data) ? data[0] : data;
      setUserPlan(plan || { plan_name: 'free', is_subscribed: false });
    } catch (error) {
      console.error('Error fetching user plan:', error);
      setUserPlan({ plan_name: 'free', is_subscribed: false });
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
            {userPlan && (
              <div className="flex items-center gap-3">
                <PlanBadge plan={userPlan.plan_name || 'free'} />
                {!userPlan.is_subscribed && userPlan.plan_name === 'free' && (
                  <div className="text-sm text-muted-foreground">
                    Limited features • <span className="text-primary font-medium cursor-pointer hover:underline">Upgrade to Pro</span>
                  </div>
                )}
              </div>
            )}
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
