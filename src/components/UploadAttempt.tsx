import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, VideoIcon, Crown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface UploadAttemptProps {
  onUploadSuccess: (attemptId: string) => void;
  userPlan?: { plan_name: string | null; is_subscribed: boolean } | null;
}

export const UploadAttempt = ({ onUploadSuccess, userPlan }: UploadAttemptProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [trickName, setTrickName] = useState("");
  const [showQuotaModal, setShowQuotaModal] = useState(false);
  const [isUpgrading, setIsUpgrading] = useState(false);
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

    // Get current user and pre-check monthly quota before uploading large files
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({
        title: "Authentication required",
        description: "You must be logged in to upload.",
        variant: "destructive"
      });
      return;
    }

    // If on Free plan, check current month's upload count to gate early
    try {
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
          setShowQuotaModal(true);
          return;
        }
      }
    } catch (e) {
      // If quota pre-check fails for any reason, proceed to rely on RPC enforcement below
      console.warn('Quota pre-check failed, falling back to RPC enforcement', e);
    }

    setIsUploading(true);
    
    try {

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

      // Use the RPC function to insert and enforce quota
      const { error: insertError } = await supabase.rpc('insert_trick_attempt' as any, {
        _user_id: user.id,
        _video_path: filePath,
        _trick_name: trickName.trim()
      });

      if (insertError) {
        // Check for quota exceeded error (robust across message/details/hint and P0001 code)
        const errText = `${insertError.message ?? ''} ${insertError.details ?? ''} ${insertError.hint ?? ''}`;
        if (errText.includes('QUOTA_EXCEEDED') || insertError.code === 'P0001' || errText.includes('monthly upload limit reached')) {
          setShowQuotaModal(true);
          return;
        }
        throw insertError;
      }

      // Get the created attempt ID
      const { data: newAttempt, error: fetchError } = await supabase
        .from('trick_attempts')
        .select('id')
        .eq('user_id', user.id)
        .eq('video_path', filePath)
        .single();

      if (fetchError) {
        throw fetchError;
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
            attempt_id: newAttempt.id,
            video_path: filePath,
            user_id: user?.id,
            trick_name: trickName.trim()
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
      onUploadSuccess(newAttempt.id);
      
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

  const handleUpgrade = async () => {
    setIsUpgrading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({
          title: "Authentication required",
          description: "Please log in to upgrade",
          variant: "destructive"
        });
        return;
      }

      const { data, error } = await supabase.functions.invoke('create-checkout-session');
      
      if (error) {
        console.error('Error creating checkout session:', error);
        toast({
          title: "Upgrade failed",
          description: "Failed to create checkout session. Please try again.",
          variant: "destructive"
        });
        return;
      }

      if (data?.url) {
        window.open(data.url, '_blank');
        setShowQuotaModal(false);
      }
    } catch (error) {
      console.error('Upgrade error:', error);
      toast({
        title: "Upgrade failed",
        description: "Something went wrong. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsUpgrading(false);
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
      {showQuotaModal && (
        <Alert className="border-amber-200 bg-amber-50">
          <Crown className="h-4 w-4 text-amber-600" />
          <AlertTitle className="text-amber-800">Monthly upload limit reached</AlertTitle>
          <AlertDescription className="text-amber-700 space-y-3">
            <p>You've reached your 5 free uploads for this month. Upgrade to Pro to upload unlimited videos and unlock priority processing.</p>
            <div className="flex gap-2 pt-2">
              <Button 
                onClick={handleUpgrade}
                disabled={isUpgrading}
                className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
              >
                {isUpgrading ? "Processing..." : "Upgrade to Pro"}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setShowQuotaModal(false)}
                className="border-amber-300 text-amber-700 hover:bg-amber-100"
              >
                Maybe later
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}
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