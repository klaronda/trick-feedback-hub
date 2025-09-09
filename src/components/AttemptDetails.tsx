import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface TrickAttempt {
  id: string;
  trick_name: string | null;
  status: string;
  created_at: string;
  feedback: string | null;
  video_path: string;
  processed_at: string | null;
  analysis_data: any;
}

interface AttemptDetailsProps {
  attemptId: string;
  onBack: () => void;
}

export const AttemptDetails = ({ attemptId, onBack }: AttemptDetailsProps) => {
  const [attempt, setAttempt] = useState<TrickAttempt | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [videoUrl, setVideoUrl] = useState<string>("");
  const { toast } = useToast();

  useEffect(() => {
    fetchAttemptDetails();
  }, [attemptId]);

  // Real-time updates for attempt changes
  useEffect(() => {
    if (!attemptId) return;

    const channel = supabase
      .channel('attempt-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'trick_attempts',
          filter: `id=eq.${attemptId}`
        },
        (payload) => {
          console.log('Attempt updated via realtime:', payload);
          fetchAttemptDetails();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [attemptId]);

  const handleReprocess = async () => {
    if (!attempt) return;

    try {
      // Reset status to pending
      const { error: updateError } = await supabase
        .from('trick_attempts')
        .update({ 
          status: 'Pending',
          feedback: null,
          processed_at: null
        })
        .eq('id', attemptId);

      if (updateError) throw updateError;

      // Trigger reanalysis
      await fetch('https://ezktqnzawbemjhvnawmt.supabase.co/functions/v1/analyze-video', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV6a3Rxbnphd2JlbWpodm5hd210Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcxNzE1NzksImV4cCI6MjA3Mjc0NzU3OX0.Qy9sKQJiGGAgVYhsPQ-Dbph11OBKV3fCtULwsUvyULA'}`
        },
        body: JSON.stringify({
          attempt_id: attempt.id,
          video_path: attempt.video_path,
          trick_name: attempt.trick_name
        })
      });

      toast({
        title: "Reprocessing started",
        description: "Your video is being analyzed again."
      });

      // Refresh the data
      fetchAttemptDetails();
    } catch (error) {
      console.error('Reprocess error:', error);
      toast({
        title: "Reprocess failed",
        description: "Failed to start reprocessing. Please try again.",
        variant: "destructive"
      });
    }
  };

  const addTag = async (tag: string) => {
    if (!attempt) return;

    try {
      const currentTags = (attempt.analysis_data as any)?.tags || [];
      const newTags = currentTags.includes(tag) 
        ? currentTags.filter((t: string) => t !== tag)
        : [...currentTags, tag];

      const updateData: any = { 
        analysis_data: { 
          ...(attempt.analysis_data || {}), 
          tags: newTags 
        }
      };

      const { error } = await supabase
        .from('trick_attempts')
        .update(updateData)
        .eq('id', attemptId);

      if (error) throw error;

      fetchAttemptDetails();
    } catch (error) {
      console.error('Tag error:', error);
      toast({
        title: "Tag update failed",
        description: "Failed to update tags. Please try again.",
        variant: "destructive"
      });
    }
  };

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

      setAttempt({
        ...data,
        processed_at: (data as any).processed_at || null,
        analysis_data: (data as any).analysis_data || {}
      });

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

  const formatReviewDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const commonTags = [
    { emoji: '🦶', label: "Didn't pop" },
    { emoji: '📐', label: "Off balance" },
    { emoji: '🤷', label: "Not sure what went wrong" },
    { emoji: '⚡', label: "Too fast" },
    { emoji: '🐌', label: "Too slow" },
    { emoji: '🎯', label: "Wrong timing" }
  ];

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
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">Status</h3>
                <Badge variant="outline" className={getStatusColor(attempt.status)}>
                  {getStatusEmoji(attempt.status)} {attempt.status}
                </Badge>
              </div>
              <Button variant="outline" onClick={handleReprocess}>
                Reprocess Video
              </Button>
            </div>
            
            {attempt.feedback && (
              <div className="space-y-3">
                <h3 className="text-lg font-semibold">Feedback</h3>
                <div className="p-4 bg-muted rounded-lg space-y-3">
                  <p className="whitespace-pre-wrap text-base">{attempt.feedback}</p>
                  {attempt.processed_at && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground border-t pt-3">
                      <span>🕒</span>
                      <span>Reviewed on {formatReviewDate(attempt.processed_at)}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="space-y-3">
              <h3 className="text-lg font-semibold">Tag Issues</h3>
              <div className="flex flex-wrap gap-2">
                {commonTags.map((tag) => {
                  const isSelected = (attempt.analysis_data?.tags || []).includes(tag.label);
                  return (
                    <Button
                      key={tag.label}
                      variant={isSelected ? "default" : "outline"}
                      size="sm"
                      onClick={() => addTag(tag.label)}
                      className="flex items-center gap-2"
                    >
                      <span>{tag.emoji}</span>
                      <span>{tag.label}</span>
                    </Button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};