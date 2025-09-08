import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, RotateCcw, Play, Pause } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface ResultScreenProps {
  videoFile: File;
  videoPath: string;
  onUploadAnother: () => void;
  onBack: () => void;
}

const DUMMY_FEEDBACK = {
  title: "Your Trick Attempt",
  overall: "Good attempt! You're getting close to landing this trick consistently.",
  breakdown: [
    { aspect: "Pop", score: 85, feedback: "Strong pop from your back foot. Good height achieved." },
    { aspect: "Front Foot Flick", score: 70, feedback: "Your flick could be more crisp. Try sliding your foot faster." },
    { aspect: "Board Control", score: 60, feedback: "Work on leveling out the board in the air." },
    { aspect: "Landing", score: 45, feedback: "More commitment needed. Bend your knees and prepare for impact." }
  ],
  nextSteps: [
    "Practice the flick motion without jumping",
    "Work on timing - jump slightly later",
    "Film yourself from the side to see board rotation"
  ]
};

export const ResultScreen = ({ videoFile, videoPath, onUploadAnother, onBack }: ResultScreenProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string>("");

  useState(() => {
    // Create local URL for video preview
    const url = URL.createObjectURL(videoFile);
    setVideoUrl(url);
    
    return () => URL.revokeObjectURL(url);
  });

  const getScoreColor = (score: number) => {
    if (score >= 80) return "bg-green-100 text-green-800 border-green-200";
    if (score >= 60) return "bg-yellow-100 text-yellow-800 border-yellow-200";
    return "bg-red-100 text-red-800 border-red-200";
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={onBack}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="text-2xl font-bold">Trick Analysis</h1>
        </div>

        {/* Video Player */}
        <Card className="p-6">
          <div className="relative bg-black rounded-lg overflow-hidden">
            <video
              src={videoUrl}
              className="w-full aspect-video"
              controls
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
            />
          </div>
        </Card>

        {/* Feedback Card */}
        <Card className="p-6 space-y-6">
          <div>
            <h2 className="text-xl font-bold mb-2">{DUMMY_FEEDBACK.title}</h2>
            <p className="text-muted-foreground">{DUMMY_FEEDBACK.overall}</p>
          </div>

          {/* Breakdown Scores */}
          <div className="space-y-4">
            <h3 className="font-semibold">Technique Breakdown</h3>
            <div className="grid gap-4">
              {DUMMY_FEEDBACK.breakdown.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="font-medium">{item.aspect}</span>
                      <Badge variant="outline" className={getScoreColor(item.score)}>
                        {item.score}/100
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{item.feedback}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Next Steps */}
          <div className="space-y-3">
            <h3 className="font-semibold">Next Steps</h3>
            <ul className="space-y-2">
              {DUMMY_FEEDBACK.nextSteps.map((step, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <span className="flex-shrink-0 w-5 h-5 bg-primary text-primary-foreground rounded-full text-xs flex items-center justify-center mt-0.5">
                    {index + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ul>
          </div>
        </Card>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button onClick={onUploadAnother} className="flex-1">
            <RotateCcw className="w-4 h-4 mr-2" />
            Upload Another
          </Button>
          <Button variant="outline" className="flex-1" disabled>
            Save to My Clips
          </Button>
        </div>
      </div>
    </div>
  );
};