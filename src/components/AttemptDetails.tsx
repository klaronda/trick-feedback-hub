import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ChevronLeft, RotateCcw, Trash2, Play } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { usePersonalizedCoach } from "@/hooks/usePersonalizedCoach";
import { ConfirmationModal } from "./ConfirmationModal";

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
  const [notes, setNotes] = useState<string>("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [coachQuestion, setCoachQuestion] = useState<string>("");
  const [coachMessages, setCoachMessages] = useState<Array<{role: 'user' | 'coach', text: string, timestamp: Date}>>([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const { sendMessage: sendCoachMessage, loading: coachLoading } = usePersonalizedCoach();
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
          'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV6a3Rxbnphd2JlbWpodm5hd210Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcxNzE1NzksImV4cCI6MjA3Mjc0NzU3OX0.Qy9sKQJiGGAgVYhsPQ-Dbph11OBKV3fCtULwsUvyULA`
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

  const handleCoachMessage = async () => {
    if (!coachQuestion.trim()) {
      toast({
        title: "Please enter a question",
        description: "Type your question about the trick.",
        variant: "destructive"
      });
      return;
    }

    // Add user message
    const userMessage = { role: 'user' as const, text: coachQuestion, timestamp: new Date() };
    setCoachMessages(prev => [...prev, userMessage]);
    
    // Clear input
    const question = coachQuestion;
    setCoachQuestion("");

    try {
      const response = await sendCoachMessage(question, 'trick_analysis');
      if (response) {
        const coachResponse = { 
          role: 'coach' as const, 
          text: response.response, 
          timestamp: new Date() 
        };
        setCoachMessages(prev => [...prev, coachResponse]);
      }
    } catch (error) {
      console.error('Coach message error:', error);
      setCoachQuestion(question); // Restore input on error
    }
  };

  const handleDelete = async () => {
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

      // Load notes
      setNotes((data as any).coach_notes || "");

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

  const formatTimestamp = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'numeric',
      day: 'numeric',
      year: '2-digit'
    }) + ' | ' + date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).toUpperCase();
  };

  // Generate focus areas from feedback
  const generateFocusAreas = (feedback: string | null): string[] => {
    if (!feedback) return [];
    
    const keywords = [
      { terms: ['pop', 'jumping', 'jump'], area: 'Pop' },
      { terms: ['balance', 'stable', 'steady'], area: 'Balance' },
      { terms: ['foot', 'feet', 'positioning'], area: 'Foot Placement' },
      { terms: ['shoulder', 'shoulders'], area: 'Shoulders' },
      { terms: ['confidence', 'comfortable'], area: 'Confidence' },
      { terms: ['timing', 'time'], area: 'Timing' },
      { terms: ['flick', 'flip'], area: 'Flick' },
      { terms: ['stance', 'position'], area: 'Stance' }
    ];
    
    const areas: string[] = [];
    const lowerFeedback = feedback.toLowerCase();
    
    for (const keyword of keywords) {
      if (keyword.terms.some(term => lowerFeedback.includes(term)) && areas.length < 3) {
        areas.push(keyword.area);
      }
    }
    
    return areas.length > 0 ? areas : ['Technique'];
  };

  const thoughtStarters = [
    "How can I improve my pop technique?",
    "What's the best way to practice balance?",
    "Help me with my foot positioning",
    "How do I build confidence with this trick?",
    "What should I focus on next?"
  ];

  const isPro = userPlan?.plan_name === 'pro';

  if (isLoading) {
    return (
      <div className="space-y-6">
          <div className="flex items-center justify-between">
            <button 
              onClick={onBack} 
              className="p-2 hover:bg-gray-100 rounded-md transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div className="flex-1 ml-4">
              <h1 className="text-lg font-medium text-gray-900">Loading...</h1>
            </div>
          </div>
          <div className="text-center py-12">
            <div className="animate-spin w-8 h-8 border-2 border-gray-900 border-t-transparent rounded-full mx-auto" />
            <p className="text-gray-600 mt-4">Loading attempt details...</p>
          </div>
      </div>
    );
  }

  if (!attempt) {
    return (
      <div className="space-y-6">
          <div className="flex items-center justify-between">
            <button 
              onClick={onBack} 
              className="p-2 hover:bg-gray-100 rounded-md transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div className="flex-1 ml-4">
              <h1 className="text-lg font-medium text-gray-900">Attempt Not Found</h1>
            </div>
          </div>
          <Card className="p-12 text-center bg-white border-gray-200">
            <p className="text-gray-600">This attempt could not be found.</p>
          </Card>
      </div>
    );
  }

  const focusAreas = generateFocusAreas(attempt.feedback);

  return (
    <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <button 
            onClick={onBack} 
            className="p-2 hover:bg-gray-100 rounded-md transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
          
          <div className="flex-1 text-left ml-4">
            <h1 className="text-lg font-medium text-gray-900">
              {attempt.trick_name || 'Unnamed Trick'}
            </h1>
            <p className="text-xs text-gray-600 mt-1">
              {formatTimestamp(attempt.created_at)}
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={handleReprocess}
              className="p-2 hover:bg-gray-100 rounded-md transition-colors"
            >
              <RotateCcw className="w-5 h-5 text-gray-600" />
            </button>
            <button
              onClick={() => setShowDeleteModal(true)}
              disabled={isDeleting}
              className="p-2 hover:bg-red-50 hover:text-red-600 rounded-md transition-colors text-gray-600"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Video Card */}
        <Card className="bg-white border-gray-200">
          <CardContent className="p-6">
            <div className="relative bg-black rounded overflow-hidden mb-6">
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
                <div className="w-full aspect-video flex items-center justify-center bg-gray-800">
                  <div className="text-center">
                    <Play className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-400">Loading video...</p>
                  </div>
                </div>
              )}
            </div>
            <div>
              <textarea
                placeholder="Any notes you want to add?"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full text-sm text-gray-600 bg-transparent border-none resize-none outline-none min-h-[40px] placeholder-gray-400"
                rows={2}
              />
            </div>
          </CardContent>
        </Card>

        {/* Coach Feedback Card */}
        <Card className="bg-white border-gray-200">
          <CardContent className="p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Coach Feedback</h2>
            
            {attempt.status.toLowerCase() === 'pending' ? (
              <div className="text-center py-8 space-y-4">
                <div className="animate-spin w-8 h-8 border-2 border-gray-900 border-t-transparent rounded-full mx-auto" />
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-gray-900">Analyzing your trick...</h3>
                  <p className="text-gray-600">
                    Our AI is reviewing your video. This usually takes a few minutes.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {attempt.feedback ? (
                  <>
                    <p className="text-sm text-gray-600 leading-relaxed">{attempt.feedback}</p>
                    
                    {focusAreas.length > 0 && (
                      <div className="mt-4">
                        <p className="text-sm font-medium text-gray-900 mb-2">Areas to Focus On</p>
                        <div className="flex flex-wrap gap-2">
                          {focusAreas.map((area, index) => (
                            <Badge 
                              key={index}
                              className="h-6 px-2 text-xs font-medium rounded border border-[var(--warning-border)] bg-[var(--warning-bg)] text-[var(--warning-text)]"
                            >
                              {area}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-gray-600">No feedback available yet.</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Coach Chat Card - Pro Only */}
        {isPro && (
          <Card className="bg-white border-gray-200">
            <CardContent className="p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-2">Want more help?</h2>
              <p className="text-gray-600 mb-4">Chat with Coach about your pop, timing, flick and more.</p>
              
              {coachMessages.length > 0 && (
                <div className="space-y-3 mb-4 max-h-64 overflow-y-auto">
                  {coachMessages.map((message, index) => (
                    <div
                      key={index}
                      className={`p-3 rounded-lg max-w-[80%] ${
                        message.role === 'user' 
                          ? 'bg-gray-900 text-white ml-auto' 
                          : 'bg-gray-100 text-gray-900'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{message.text}</p>
                      <p className={`text-xs mt-1 ${
                        message.role === 'user' 
                          ? 'text-gray-300' 
                          : 'text-gray-500'
                      }`}>
                        {message.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                  ))}
                </div>
              )}
              
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    What do you need more help with?
                  </label>
                  <Input
                    value={coachQuestion}
                    onChange={(e) => setCoachQuestion(e.target.value)}
                    placeholder={thoughtStarters[Math.floor(Math.random() * thoughtStarters.length)]}
                    className="border-gray-200 text-gray-900"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleCoachMessage();
                      }
                    }}
                  />
                </div>
                
                <Button 
                  onClick={handleCoachMessage}
                  disabled={coachLoading || !coachQuestion.trim()}
                  className="w-full bg-gray-900 hover:bg-gray-800 text-white"
                >
                  {coachLoading ? "Sending..." : "Send Message"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Delete Confirmation Modal */}
        <ConfirmationModal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={handleDelete}
          title="Are you sure?"
          message={`This will permanently delete your ${attempt?.trick_name || 'trick'} attempt and all its data. This will not reset your monthly upload count.`}
          confirmText="Yes"
          cancelText="No"
          isDestructive={true}
        />
    </div>
  );
};