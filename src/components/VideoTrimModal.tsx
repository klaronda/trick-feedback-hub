import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Play, AlertCircle } from "lucide-react";

interface VideoTrimModalProps {
  isOpen: boolean;
  onClose: () => void;
  file: File;
  onTrimComplete: (trimmedFile: File) => void;
}

export const VideoTrimModal = ({ isOpen, onClose, file, onTrimComplete }: VideoTrimModalProps) => {
  const [duration, setDuration] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(10);
  const [isValid, setIsValid] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string>("");
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file);
      setVideoUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [file]);

  useEffect(() => {
    const selectedDuration = endTime - startTime;
    setIsValid(selectedDuration <= 10 && selectedDuration > 0);
  }, [startTime, endTime]);

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      const videoDuration = videoRef.current.duration;
      setDuration(videoDuration);
      setEndTime(Math.min(10, videoDuration));
    }
  };

  const handleTrim = async () => {
    // For now, we'll just pass the original file through
    // In a real implementation, you'd use FFmpeg or similar to actually trim
    onTrimComplete(file);
    onClose();
  };

  const formatTime = (seconds: number) => {
    return `${Math.floor(seconds)}s`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-white rounded-2xl p-6 space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Trim Your Video</h2>
          <p className="text-gray-600 text-sm">
            Your video is {duration.toFixed(1)} seconds. Please trim it to 10 seconds or less.
          </p>
        </div>

        <div className="bg-gray-900 rounded-xl aspect-video flex items-center justify-center relative overflow-hidden">
          {videoUrl ? (
            <video
              ref={videoRef}
              src={videoUrl}
              onLoadedMetadata={handleLoadedMetadata}
              className="w-full h-full object-cover"
              muted
            />
          ) : (
            <div className="text-center text-white">
              <Play className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm opacity-75">Video Preview</p>
              <p className="text-xs opacity-50">{file.name}</p>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-center text-sm text-gray-600">
            <span>Trim Selection</span>
            <span className="font-medium">{(endTime - startTime).toFixed(1)}s selected</span>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs text-gray-500">
              <span>Start: {formatTime(startTime)}</span>
              <span>End: {formatTime(endTime)}</span>
            </div>
            
            <div className="relative">
              <div className="w-full h-2 bg-gray-200 rounded-full">
                <div 
                  className="h-full bg-gray-900 rounded-full"
                  style={{
                    marginLeft: `${(startTime / duration) * 100}%`,
                    width: `${((endTime - startTime) / duration) * 100}%`
                  }}
                />
              </div>
              
              <input
                type="range"
                min={0}
                max={duration}
                step={0.1}
                value={startTime}
                onChange={(e) => setStartTime(Number(e.target.value))}
                className="absolute top-0 w-full h-2 opacity-0 cursor-pointer"
              />
              <input
                type="range"
                min={0}
                max={duration}
                step={0.1}
                value={endTime}
                onChange={(e) => setEndTime(Number(e.target.value))}
                className="absolute top-0 w-full h-2 opacity-0 cursor-pointer"
              />
            </div>
          </div>

          {!isValid && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl">
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
              <div className="text-sm">
                <p className="text-red-800 font-medium">Selection must be 10 seconds or less.</p>
                <p className="text-red-600">Current: {(endTime - startTime).toFixed(1)}s</p>
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <Button
            onClick={onClose}
            variant="outline"
            className="flex-1 rounded-xl border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </Button>
          <Button
            onClick={handleTrim}
            disabled={!isValid}
            className="flex-1 bg-gray-900 hover:bg-gray-800 text-white rounded-xl"
          >
            Upload Trimmed Video
          </Button>
        </div>
      </Card>
    </div>
  );
};