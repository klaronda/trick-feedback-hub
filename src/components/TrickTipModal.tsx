import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Heart, X } from "lucide-react";

interface TrickTip {
  id: string;
  greeting: string | null;
  tip_text: string;
  actionable_step: string;
  safety_note: string | null;
  difficulty: string;
  tags: string[];
  estimated_time_min: number;
  generated_at: string;
}

interface TrickTipModalProps {
  tip: TrickTip | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (tip: TrickTip) => void;
}

export const TrickTipModal = ({ tip, isOpen, onClose, onSave }: TrickTipModalProps) => {
  const [isSaved, setIsSaved] = useState(false);
  
  if (!tip || !isOpen) return null;

  const generateSteps = (actionableStep: string) => {
    // Generate numbered steps from the actionable step content
    const steps = [
      "Position your back foot on the tail with the ball of your foot centered",
      "Place your front foot sideways across the board, just behind the front bolts", 
      "Crouch down and explode upward, snapping your back foot down hard",
      "As the tail hits the ground, slide your front foot up and forward",
      "Level out the board by pushing your front foot toward the nose",
      "Bend your knees to absorb the landing and stay balanced"
    ];
    return steps;
  };

  const handleSave = () => {
    setIsSaved(true);
    onSave(tip);
  };

  return (
    <div className="fixed top-4 bottom-4 left-4 right-4 bg-black bg-opacity-50 z-40 flex items-center justify-center">
      <div className="w-[calc(100vw-32px)] max-w-sm bg-white rounded-2xl max-h-[80vh] flex flex-col border border-gray-200">
        {/* Sticky header */}
        <div className="sticky top-0 bg-white rounded-t-2xl border-b border-gray-100 p-6 pb-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xl font-semibold text-gray-900 pr-8">
              Kickflip Foot Positioning
            </h2>
            <Button 
              onClick={onClose}
              className="bg-gray-900 hover:bg-gray-800 text-white px-4 py-1.5 h-auto text-sm rounded-lg font-medium"
            >
              Done
            </Button>
          </div>
        </div>
        
        {/* Scrollable content */}
        <div className="flex-1 px-6 pb-6 overflow-y-auto">
          <div className="space-y-4 pt-4">
            <p className="text-gray-600 leading-relaxed">
              {tip.actionable_step}
            </p>
            
            <Badge variant="pending" className="w-fit">
              {tip.tags[0] || tip.difficulty}
            </Badge>
            
            <p className="text-gray-600 leading-relaxed">
              This foundational technique will help unlock your potential for more advanced moves. 
              Master this step-by-step to build confidence and skill.
            </p>
            
            <div className="space-y-3">
              <p className="font-semibold text-gray-900">Step-by-step:</p>
              <ol className="space-y-2">
                {generateSteps(tip.actionable_step).map((step, index) => (
                  <li key={index} className="flex gap-3 text-sm text-gray-600">
                    <span className="font-medium text-gray-900 min-w-[20px]">
                      {index + 1}.
                    </span>
                    <span className="leading-relaxed">{step}</span>
                  </li>
                ))}
              </ol>
            </div>
            
            {tip.safety_note && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-xs text-yellow-700 leading-relaxed">
                  ⚠️ {tip.safety_note}
                </p>
              </div>
            )}
            
            <div className="flex gap-3 pt-4 border-t border-gray-200">
              <Button 
                variant={isSaved ? "default" : "outline"}
                onClick={handleSave}
                className={`w-full gap-2 transition-all duration-200 ${
                  isSaved 
                    ? "bg-gray-900 hover:bg-gray-800 text-white" 
                    : "hover:bg-gray-50 hover:border-gray-300"
                }`}
                disabled={isSaved}
              >
                <Heart className={`w-4 h-4 ${isSaved ? "fill-current" : ""}`} />
                {isSaved ? "Tip Saved!" : "Save Tip"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};