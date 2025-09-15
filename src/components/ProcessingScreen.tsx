import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Lightbulb } from "lucide-react";

const DUMMY_TIPS = [
  "Good pop — try leveling out your board.",
  "Front foot flick could be stronger.",
  "Back foot isn't popping enough.",
  "You're almost there — more commitment on the landing.",
  "Keep your shoulders aligned with the board.",
  "Focus on the timing of your jump."
];

interface ProcessingScreenProps {
  onProcessingComplete: () => void;
}

export const ProcessingScreen = ({ onProcessingComplete }: ProcessingScreenProps) => {
  const [progress, setProgress] = useState(0);
  const [currentTip, setCurrentTip] = useState(0);

  useEffect(() => {
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          setTimeout(onProcessingComplete, 500);
          return 100;
        }
        return prev + 2;
      });
    }, 100);

    const tipInterval = setInterval(() => {
      setCurrentTip(prev => (prev + 1) % DUMMY_TIPS.length);
    }, 2000);

    return () => {
      clearInterval(progressInterval);
      clearInterval(tipInterval);
    };
  }, [onProcessingComplete]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="max-w-md w-full p-8 text-center space-y-6 bg-white border-gray-200">
        <div className="space-y-4">
          <div className="flex justify-center">
            <div className="animate-spin w-12 h-12 border-4 border-gray-900 border-t-transparent rounded-full" />
          </div>
          
          <h2 className="text-2xl font-bold text-gray-900">Analyzing your clip...</h2>
          
          <Progress value={progress} className="w-full" />
          
          <p className="text-sm text-gray-600">
            {progress}% complete
          </p>
        </div>

        <div className="p-4 bg-gray-100 rounded-lg border border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <Lightbulb className="w-4 h-4 text-gray-900" />
            <span className="text-sm font-semibold text-gray-900">Quick Tip</span>
          </div>
          <p className="text-sm text-gray-700">
            {DUMMY_TIPS[currentTip]}
          </p>
        </div>

        <p className="text-xs text-gray-500">
          AI feedback coming soon. For now, here's sample feedback.
        </p>
      </Card>
    </div>
  );
};