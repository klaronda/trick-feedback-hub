import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
  if (!tip) return null;

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
    onSave(tip);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md mx-auto max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-gray-900 pr-8">
            {tip.tip_text}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <p className="text-gray-600 leading-relaxed">
            {tip.actionable_step}
          </p>
          
          <Badge variant="completed" className="w-fit">
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
          
          {tip.estimated_time_min > 0 && (
            <p className="text-xs text-gray-500">
              Estimated time: {tip.estimated_time_min} minutes
            </p>
          )}
        </div>
        
        <div className="flex gap-3 pt-4 border-t">
          <Button 
            variant="outline" 
            onClick={handleSave}
            className="flex-1 gap-2"
          >
            <Heart className="w-4 h-4" />
            Save Tip
          </Button>
          <Button 
            onClick={onClose}
            className="flex-1"
          >
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};