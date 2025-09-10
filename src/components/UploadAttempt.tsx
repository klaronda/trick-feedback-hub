import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, VideoIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface UploadAttemptProps {
  onUploadSuccess: (attemptId: string) => void;
  userPlan?: { plan_name: string | null; is_subscribed: boolean } | null;
}

export const UploadAttempt = ({ onUploadSuccess, userPlan }: UploadAttemptProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [trickName, setTrickName] = useState("");
  const { toast } = useToast();

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
        description: "Please enter a trick name",
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);
    
    try {
      // Ensure user is authenticated
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('You must be logged in to upload.');
      }

      // STEP 1: Count this user's uploads in the current month
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { count, error: countError } = await supabase
        .from('trick_attempts')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', startOfMonth.toISOString());

      if (countError) {
        console.error('Error counting uploads', countError);
        toast({
          title: 'Could not verify usage limits',
          description: 'Try again later.',
          variant: 'destructive'
        });
        return;
      }

      // STEP 2: Block if over limit (skip for Pro)
      const isPro = userPlan?.plan_name === 'pro' || userPlan?.is_subscribed;
      const limit = 3; // Free users allowed 3 uploads/month
      if (!isPro && (count ?? 0) >= limit) {
        toast({
          title: 'Upload limit reached',
          description: "You've reached your upload limit for this month. Upgrade to Pro for more uploads.",
          variant: 'destructive'
        });
        return;
      }

      // Upload video to storage (folder = user id to satisfy RLS)
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('videos')
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      // Insert row into trick_attempts with user_id for RLS
      const { data: attemptData, error: insertError } = await supabase
        .from('trick_attempts')
        .insert({
          user_id: user.id,
          trick_name: trickName.trim(),
          video_path: filePath,
          status: 'Pending'
        })
        .select()
        .single();

      if (insertError) {
        throw insertError;
      }

      // Trigger edge function for video analysis
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const authToken = session?.access_token || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV6a3Rxbnphd2JlbWpodm5hd210Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcxNzE1NzksImV4cCI6MjA3Mjc0NzU3OX0.Qy9sKQJiGGAgVYhsPQ-Dbph11OBKV3fCtULwsUvyULA';
        
        await fetch('https://ezktqnzawbemjhvnawmt.supabase.co/functions/v1/analyze-video', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          },
          body: JSON.stringify({
            attempt_id: attemptData.id,
            video_path: attemptData.video_path,
            user_id: user?.id,
            trick_name: attemptData.trick_name
          })
        });
      } catch (apiError) {
        console.error('Edge function call failed:', apiError);
        // Don't throw - upload was successful, analysis failure is secondary
      }

      toast({
        title: "Upload successful!",
        description: "Your trick attempt has been saved and is being analyzed."
      });

      setTrickName("");
      onUploadSuccess(attemptData.id);
      
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

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Upload Trick Attempt</h1>
        <p className="text-muted-foreground">
          Record your skateboarding trick and save it for analysis
        </p>
      </div>

      <Card className="p-6 space-y-6">
        <div className="space-y-2">
          <Label htmlFor="trick-name">Trick Name</Label>
          <Input
            id="trick-name"
            value={trickName}
            onChange={(e) => setTrickName(e.target.value)}
            placeholder="e.g., Kickflip, Ollie, Heelflip..."
            disabled={isUploading}
          />
        </div>

        <Card 
          className={`p-8 border-2 border-dashed transition-all ${
            isDragging 
              ? 'border-primary bg-primary/5' 
              : 'border-muted-foreground/25 hover:border-primary/50'
          }`}
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onDragEnter={() => setIsDragging(true)}
          onDragLeave={() => setIsDragging(false)}
        >
          <div className="flex flex-col items-center justify-center text-center space-y-4">
            <div className="p-4 rounded-full bg-primary/10">
              {isUploading ? (
                <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
              ) : (
                <VideoIcon className="w-8 h-8 text-primary" />
              )}
            </div>
            
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">
                {isUploading ? 'Uploading...' : 'Upload Video File'}
              </h3>
              <p className="text-muted-foreground">
                Drag and drop your video here, or click to browse
              </p>
            </div>

            <Button 
              disabled={isUploading || !trickName.trim()}
              onClick={() => document.getElementById('video-input')?.click()}
              className="flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              Choose Video
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
      </Card>
    </div>
  );
};