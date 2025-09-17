import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { PlanBadge } from "@/components/ui/PlanBadge";
import { Eye, Upload, VideoIcon, LogOut, MessageCircle, Trash2, X, Crown, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { NotificationBar, useNotificationBar } from "@/components/ui/notification-bar";
import { Disclaimer } from "@/components/ui/Disclaimer";
import { useNavigate } from "react-router-dom";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface TrickAttempt {
  id: string;
  trick_name: string | null;
  status: string;
  created_at: string;
  feedback: string | null;
  analysis_data?: any;
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
  const [searchQuery, setSearchQuery] = useState("");
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
        .select('id, trick_name, status, created_at, feedback, analysis_data')
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

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    if (diffInSeconds < 172800) return 'Yesterday';
    return `${Math.floor(diffInSeconds / 86400)} days ago`;
  };

  const getScore = (analysisData: any) => {
    if (!analysisData || typeof analysisData !== 'object') return null;
    return analysisData.score || analysisData.overall_score || null;
  };

  const groupAttemptsByMonth = (attempts: TrickAttempt[]) => {
    const filteredAttempts = attempts.filter(attempt => 
      !searchQuery || 
      attempt.trick_name?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const grouped = filteredAttempts.reduce((acc, attempt) => {
      const date = new Date(attempt.created_at);
      const monthYear = date.toLocaleDateString('en-US', { 
        month: 'long', 
        year: 'numeric' 
      });
      
      if (!acc[monthYear]) {
        acc[monthYear] = [];
      }
      acc[monthYear].push(attempt);
      return acc;
    }, {} as Record<string, TrickAttempt[]>);

    return Object.entries(grouped).sort(([a], [b]) => {
      const dateA = new Date(a + ' 1');
      const dateB = new Date(b + ' 1');
      return dateB.getTime() - dateA.getTime();
    });
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
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-extralight text-foreground">Videos</h1>
        </div>
        <div className="text-center py-12">
          <div className="animate-spin w-8 h-8 border-2 border-foreground border-t-transparent rounded-full mx-auto" />
          <p className="text-muted-foreground mt-4">Loading your attempts...</p>
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
      <div className="space-y-6">
          {/* Header */}
          <div className="space-y-1">
            <h1 className="text-2xl font-extralight text-foreground">Videos</h1>
            <p className="text-muted-foreground">Review your uploaded videos and coaching feedback</p>
          </div>

          {/* Upload Button */}
          <Button 
            onClick={onUploadNew} 
            disabled={checking}
            className="w-full h-12 bg-gray-900 hover:bg-gray-800 text-white font-medium"
          >
            <Upload className="w-4 h-4 mr-2" />
            {checking ? "Checking..." : "Upload"}
          </Button>

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              type="text"
              placeholder="Search your tricks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
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
            <Card className="p-4 bg-muted/50 border-border relative">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground mb-1">Get unlimited video reviews.</h3>
                  <p className="text-sm text-muted-foreground">And chat with a Coach whenever you want about trick tips, learning plans, and drills. Just $5/month.</p>
                </div>
                <div className="flex items-start gap-3">
                  <Button 
                    size="sm" 
                    className="bg-blue-600 hover:bg-blue-700 text-white font-medium"
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
                    size="icon"
                    onClick={() => {
                      setBannerDismissed(true);
                      localStorage.setItem('freePlanBannerDismissed', 'true');
                    }}
                    className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground hover:bg-background/50 -mt-1 -mr-1"
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
                  className="bg-[var(--soft-black)] hover:bg-[var(--soft-black)]/90 text-white font-medium"
                >
                  {checking ? "Checking..." : "Upload First Attempt"}
                </Button>
              </div>
            </Card>
          ) : (
            <div className="space-y-6">
              {groupAttemptsByMonth(attempts).map(([monthYear, monthAttempts]) => (
                <div key={monthYear} className="space-y-4">
                  {/* Month/Year Header */}
                  <h2 className="text-lg font-medium text-foreground">
                    {monthYear}
                  </h2>
                  
                  {/* Video Cards for this month */}
                  <div className="space-y-3">
                    {monthAttempts.map((attempt) => (
                      <div key={attempt.id} className="bg-white rounded-[8px] border border-gray-200 p-4 hover:bg-gray-50/50 transition-colors">
                        <div className="flex items-start gap-3">
                          {/* Video Thumbnail/Icon */}
                          <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                            <VideoIcon className="w-5 h-5 text-gray-400" />
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <h3 className="font-semibold text-sm text-gray-900 truncate">
                                {attempt.trick_name || 'Untitled Trick'}
                              </h3>
                              <Badge 
                                variant={
                                  attempt.status.toLowerCase() === 'completed' || attempt.status.toLowerCase() === 'reviewed'
                                    ? 'completed' 
                                    : attempt.status.toLowerCase() === 'processing' 
                                      ? 'processing'
                                      : 'pending'
                                }
                                className="flex-shrink-0 pointer-events-none"
                              >
                                {attempt.status.toLowerCase() === 'reviewed' ? 'Completed' : attempt.status}
                              </Badge>
                            </div>
                            
                            <p className="text-xs text-gray-600 mb-2">
                              {formatTimeAgo(attempt.created_at)}
                            </p>

                            {attempt.status === 'completed' && attempt.feedback && (
                              <p className="text-sm text-gray-600 mb-3">
                                {attempt.feedback.length > 90 ? attempt.feedback.substring(0, 90) + "..." : attempt.feedback}
                              </p>
                            )}

                            {attempt.status === 'completed' && !attempt.feedback && (
                              <p className="text-sm text-gray-600 mb-3">
                                Great progress on your {attempt.trick_name?.toLowerCase()}! Focus on keeping your shoulders aligned.
                              </p>
                            )}

                            {attempt.status === 'processing' && (
                              <p className="text-sm text-gray-600 mb-3">
                                We're reviewing your technique
                              </p>
                            )}

                            <div className="flex items-center justify-between">
                              {getScore(attempt.analysis_data) && (
                                <span className="text-sm font-medium text-gray-900">
                                  Score: {getScore(attempt.analysis_data)}/10
                                </span>
                              )}
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => onViewDetails(attempt.id)}
                                className="p-0 h-auto font-medium text-sm ml-auto text-gray-600 hover:text-gray-900"
                              >
                                View Details
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {/* Disclaimer */}
          <Disclaimer className="mt-6">
            Your videos are stored in the cloud for up to 180 days.
          </Disclaimer>
        </div>
    </>
  );
};