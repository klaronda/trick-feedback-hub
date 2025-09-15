import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { UploadModal } from "@/components/UploadModal";
import { AttemptsList } from "@/components/AttemptsList";
import { AttemptDetails } from "@/components/AttemptDetails";
import { Header } from "@/components/Header";
import { Navigation } from "@/components/Navigation";
import { DailyTrickTips } from "@/components/DailyTrickTips";
import { TopWeeklyTricks } from "@/components/TopWeeklyTricks";
import { RecentUploads } from "@/components/RecentUploads";
import { UploadLimitModal } from "@/components/UploadLimitModal";
import { NotificationModal } from "@/components/NotificationModal";
import Onboarding from "@/components/Onboarding";
import { supabase } from "@/integrations/supabase/client";
import { useUploadGuard } from "@/hooks/useUploadGuard";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";
import type { User, Session } from "@supabase/supabase-js";
import CoachChat from "@/components/CoachChat";

 type AppView = 'home' | 'videos' | 'upload' | 'details' | 'coach';

const Index = () => {
  const [currentView, setCurrentView] = useState<AppView>('home');
  const [selectedAttemptId, setSelectedAttemptId] = useState<string>("");
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userPlan, setUserPlan] = useState<{ plan_name: string | null; is_subscribed: boolean } | null>(null);
  const [userProfile, setUserProfile] = useState<{ first_name: string | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [showUploadLimitModal, setShowUploadLimitModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isNewUser, setIsNewUser] = useState(false);
  const navigate = useNavigate();
  const { checking, checkAndNavigate, invalidateCache, exhausted } = useUploadGuard();

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
      // Fetch user plan from users table
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('plan_name, is_subscribed, onboarding_completed')
        .eq('id', userId)
        .single();
      
      // Fetch user profile from profiles table
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('first_name')
        .eq('user_id', userId)
        .single();

      if (userError) {
        console.error('Error fetching user plan:', userError);
        // Set default values if user record doesn't exist - this means new user
        setUserPlan({ plan_name: 'free', is_subscribed: false });
        setIsNewUser(true);
        setShowOnboarding(true);
        return;
      }

      setUserPlan(userData || { plan_name: 'free', is_subscribed: false });
      setUserProfile(profileData || { first_name: null });
      
      // Check if this is a new user who hasn't completed onboarding
      if (!userData?.onboarding_completed) {
        setIsNewUser(true);
        setShowOnboarding(true);
      }
    } catch (error) {
      console.error('Error fetching user plan:', error);
      setUserPlan({ plan_name: 'free', is_subscribed: false });
      setIsNewUser(true);
      setShowOnboarding(true);
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
        setShowUploadLimitModal(false);
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
    const canNavigate = await checkAndNavigate(() => setShowUploadModal(true));
    if (!canNavigate) {
      setShowUploadLimitModal(true);
    }
  };

  const handleBackToList = () => {
    setCurrentView('videos');
    setSelectedAttemptId("");
  };

  const handleOnboardingComplete = async () => {
    setShowOnboarding(false);
    
    // Mark onboarding as completed in the database
    if (user?.id) {
      try {
        await supabase
          .from('users')
          .upsert({ 
            id: user.id, 
            onboarding_completed: true,
            plan_name: 'free',
            is_subscribed: false
          });
      } catch (error) {
        console.error('Error updating onboarding status:', error);
      }
    }
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

  // Show onboarding for new users
  if (showOnboarding) {
    return <Onboarding onComplete={handleOnboardingComplete} />;
  }

  const handleNavigate = (view: 'home' | 'videos' | 'coach' | 'profile') => {
    if (view === 'videos') {
      setCurrentView('videos');
    } else if (view === 'home') {
      setCurrentView('home');
    } else if (view === 'coach') {
      setCurrentView('coach');
    }
    // Profile will be implemented later
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <Header userPlan={userPlan} onNotificationClick={() => setShowNotificationModal(true)} />

      {/* Upload Limit Modal */}
      <UploadLimitModal 
        isOpen={showUploadLimitModal}
        onClose={() => setShowUploadLimitModal(false)}
        onUpgrade={handleUpgrade}
        isUpgrading={isUpgrading}
      />

      {/* Notification Modal */}
      <NotificationModal
        isOpen={showNotificationModal}
        onClose={() => setShowNotificationModal(false)}
        userFirstName={userProfile?.first_name || "User"}
      />

      {/* Main Content */}
      <main className="max-w-sm mx-auto px-4 py-6">
        {currentView === 'home' && (
          <div className="space-y-6">
            {/* Welcome Section */}
            <div className="space-y-2">
              <h1 className="text-2xl font-semibold text-gray-900">Welcome back{userProfile?.first_name ? `, ${userProfile.first_name}` : ''}!</h1>
              <p className="text-gray-600">Ready to improve your skating today?</p>
            </div>

            {/* Upload Button */}
            <Button 
              onClick={handleUploadNew}
              className="w-full h-12 bg-gray-900 hover:bg-gray-800 text-white font-medium"
            >
              <Upload className="w-5 h-5 mr-2" />
              Upload Video
            </Button>

            {/* Daily Trick Tips - Pro Only */}
            <DailyTrickTips userPlan={userPlan} />

            {/* Top Weekly Tricks */}
            <TopWeeklyTricks />

            {/* Recent Uploads */}
            <RecentUploads 
              onViewDetails={handleViewDetails}
              onUploadNew={handleUploadNew}
              onViewAll={() => setCurrentView('videos')}
            />
          </div>
        )}

        {/* Upload Modal */}
        <UploadModal
          isOpen={showUploadModal}
          onClose={() => setShowUploadModal(false)}
          onUploadSuccess={handleUploadSuccess}
          userPlan={userPlan}
        />
        
        {currentView === 'videos' && (
          <AttemptsList 
            onViewDetails={handleViewDetails}
            onUploadNew={handleUploadNew}
            userPlan={userPlan}
            checking={checking}
            uploadBlocked={false}
            onShowUpgrade={() => setShowUploadLimitModal(true)}
          />
        )}
        
        {currentView === 'coach' && (
          <CoachChat userFirstName={userProfile?.first_name} />
        )}
        
        {currentView === 'details' && selectedAttemptId && (
          <AttemptDetails 
            attemptId={selectedAttemptId}
            onBack={handleBackToList}
            userPlan={userPlan}
          />
        )}
      </main>

      {/* Bottom Navigation */}
      <Navigation 
        currentView={currentView === 'details' ? 'videos' : (currentView === 'upload' ? 'videos' : (currentView as 'home' | 'videos' | 'coach' | 'profile'))}
        onNavigate={handleNavigate}
      />
    </div>
  );
};

export default Index;
