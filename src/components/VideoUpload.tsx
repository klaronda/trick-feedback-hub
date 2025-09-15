import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Upload, VideoIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useUploadGuard } from "@/hooks/useUploadGuard";

interface VideoUploadProps {
  onUploadSuccess: (videoPath: string, file: File) => void;
}

export const VideoUpload = ({ onUploadSuccess }: VideoUploadProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const { handleServerInsertError } = useUploadGuard();
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
    } catch (error: any) {
      console.error('Upload error:', error);
      
      // Handle server rejection and map to upgrade UI
      const { handleServerInsertError } = useUploadGuard();
      const handled = handleServerInsertError(error);
      
      if (!handled) {
        toast({
          title: "Upload failed",
          description: "Something went wrong. Please try again.",
          variant: "destructive"
        });
      }
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
      className={`p-8 border-2 border-dashed transition-all bg-white ${
        isDragging 
          ? 'border-gray-900 bg-gray-50' 
          : 'border-gray-300 hover:border-gray-400'
      }`}
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
      onDragEnter={() => setIsDragging(true)}
      onDragLeave={() => setIsDragging(false)}
    >
      <div className="flex flex-col items-center justify-center text-center space-y-4">
        <div className="p-4 rounded-full bg-gray-100">
          {isUploading ? (
            <div className="animate-spin w-8 h-8 border-2 border-gray-900 border-t-transparent rounded-full" />
          ) : (
            <VideoIcon className="w-8 h-8 text-gray-900" />
          )}
        </div>
        
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-gray-900">
            {isUploading ? 'Uploading...' : 'Upload Your Trick Attempt'}
          </h3>
          <p className="text-gray-600">
            Drag and drop your video here, or click to browse
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <Button 
            disabled={isUploading}
            onClick={() => document.getElementById('video-input')?.click()}
            className="bg-gray-900 hover:bg-gray-800 text-white font-medium"
          >
            <Upload className="w-4 h-4 mr-2" />
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