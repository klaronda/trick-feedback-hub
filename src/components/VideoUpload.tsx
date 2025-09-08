import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Upload, VideoIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface VideoUploadProps {
  onUploadSuccess: (videoPath: string, file: File) => void;
}

export const VideoUpload = ({ onUploadSuccess }: VideoUploadProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
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

    setIsUploading(true);
    
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `tricks/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('videos')
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      onUploadSuccess(filePath, file);
      
      toast({
        title: "Video uploaded!",
        description: "Processing your trick attempt..."
      });
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
            {isUploading ? 'Uploading...' : 'Upload Your Trick Attempt'}
          </h3>
          <p className="text-muted-foreground">
            Drag and drop your video here, or click to browse
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <Button 
            disabled={isUploading}
            onClick={() => document.getElementById('video-input')?.click()}
            className="flex items-center gap-2"
          >
            <Upload className="w-4 h-4" />
            Choose Video
          </Button>
        </div>

        <input
          id="video-input"
          type="file"
          accept="video/*"
          onChange={handleFileInput}
          className="hidden"
        />
      </div>
    </Card>
  );
};