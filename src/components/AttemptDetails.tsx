import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface TrickAttempt {
  id: string;
  trick_name: string | null;
  status: string;
  created_at: string;
  feedback: string | null;
  video_path: string;
}

interface AttemptDetailsProps {
  attemptId: string;
  onBack: () => void;
}

export const AttemptDetails = ({ attemptId, onBack }: AttemptDetailsProps) => {
  const [attempt, setAttempt] = useState<TrickAttempt | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string>("");
  const [feedback, setFeedback] = useState("");
  const [status, setStatus] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    fetchAttemptDetails();
  }, [attemptId]);

  // Auto-refresh when status is pending
  useEffect(() => {
    if (!attempt || attempt.status.toLowerCase() !== 'pending') return;
    
    const interval = setInterval(() => {
      fetchAttemptDetails();
    }, 10000); // Check every 10 seconds

    return () => clearInterval(interval);
  }, [attempt?.status]);

  const fetchAttemptDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('trick_attempts')
        .select('*')
        .eq('id', attemptId)
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (!data) {
        toast({
          title: "Attempt not found",
          description: "This attempt no longer exists",
          variant: "destructive"
        });
        return;
      }

      setAttempt(data);
      setFeedback(data.feedback || "");
      setStatus(data.status);

      // Get signed URL for private video (since bucket is private)
      const { data: urlData, error: urlError } = await supabase.storage
        .from('videos')
        .createSignedUrl(data.video_path, 3600); // 1 hour expiry
      
      if (urlError) {
        console.error('Error getting video URL:', urlError);
        toast({
          title: "Video loading error",
          description: "Unable to load video. Please try refreshing.",
          variant: "destructive"
        });
      } else {
        setVideoUrl(urlData.signedUrl);
      }

    } catch (error) {
      console.error('Error fetching attempt details:', error);
      toast({
        title: "Error loading attempt",
        description: "Failed to load attempt details",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateAttempt = async () => {
    if (!attempt) return;

    setIsUpdating(true);
    
    try {
      const { error } = await supabase
        .from('trick_attempts')
        .update({
          feedback: feedback.trim() || null,
          status: status
        })
        .eq('id', attemptId);

      if (error) {
        throw error;
      }

      toast({
        title: "Updated successfully!",
        description: "Attempt details have been saved."
      });

      // Refresh the attempt data
      await fetchAttemptDetails();

    } catch (error) {
      console.error('Error updating attempt:', error);
      toast({
        title: "Update failed",
        description: "Failed to save changes",
        variant: "destructive"
      });
    } finally {
      setIsUpdating(false);
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
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={onBack}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="text-3xl font-bold">Loading...</h1>
        </div>
        <div className="text-center py-12">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto" />
          <p className="text-muted-foreground mt-4">Loading attempt details...</p>
        </div>
      </div>
    );
  }

  if (!attempt) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={onBack}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="text-3xl font-bold">Attempt Not Found</h1>
        </div>
        <Card className="p-12 text-center">
          <p className="text-muted-foreground">This attempt could not be found.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={onBack}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">
            {attempt.trick_name || 'Unnamed Trick'}
          </h1>
          <p className="text-muted-foreground">
            Uploaded {formatDate(attempt.created_at)}
          </p>
        </div>
        <Badge variant="outline" className={getStatusColor(attempt.status)}>
          {getStatusEmoji(attempt.status)} {attempt.status}
        </Badge>
      </div>

      {/* Video Player */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Video</h2>
        <div className="relative bg-black rounded-lg overflow-hidden">
          {videoUrl ? (
            <video
              src={videoUrl}
              className="w-full aspect-video"
              controls
              preload="metadata"
              onError={(e) => {
                console.error('Video load error:', e);
                toast({
                  title: "Video playback error",
                  description: "Unable to play video. The file may be corrupted or in an unsupported format.",
                  variant: "destructive"
                });
              }}
            />
          ) : (
            <div className="w-full aspect-video flex items-center justify-center bg-muted">
              <p className="text-muted-foreground">Loading video...</p>
            </div>
          )}
        </div>
      </Card>

      {/* Status and Feedback */}
      <Card className="p-6 space-y-6">
        <h2 className="text-xl font-semibold">Analysis & Feedback</h2>
        
        {attempt.status.toLowerCase() === 'pending' ? (
          <div className="text-center py-8 space-y-4">
            <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto" />
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Analyzing your trick...</h3>
              <p className="text-muted-foreground">
                Our AI is reviewing your video. This usually takes a few minutes.
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <select
                  id="status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="Pending">Pending</option>
                  <option value="Reviewed">Reviewed</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="feedback">Feedback</Label>
              <Textarea
                id="feedback"
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Add your coaching feedback here..."
                rows={6}
                className="resize-none"
              />
            </div>

            <Button 
              onClick={handleUpdateAttempt}
              disabled={isUpdating}
              className="flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {isUpdating ? 'Saving...' : 'Save Changes'}
            </Button>
          </>
        )}
      </Card>
    </div>
  );
};