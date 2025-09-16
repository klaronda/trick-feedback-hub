import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Upload, X, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { VideoTrimModal } from "./VideoTrimModal";

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess: (attemptId: string) => void;
  userPlan?: { plan_name: string | null; is_subscribed: boolean } | null;
}

const TRICK_SUGGESTIONS = [
  "Kickflip", "Heelflip", "Ollie", "Pop Shuvit", "Frontside 180", 
  "Backside 180", "Tre Flip", "Varial Flip", "Hardflip", "Inward Heelflip",
  "Frontside Shuvit", "Backside Flip", "Varial Heel", "Nollie", "Fakie Ollie"
];

const NOTES_PLACEHOLDERS = [
  "I keep landing with one foot off the board...",
  "Having trouble with the timing on this one...",
  "My board keeps spinning too much...",
  "I think I'm not committing fully...",
  "The landing feels awkward every time...",
  "I can't seem to get enough height...",
  "My foot placement might be wrong...",
  "This trick feels inconsistent..."
];

export const UploadModal = ({ isOpen, onClose, onUploadSuccess, userPlan }: UploadModalProps) => {
  const [trickName, setTrickName] = useState("");
  const [notes, setNotes] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showTrimModal, setShowTrimModal] = useState(false);
  const [notesPlaceholder, setNotesPlaceholder] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      // Set random placeholder when modal opens
      const randomPlaceholder = NOTES_PLACEHOLDERS[Math.floor(Math.random() * NOTES_PLACEHOLDERS.length)];
      setNotesPlaceholder(randomPlaceholder);
      setTrickName("");
      setNotes("");
      setSelectedFile(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (trickName.length > 0) {
      const filtered = TRICK_SUGGESTIONS.filter(trick => 
        trick.toLowerCase().includes(trickName.toLowerCase())
      ).slice(0, 5);
      setSuggestions(filtered);
      setShowSuggestions(filtered.length > 0 && trickName !== filtered[0]);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [trickName]);

  const checkVideoDuration = (file: File): Promise<number> => {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.onloadedmetadata = () => {
        window.URL.revokeObjectURL(video.src);
        resolve(video.duration);
      };
      video.src = URL.createObjectURL(file);
    });
  };

  const handleFileSelect = async (file: File) => {
    if (!file.type.startsWith('video/')) {
      toast({
        title: "Invalid file type",
        description: "Please select a video file",
        variant: "destructive"
      });
      return;
    }

    if (!trickName.trim()) {
      toast({
        title: "Trick name required",
        description: "Please enter what trick you're practicing",
        variant: "destructive"
      });
      return;
    }

    const duration = await checkVideoDuration(file);
    
    if (duration > 10) {
      setSelectedFile(file);
      setShowTrimModal(true);
      return;
    }

    await uploadVideo(file);
  };

  const uploadVideo = async (file: File) => {
    setIsUploading(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Authentication required",
          description: "You must be logged in to upload.",
          variant: "destructive"
        });
        return;
      }

      // Check quota for free users
      if (userPlan?.plan_name === 'free') {
        const now = new Date();
        const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        const { count, error: countError } = await supabase
          .from('trick_attempts')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .gte('created_at', firstOfMonth.toISOString())
          .lt('created_at', nextMonth.toISOString());

        if (!countError && (count ?? 0) >= 5) {
          toast({
            title: "Upload limit reached",
            description: "You've reached your 5 free uploads for this month. Upgrade to Pro for unlimited uploads.",
            variant: "destructive"
          });
          return;
        }
      }

      // Upload video to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('videos')
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      // Use RPC function to insert attempt
      const { data: insertResult, error: insertError } = await supabase.rpc('insert_trick_attempt', {
        user_id: user.id,
        video_path: filePath,
        trick_name: trickName.trim()
      });

      if (insertError) {
        throw insertError;
      }

      const newAttempt = insertResult?.[0];
      if (!newAttempt?.id) {
        throw new Error('Failed to get attempt ID from insert');
      }

      // Add notes if provided
      if (notes.trim()) {
        await supabase
          .from('trick_attempts')
          .update({ coach_notes: notes.trim() })
          .eq('id', String(newAttempt.id));
      }

      // Trigger analysis edge function
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const authToken = session?.access_token;
        
        await fetch('https://ezktqnzawbemjhvnawmt.supabase.co/functions/v1/analyze-video', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          },
          body: JSON.stringify({
            attempt_id: newAttempt.id,
            video_path: filePath,
            user_id: user?.id,
            trick_name: trickName.trim()
          })
        });
      } catch (apiError) {
        console.error('Edge function call failed:', apiError);
      }

      toast({
        title: "Upload successful!",
        description: "Your trick attempt has been saved and is being analyzed."
      });

      onUploadSuccess(String(newAttempt.id));
      onClose();
      
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload failed",
        description: "Something went wrong. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const selectSuggestion = (suggestion: string) => {
    setTrickName(suggestion);
    setShowSuggestions(false);
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex items-center justify-center p-4">
        <Card className="w-full max-w-sm md:max-w-4xl bg-white rounded-[8px] border border-gray-200 max-h-[90vh] overflow-y-auto">
          <div className="sticky top-0 bg-white rounded-t-[8px] border-b border-gray-100 p-4 pb-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Upload Video</h2>
              <Button
                onClick={onClose}
                variant="ghost"
                size="sm"
                className="p-1 h-auto text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
            <p className="text-gray-600 text-sm mt-1">Tell us what trick you're working on.</p>
          </div>

          <div className="p-4 pt-3 space-y-6">
            <div className="space-y-2 relative">
              <Label htmlFor="trick-name" className="text-gray-900 font-medium">
                What trick are you practicing?
              </Label>
              <Input
                id="trick-name"
                value={trickName}
                onChange={(e) => setTrickName(e.target.value)}
                placeholder="Start typing a trick name..."
                disabled={isUploading}
                className="rounded-xl border-gray-300 focus:border-gray-900 focus:ring-gray-900"
                onFocus={() => setShowSuggestions(suggestions.length > 0)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              />
              
              {showSuggestions && suggestions.length > 0 && (
                <Card className="absolute top-full left-0 right-0 z-50 bg-white border border-gray-200 rounded-xl shadow-lg mt-1 max-h-40 overflow-y-auto">
                  {suggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      onClick={() => selectSuggestion(suggestion)}
                      className="w-full text-left px-4 py-2 hover:bg-gray-50 first:rounded-t-xl last:rounded-b-xl"
                    >
                      <span className="text-gray-900">{suggestion}</span>
                    </button>
                  ))}
                </Card>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes" className="text-gray-900 font-medium">
                Any notes you want to add?
              </Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={notesPlaceholder}
                disabled={isUploading}
                className="rounded-xl border-gray-300 focus:border-gray-900 focus:ring-gray-900 min-h-[80px] resize-none"
              />
            </div>

            <div className="space-y-3">
              <h3 className="font-medium text-gray-900">Video Requirements</h3>
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-600" />
                  <span>Maximum 10 seconds long</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-600" />
                  <span>Supported formats: MP4, MOV, AVI, WMV</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-600" />
                  <span>Works with iOS, Android, macOS, or Windows</span>
                </div>
              </div>
            </div>

            <Button 
              onClick={() => document.getElementById('video-input')?.click()}
              disabled={isUploading || !trickName.trim()}
              className="w-full h-12 bg-gray-900 hover:bg-gray-800 text-white rounded-xl font-medium"
            >
              <Upload className="w-5 h-5 mr-2" />
              {isUploading ? "Uploading..." : "Select Video File"}
            </Button>

            <input
              id="video-input"
              type="file"
              accept="video/*"
              onChange={handleFileInput}
              className="hidden"
            />
          </div>
        </Card>
      </div>

      <VideoTrimModal
        isOpen={showTrimModal}
        onClose={() => setShowTrimModal(false)}
        file={selectedFile!}
        onTrimComplete={(trimmedFile) => {
          setShowTrimModal(false);
          uploadVideo(trimmedFile);
        }}
      />
    </>
  );
};