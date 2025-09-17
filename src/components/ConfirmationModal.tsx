import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
}

export const ConfirmationModal = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Yes",
  cancelText = "No",
  isDestructive = true,
}: ConfirmationModalProps) => {
  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="max-w-md bg-white border-gray-200">
        <AlertDialogHeader className="text-left">
          <AlertDialogTitle className="text-gray-900 text-lg text-left">
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-gray-600 whitespace-pre-line text-left">
            {message}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex flex-row gap-3 sm:gap-3 justify-between">
          <AlertDialogCancel 
            onClick={onClose}
            className="flex-1 bg-white border border-gray-200 text-gray-900 hover:bg-gray-50 hover:text-gray-900"
          >
            {cancelText}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            className={`flex-1 ${
              isDestructive
                ? "bg-red-500 text-white hover:bg-red-600 border-red-500 hover:border-red-600"
                : "bg-gray-900 text-white hover:bg-gray-800 border-gray-900 hover:border-gray-800"
            }`}
          >
            {confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};