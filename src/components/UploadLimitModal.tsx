import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Crown } from "lucide-react";

interface UploadLimitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpgrade: () => void;
  isUpgrading?: boolean;
}

export const UploadLimitModal = ({ 
  isOpen, 
  onClose, 
  onUpgrade, 
  isUpgrading = false 
}: UploadLimitModalProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-amber-600" />
            <DialogTitle className="text-amber-800">Monthly upload limit reached</DialogTitle>
          </div>
          <DialogDescription className="text-amber-700 pt-2">
            You've reached your 5 free uploads for this month. Upgrade to Pro to upload unlimited videos and unlock priority processing.
          </DialogDescription>
        </DialogHeader>
        
        <DialogFooter className="flex gap-2 pt-4">
          <Button 
            variant="outline" 
            onClick={onClose}
            className="border-amber-300 text-amber-700 hover:bg-amber-100"
          >
            Maybe later
          </Button>
          <Button 
            onClick={onUpgrade}
            disabled={isUpgrading}
            className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
          >
            {isUpgrading ? "Processing..." : "Go Pro"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};