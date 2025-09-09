import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { UploadAttempt } from "@/components/UploadAttempt";
import { AttemptsList } from "@/components/AttemptsList";
import { AttemptDetails } from "@/components/AttemptDetails";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

type AppView = 'list' | 'upload' | 'details';

const Index = () => {
  const [currentView, setCurrentView] = useState<AppView>('list');
  const [selectedAttemptId, setSelectedAttemptId] = useState<string>("");
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        
        // Redirect to auth if not logged in
        if (!session) {
          navigate('/auth');
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      
      // Redirect to auth if not logged in
      if (!session) {
        navigate('/auth');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

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
          <h1 className="text-3xl font-bold text-center">
            Skate Coach <span className="text-primary">(MVP)</span>
          </h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-12">
        {currentView === 'upload' && (
          <UploadAttempt onUploadSuccess={handleUploadSuccess} />
        )}
        
        {currentView === 'list' && (
          <AttemptsList 
            onViewDetails={handleViewDetails}
            onUploadNew={handleUploadNew}
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
