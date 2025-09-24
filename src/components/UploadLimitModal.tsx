import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
      <DialogContent className="w-[calc(100vw-32px)] sm:max-w-sm bg-white border-gray-200">
        <DialogHeader className="text-left">
          <DialogTitle className="text-gray-900 text-left">Monthly upload limit reached.</DialogTitle>
          <DialogDescription className="text-gray-600 pt-2 text-left">
            You've reached your 5 free uploads for this month. Upgrade to Pro to upload unlimited videos and unlock priority processing.
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