import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface CoachUpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpgrade: () => void;
  isUpgrading?: boolean;
}

export const CoachUpgradeModal = ({ 
  isOpen, 
  onClose, 
  onUpgrade, 
  isUpgrading = false 
}: CoachUpgradeModalProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[calc(100vw-32px)] sm:max-w-sm bg-white border-gray-200">
        <DialogHeader className="text-left">
          <DialogTitle className="text-gray-900 text-left">Chat with Coach anytime, anywhere.</DialogTitle>
          <DialogDescription className="text-gray-600 pt-2 text-left">
            Upgrade to the Pro plan for $5/month and ask your SkateCoach anything about skateboarding techniques, tricks and drills.
          </DialogDescription>
        </DialogHeader>
        
        <DialogFooter className="flex flex-row gap-2 pt-4 sm:justify-start">
          <Button 
            variant="outline" 
            onClick={onClose}
            className="border-gray-300 text-gray-700 hover:bg-gray-100 flex-1"
          >
            Maybe later
          </Button>
          <Button 
            onClick={onUpgrade}
            disabled={isUpgrading}
            className="bg-gray-900 hover:bg-gray-800 text-white flex-1"
          >
            {isUpgrading ? "Processing..." : "Go Pro"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};