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
      <DialogContent className="sm:max-w-sm md:max-w-4xl bg-white border border-gray-200 rounded-[8px] p-4">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-gray-900" />
            <DialogTitle className="text-gray-900">Monthly upload limit reached</DialogTitle>
          </div>
          <DialogDescription className="text-gray-600 pt-2">
            You've reached your 5 free uploads for this month. Upgrade to Pro to upload unlimited videos and unlock priority processing.
          </DialogDescription>
        </DialogHeader>
        
        <DialogFooter className="flex gap-2 pt-4">
          <Button 
            variant="outline" 
            onClick={onClose}
            className="border-gray-300 text-gray-700 hover:bg-gray-100"
          >
            Maybe later
          </Button>
          <Button 
            onClick={onUpgrade}
            disabled={isUpgrading}
            className="bg-gray-900 hover:bg-gray-800 text-white"
          >
            {isUpgrading ? "Processing..." : "Go Pro"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};