import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { UploadModal } from "@/components/UploadModal";
import { AttemptsList } from "@/components/AttemptsList";
import { AttemptDetails } from "@/components/AttemptDetails";
import { Header } from "@/components/Header";
import { Navigation } from "@/components/Navigation";
import { DailyTrickTips } from "@/components/DailyTrickTips";
import { TrickTipModal } from "@/components/TrickTipModal";
import { TopWeeklyTricks } from "@/components/TopWeeklyTricks";
import { RecentUploads } from "@/components/RecentUploads";
import { UploadLimitModal } from "@/components/UploadLimitModal";
import { NotificationModal } from "@/components/NotificationModal";
import { Profile } from "@/components/Profile";
import Onboarding from "@/components/Onboarding";
import { supabase } from "@/integrations/supabase/client";
import { useUploadGuard } from "@/hooks/useUploadGuard";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";
import type { User, Session } from "@supabase/supabase-js";
import CoachChat from "@/components/CoachChat";
// Toast removed per user request


 type AppView = 'home' | 'videos' | 'upload' | 'details' | 'coach' | 'profile';

const Index = () => {
  const [currentView, setCurrentView] = useState<AppView>('home');
  const [selectedAttemptId, setSelectedAttemptId] = useState<string>("");
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userPlan, setUserPlan] = useState<{ plan_name: string | null; is_subscribed: boolean } | null>(null);
  const [userProfile, setUserProfile] = useState<{ first_name: string | null; last_name: string | null; stance: string | null; learning_goals: string | null; profile_image_url: string | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [showUploadLimitModal, setShowUploadLimitModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isNewUser, setIsNewUser] = useState(false);
  const [selectedTrickTip, setSelectedTrickTip] = useState<any>(null);
  const [trickTipModalOpen, setTrickTipModalOpen] = useState(false);
  const navigate = useNavigate();
  const { checking, checkAndNavigate, invalidateCache, exhausted } = useUploadGuard();
  // Toast removed per user request

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
      // Prefer profiles table for plan/subscription + name
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('first_name, last_name, plan_name, is_subscribed, onboarding_completed, stance, learning_goals, profile_image_url')
        .eq('user_id', userId)
        .single();

      // Fallback to users table if needed
      const { data: userData } = await supabase
        .from('users')
        .select('plan_name, is_subscribed, onboarding_completed')
        .eq('id', userId)
        .maybeSingle();

      if (profileError && !profileData && !userData) {
        console.error('Error fetching user plan from profiles:', profileError);
        setUserPlan({ plan_name: 'free', is_subscribed: false });
        setIsNewUser(true);
        setShowOnboarding(true);
        return;
      }

      const resolvedPlan = profileData
        ? { plan_name: profileData.plan_name ?? 'free', is_subscribed: !!profileData.is_subscribed }
        : (userData || { plan_name: 'free', is_subscribed: false });

      setUserPlan(resolvedPlan);
      setUserProfile({ 
        first_name: profileData?.first_name ?? null,
        last_name: profileData?.last_name ?? null,
        stance: profileData?.stance ?? null,
        learning_goals: profileData?.learning_goals ?? null,
        profile_image_url: profileData?.profile_image_url ?? null
      });

      const onboardingCompleted = profileData?.onboarding_completed ?? userData?.onboarding_completed;
      if (!onboardingCompleted) {
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
  
  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Sign out error:', error);
    } finally {
      navigate('/auth');
    }
  };

  const handleTrickTipClick = (tip: any) => {
    setSelectedTrickTip(tip);
    setTrickTipModalOpen(true);
  };

  const handleProfileUpdate = () => {
    if (user) {
      fetchUserPlan(user.id);
    }
  };


  const handleNavigate = useCallback((view: 'home' | 'videos' | 'coach' | 'profile') => {
    const isPro = userPlan?.plan_name === 'pro' || userPlan?.is_subscribed;
    if (view === 'videos') {
      setCurrentView('videos');
    } else if (view === 'home') {
      setCurrentView('home');
    } else if (view === 'coach') {
      if (isPro) {
        setCurrentView('coach');
      } else {
        setShowUploadLimitModal(true);
      }
    } else if (view === 'profile') {
      setCurrentView('profile');
    }
    setSelectedAttemptId(null);
  }, [userPlan]);

  const handleNotificationClick = useCallback(() => {
    setShowNotificationModal(true);
  }, []);
  
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

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <Header userPlan={userPlan} onNotificationClick={handleNotificationClick} />

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

      {/* Trick Tip Modal */}
      <TrickTipModal
        tip={selectedTrickTip}
        isOpen={trickTipModalOpen}
        onClose={() => setTrickTipModalOpen(false)}
        userPlan={userPlan}
      />

      {/* Main Content */}
      <main className="max-w-sm mx-auto">
        <div className="px-4 py-6">
        {currentView === 'home' && (
          <div className="space-y-6">
            {/* Welcome Section */}
            <div className="space-y-2">
              <h1 className="text-2xl font-extralight text-gray-900">Welcome back{userProfile?.first_name ? `, ${userProfile.first_name}` : ''}!</h1>
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
            <DailyTrickTips 
              userPlan={userPlan} 
              onTipClick={handleTrickTipClick}
            />

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
        
        {currentView === 'profile' && (
          <Profile 
            user={user}
            userProfile={userProfile}
            userPlan={userPlan}
            onUpgrade={handleUpgrade}
            onSignOut={handleSignOut}
            onProfileUpdate={handleProfileUpdate}
          />
        )}
        </div>
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
