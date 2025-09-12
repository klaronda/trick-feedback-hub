import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Trash2 } from "lucide-react";
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
  coach_notes: string | null;
}

interface AttemptDetailsProps {
  attemptId: string;
  onBack: () => void;
  userPlan?: { plan_name: string | null; is_subscribed: boolean } | null;
}

export const AttemptDetails = ({ attemptId, onBack, userPlan }: AttemptDetailsProps) => {
  const [attempt, setAttempt] = useState<TrickAttempt | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [videoUrl, setVideoUrl] = useState<string>("");
  const [coachNotes, setCoachNotes] = useState<string>("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isSendingCoachMessage, setIsSendingCoachMessage] = useState(false);
  const [coachMessages, setCoachMessages] = useState<Array<{text: string, timestamp: Date}>>([]);
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

  const sendCoachMessage = async () => {
    if (!attempt || !coachNotes.trim() || selectedTags.length === 0) {
      toast({
        title: "Missing information",
        description: "Please select at least one improvement area and enter a question.",
        variant: "destructive"
      });
      return;
    }

    setIsSendingCoachMessage(true);
    try {
      // Add user message to the conversation
      const userMessage = { text: coachNotes, timestamp: new Date() };
      setCoachMessages(prev => [...prev, userMessage]);
      
      // TODO: Call the coach edge function here
      // For now, simulate a coach response
      setTimeout(() => {
        const coachResponse = { 
          text: "Thanks for your question! Based on your selected areas for improvement, here are some tips...", 
          timestamp: new Date() 
        };
        setCoachMessages(prev => [...prev, coachResponse]);
        setIsSendingCoachMessage(false);
      }, 2000);

      // Clear the input
      setCoachNotes("");

      toast({
        title: "Message sent",
        description: "Your question has been sent to the coach."
      });

    } catch (error) {
      console.error('Coach message send error:', error);
      toast({
        title: "Send failed", 
        description: "Failed to send message. Please try again.",
        variant: "destructive"
      });
      setIsSendingCoachMessage(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this attempt? This action cannot be undone.')) {
      return;
    }

    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('trick_attempts')
        .delete()
        .eq('id', attemptId);

      if (error) throw error;

      toast({
        title: "Attempt deleted",
        description: "The attempt has been removed successfully."
      });

      onBack();
    } catch (error) {
      console.error('Error deleting attempt:', error);
      toast({
        title: "Delete failed",
        description: "Failed to delete the attempt. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
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
        analysis_data: (data as any).analysis_data || {},
        coach_notes: (data as any).coach_notes || null
      });

      // Load coach notes
      setCoachNotes((data as any).coach_notes || "");

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

  const improvementTags = [
    { icon: '💥', label: "Pop" },
    { icon: '⚖️', label: "Balance" },
    { icon: '👣', label: "Foot Positioning" },
    { icon: '🦵', label: "Foot Motion" },
    { icon: '💪', label: "Confidence" },
    { icon: '🏒', label: "Shoulders" },
    { icon: '😌', label: "Comfort" },
    { icon: '🏃', label: "Body Motion" },
    { icon: '🤷', label: "Not Sure" }
  ];

  const isPro = userPlan?.plan_name === 'pro';
  
  console.log('AttemptDetails - userPlan:', userPlan);
  console.log('AttemptDetails - isPro:', isPro);

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
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={getStatusColor(attempt.status)}>
            {getStatusEmoji(attempt.status)} {attempt.status}
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDelete}
            disabled={isDeleting}
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
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

            {isPro ? (
              <div className="space-y-6">
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold">How do you want to improve?</h3>
                  <p className="text-muted-foreground">Select one or more to chat with a coach.</p>
                  <div className="flex flex-wrap gap-2">
                    {improvementTags.map((tag) => {
                      const isSelected = selectedTags.includes(tag.label);
                      return (
                        <Button
                          key={tag.label}
                          variant={isSelected ? "default" : "outline"}
                          size="sm"
                          onClick={() => toggleTag(tag.label)}
                          className="flex items-center gap-2"
                        >
                          <span>{tag.icon}</span>
                          <span>{tag.label}</span>
                        </Button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="text-lg font-semibold">Contact Coach</h3>
                  
                  {coachMessages.length > 0 && (
                    <div className="space-y-3 mb-4">
                      {coachMessages.map((message, index) => (
                        <div 
                          key={index}
                          className={`p-3 rounded-lg ${
                            index % 2 === 0 
                              ? 'bg-primary/10 ml-0 mr-8' // User messages
                              : 'bg-muted ml-8 mr-0'      // Coach messages
                          }`}
                        >
                          <p className="text-sm">{message.text}</p>
                          <span className="text-xs text-muted-foreground">
                            {message.timestamp.toLocaleTimeString()}
                          </span>
                        </div>
                      ))}
                      {isSendingCoachMessage && (
                        <div className="p-3 rounded-lg bg-muted ml-8 mr-0">
                          <div className="flex items-center gap-2">
                            <div className="animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full" />
                            <p className="text-sm">Coach is typing...</p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  
                  <Textarea
                    value={coachNotes}
                    onChange={(e) => setCoachNotes(e.target.value)}
                    placeholder={coachMessages.length > 0 ? "Asking another question..." : "Ask the coach a question..."}
                    className="min-h-[100px]"
                    disabled={selectedTags.length === 0}
                  />
                  <Button 
                    onClick={sendCoachMessage} 
                    variant="outline" 
                    size="sm"
                    disabled={!coachNotes.trim() || selectedTags.length === 0 || isSendingCoachMessage}
                  >
                    {isSendingCoachMessage ? "Sending..." : "Send"}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 bg-muted/50 rounded-lg border border-dashed">
                  <h3 className="text-lg font-semibold mb-2">Want to ask a coach a question?</h3>
                  <p className="text-muted-foreground mb-4">
                    Add a plan for just $5/month and get answers to improve your skating.
                  </p>
                  <Button 
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
                    className="bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    Go Pro
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
};