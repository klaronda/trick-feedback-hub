import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Heart, X } from "lucide-react";
import { useSavedTips } from "@/hooks/useSavedTips";

interface TrickTip {
  id: string;
  headline?: string;
  teaser_text?: string;
  detailed_content?: string;
  badge_category?: string;
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
  onSave?: (tip: TrickTip) => void;
  isAlreadySaved?: boolean;
  onUnsave?: (tip: TrickTip) => void;
}

export const TrickTipModal = ({ tip, isOpen, onClose, onSave, isAlreadySaved = false, onUnsave }: TrickTipModalProps) => {
  const [isSaved, setIsSaved] = useState(isAlreadySaved);
  const { saveTip, unsaveTip, savedTips } = useSavedTips();
  
  // Check if tip is already saved when tip changes
  useEffect(() => {
    if (tip && savedTips.length > 0) {
      const isCurrentTipSaved = savedTips.some(savedTip => savedTip.tip?.id === tip.id);
      setIsSaved(isCurrentTipSaved);
    } else {
      setIsSaved(isAlreadySaved);
    }
  }, [tip, savedTips, isAlreadySaved]);
  
  if (!tip || !isOpen) return null;

  const generateSteps = (detailedContent?: string, actionableStep?: string) => {
    // Use detailed content if available, otherwise fallback to basic steps
    if (detailedContent) {
      return detailedContent.split('\n').filter(line => line.trim());
    }
    
    // Fallback generic steps
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

  const handleSave = async () => {
    if (!tip) return;
    
    if (isSaved) {
      // Find the saved tip to unsave
      const savedTip = savedTips.find(savedTip => savedTip.tip?.id === tip.id);
      if (savedTip) {
        await unsaveTip(savedTip.id);
        setIsSaved(false);
      }
    } else {
      await saveTip(tip, 'daily-tips');
      setIsSaved(true);
    }
  };

  return (
    <div className="fixed top-4 bottom-4 left-4 right-4 bg-black bg-opacity-50 z-40 flex items-center justify-center">
      <div className="w-[calc(100vw-32px)] max-w-sm bg-white rounded-2xl max-h-[80vh] flex flex-col border border-gray-200">
        {/* Sticky header */}
        <div className="sticky top-0 bg-white rounded-t-2xl border-b border-gray-100 p-6 pb-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xl font-semibold text-gray-900 pr-8">
              {tip.headline || "Trick Tip"}
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
              {tip.teaser_text || tip.tip_text}
            </p>
            
            <Badge variant="pending" className="w-fit">
              {tip.badge_category || tip.tags?.[0] || tip.difficulty}
            </Badge>
            
            <div className="space-y-3">
              <p className="font-semibold text-gray-900">How to practice:</p>
              <div className="space-y-2 text-sm text-gray-600 leading-relaxed">
                {tip.detailed_content ? (
                  <div dangerouslySetInnerHTML={{ 
                    __html: tip.detailed_content.replace(/\n/g, '<br>') 
                  }} />
                ) : (
                  <div>
                    <p>{tip.actionable_step}</p>
                    <ol className="space-y-2 mt-3">
                      {generateSteps(tip.detailed_content, tip.actionable_step).map((step, index) => (
                        <li key={index} className="flex gap-3">
                          <span className="font-medium text-gray-900 min-w-[20px]">
                            {index + 1}.
                          </span>
                          <span className="leading-relaxed">{step}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
              </div>
            </div>
            
            
            <div className="flex gap-3 pt-4 border-t border-gray-200">
              <Button 
                variant={isSaved ? "default" : "outline"}
                onClick={handleSave}
                className={`w-full gap-2 transition-all duration-200 ${
                  isSaved
                    ? "bg-[var(--soft-black)] hover:bg-[var(--soft-black)]/90 text-white" 
                    : "hover:bg-gray-50 hover:border-gray-300"
                }`}
              >
                <Heart className={`w-4 h-4 ${isSaved ? "fill-current" : ""}`} />
                {isSaved ? "Tip Saved" : "Save Tip"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};