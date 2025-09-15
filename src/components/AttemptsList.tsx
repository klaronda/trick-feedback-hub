import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PlanBadge } from "@/components/ui/PlanBadge";
import { Eye, Plus, VideoIcon, LogOut, MessageCircle, Trash2, X, Crown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { NotificationBar, useNotificationBar } from "@/components/ui/notification-bar";
import { useNavigate } from "react-router-dom";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface TrickAttempt {
  id: string;
  trick_name: string | null;
  status: string;
  created_at: string;
  feedback: string | null;
}

interface AttemptsListProps {
  onViewDetails: (attemptId: string) => void;
  onUploadNew: () => void;
  userPlan?: { plan_name: string | null; is_subscribed: boolean } | null;
  checking?: boolean;
  uploadBlocked?: boolean;
  onShowUpgrade?: () => void;
}

export const AttemptsList = ({ onViewDetails, onUploadNew, userPlan, checking, uploadBlocked, onShowUpgrade }: AttemptsListProps) => {
  const [attempts, setAttempts] = useState<TrickAttempt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [bannerDismissed, setBannerDismissed] = useState(() => {
    return localStorage.getItem('freePlanBannerDismissed') === 'true';
  });
  const { notification, showNotification, hideNotification } = useNotificationBar();
  const navigate = useNavigate();

  useEffect(() => {
    fetchAttempts();
  }, []);

  const fetchAttempts = async () => {
    try {
      const { data, error } = await supabase
        .from('trick_attempts')
        .select('id, trick_name, status, created_at, feedback')
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      setAttempts(data || []);
    } catch (error) {
      console.error('Error fetching attempts:', error);
      showNotification('Failed to load your trick attempts', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'reviewed':
        return "bg-green-100 text-green-800 border-green-200";
      case 'pending':
      default:
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
    }
  };

  const getStatusEmoji = (status: string) => {
    switch (status.toLowerCase()) {
      case 'reviewed':
        return "🟢";
      case 'pending':
      default:
        return "🟡";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).replace(',', ' •');
  };

  const handleDelete = async (attemptId: string) => {
    if (!confirm('Are you sure you want to delete this attempt? This action cannot be undone.')) {
      return;
    }

    setDeletingId(attemptId);
    try {
      const { error } = await supabase
        .from('trick_attempts')
        .delete()
        .eq('id', attemptId);

      if (error) throw error;

      showNotification('The attempt has been removed successfully.', 'success');

      // Refresh the list
      fetchAttempts();
    } catch (error) {
      console.error('Error deleting attempt:', error);
      showNotification('Failed to delete the attempt. Please try again.', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  const handleLogout = async () => {
    try {
      // Clear local storage first to ensure clean logout
      localStorage.removeItem('supabase.auth.token');
      
      const { error } = await supabase.auth.signOut();
      
      // Don't show error if it's just a session not found issue
      if (error && error.message !== "Session from session_id claim in JWT does not exist") {
        showNotification('Failed to logout. Please try again.', 'error');
        return;
      }
      
      // Show success notification
      showNotification('You successfully signed out.', 'success');
      
      // Delay navigation to show notification
      setTimeout(() => {
        navigate('/auth');
      }, 500);
    } catch (error) {
      console.error('Logout error:', error);
      // Show error notification but still redirect
      showNotification('Failed to logout completely, but redirecting to login.', 'error');
      
      // Delay navigation to show notification  
      setTimeout(() => {
        navigate('/auth');
      }, 500);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background px-4 py-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-semibold text-foreground">My Trick Attempts</h1>
          </div>
          <div className="text-center py-12">
            <div className="animate-spin w-8 h-8 border-2 border-foreground border-t-transparent rounded-full mx-auto" />
            <p className="text-muted-foreground mt-4">Loading your attempts...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <NotificationBar
        message={notification.message}
        type={notification.type}
        isVisible={notification.isVisible}
        onHide={hideNotification}
      />
      <div className="min-h-screen bg-background px-4 py-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-semibold text-foreground">My Trick Attempts</h1>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={handleLogout} className="text-muted-foreground hover:text-foreground">
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
              <Button 
                onClick={onUploadNew} 
                disabled={checking}
                className="bg-foreground hover:bg-foreground/90 text-background font-medium"
              >
                <Plus className="w-4 h-4" />
                {checking ? "Checking..." : "Upload New"}
              </Button>
            </div>
          </div>

          {uploadBlocked && userPlan?.plan_name === 'free' && (
            <Alert className="border-warning bg-warning/10">
              <Crown className="h-4 w-4 text-warning" />
              <AlertTitle className="text-foreground">You've reached your upload max this month.</AlertTitle>
              <AlertDescription className="text-muted-foreground space-y-3">
                <p>It will reset again next month. Add a subscription for just $5/month and upload as many as you want.</p>
                <div className="flex gap-2 pt-2">
                  <Button 
                    onClick={onShowUpgrade}
                    className="bg-foreground hover:bg-foreground/90 text-background font-medium"
                  >
                    Go Pro
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {userPlan && !userPlan.is_subscribed && userPlan.plan_name === 'free' && !uploadBlocked && !bannerDismissed && (
            <Card className="p-4 bg-muted/50 border-border">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-foreground">Free Plan - Limited Features</h3>
                  <p className="text-sm text-muted-foreground">Unlock unlimited uploads and advanced features</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    size="sm" 
                    className="bg-foreground hover:bg-foreground/90 text-background font-medium"
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
                  >
                    Go Pro
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setBannerDismissed(true);
                      localStorage.setItem('freePlanBannerDismissed', 'true');
                    }}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {attempts.length === 0 ? (
            <Card className="p-12 text-center bg-card border-border">
              <div className="space-y-4">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
                  <VideoIcon className="w-8 h-8 text-muted-foreground" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-foreground">No attempts yet</h3>
                  <p className="text-muted-foreground">
                    Upload your first trick attempt to get started
                  </p>
                </div>
                <Button 
                  onClick={onUploadNew} 
                  disabled={checking}
                  className="bg-foreground hover:bg-foreground/90 text-background font-medium"
                >
                  {checking ? "Checking..." : "Upload First Attempt"}
                </Button>
              </div>
            </Card>
          ) : (
            <div className="space-y-4">
              {attempts.map((attempt) => (
                <Card key={attempt.id} className="p-6 bg-card border-border hover:bg-muted/50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-semibold text-foreground">
                          {attempt.trick_name || 'Unnamed Trick'}
                        </h3>
                        <Badge 
                          variant="secondary"
                          className={`px-3 py-1 text-sm font-medium ${
                            attempt.status.toLowerCase() === 'reviewed' 
                              ? 'bg-success/10 text-success border-success/20' 
                              : 'bg-warning/10 text-warning border-warning/20'
                          }`}
                        >
                          {attempt.status}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>{formatDate(attempt.created_at)}</span>
                        {attempt.feedback && (
                          <div className="flex items-center gap-1">
                            <MessageCircle className="w-4 h-4" />
                            <span>Feedback available</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => onViewDetails(attempt.id)}
                        className="text-sm border-border hover:bg-muted"
                      >
                        View Details
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(attempt.id)}
                        disabled={deletingId === attempt.id}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10 border-border"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
          
          {/* Disclaimer */}
          <div className="text-center text-sm text-muted-foreground mt-8">
            Your videos are stored in the cloud for up to 180 days.
          </div>
        </div>
      </div>
    </>
  );
};