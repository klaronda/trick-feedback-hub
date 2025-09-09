import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PlanBadge } from "@/components/ui/PlanBadge";
import { Eye, Plus, VideoIcon, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

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
}

export const AttemptsList = ({ onViewDetails, onUploadNew, userPlan }: AttemptsListProps) => {
  const [attempts, setAttempts] = useState<TrickAttempt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
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
      toast({
        title: "Error loading attempts",
        description: "Failed to load your trick attempts",
        variant: "destructive"
      });
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
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to logout. Please try again.",
      });
    } else {
      toast({
        title: "Logged out",
        description: "You have been successfully logged out.",
      });
      navigate('/auth');
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">My Trick Attempts</h1>
        </div>
        <div className="text-center py-12">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto" />
          <p className="text-muted-foreground mt-4">Loading your attempts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold">My Trick Attempts</h1>
          {userPlan && <PlanBadge plan={userPlan.plan_name || 'free'} />}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
          <Button onClick={onUploadNew} className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Upload New
          </Button>
        </div>
      </div>

      {userPlan && !userPlan.is_subscribed && userPlan.plan_name === 'free' && (
        <Card className="p-4 bg-gradient-to-r from-amber-50 to-amber-100 border-amber-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-amber-800">Free Plan - Limited Features</h3>
              <p className="text-sm text-amber-700">Unlock unlimited uploads and advanced features</p>
            </div>
            <Button size="sm" className="bg-amber-600 hover:bg-amber-700">
              Upgrade to Pro
            </Button>
          </div>
        </Card>
      )}

      {attempts.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="space-y-4">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
              <VideoIcon className="w-8 h-8 text-muted-foreground" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">No attempts yet</h3>
              <p className="text-muted-foreground">
                Upload your first trick attempt to get started
              </p>
            </div>
            <Button onClick={onUploadNew}>Upload First Attempt</Button>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {attempts.map((attempt) => (
            <Card key={attempt.id} className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-semibold">
                      {attempt.trick_name || 'Unnamed Trick'}
                    </h3>
                    <Badge 
                      variant="outline" 
                      className={getStatusColor(attempt.status)}
                    >
                      {getStatusEmoji(attempt.status)} {attempt.status}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>{formatDate(attempt.created_at)}</span>
                    {attempt.feedback && (
                      <span>• Has feedback</span>
                    )}
                  </div>
                </div>

                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => onViewDetails(attempt.id)}
                  className="flex items-center gap-2"
                >
                  <Eye className="w-4 h-4" />
                  View Details
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};