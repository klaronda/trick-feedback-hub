import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { X } from 'lucide-react';
import { ConfirmationModal } from './ConfirmationModal';
import { useUserPreferences } from '@/hooks/useUserPreferences';

interface AccountPreferencesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AccountPreferencesModal({ isOpen, onClose }: AccountPreferencesModalProps) {
  const { preferences, isLoading, isSaving, updatePreferences } = useUserPreferences();
  
  // Local state for form values
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [cameraAccessEnabled, setCameraAccessEnabled] = useState(true);
  const [microphoneAccessEnabled, setMicrophoneAccessEnabled] = useState(true);
  
  // Track changes
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  // Confirmation modal state
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState<() => void>(() => {});
  const [confirmText, setConfirmText] = useState('');

  // Debug logging
  useEffect(() => {
    console.log('AccountPreferencesModal - preferences loaded:', preferences);
    console.log('AccountPreferencesModal - isLoading:', isLoading);
  }, [preferences, isLoading]);

  // Sync local state with preferences when they load
  useEffect(() => {
    if (preferences) {
      console.log('Syncing local state with preferences:', preferences);
      setNotificationsEnabled(preferences.notifications_enabled);
      setCameraAccessEnabled(preferences.camera_access_enabled);
      setMicrophoneAccessEnabled(preferences.microphone_access_enabled);
    }
  }, [preferences]);

  // Reset local state when modal opens
  useEffect(() => {
    if (isOpen && preferences) {
      setNotificationsEnabled(preferences.notifications_enabled);
      setCameraAccessEnabled(preferences.camera_access_enabled);
      setMicrophoneAccessEnabled(preferences.microphone_access_enabled);
      setHasUnsavedChanges(false);
    }
  }, [isOpen, preferences]);

  // Check for changes
  useEffect(() => {
    if (preferences) {
      const hasChanges = 
        notificationsEnabled !== preferences.notifications_enabled ||
        cameraAccessEnabled !== preferences.camera_access_enabled ||
        microphoneAccessEnabled !== preferences.microphone_access_enabled;
      setHasUnsavedChanges(hasChanges);
    }
  }, [notificationsEnabled, cameraAccessEnabled, microphoneAccessEnabled, preferences]);

  const handleNotificationsToggle = (checked: boolean) => {
    if (!checked) {
      setConfirmText("You won't receive important updates about your progress and new tips. Are you sure you want to disable notifications?");
      setConfirmAction(() => () => {
        setNotificationsEnabled(false);
        setShowConfirmModal(false);
      });
      setShowConfirmModal(true);
    } else {
      setNotificationsEnabled(true);
    }
  };

  const handleCameraToggle = (checked: boolean) => {
    if (!checked) {
      setConfirmText("You won't be able to upload videos or take photos within the app. Are you sure you want to disable camera access?");
      setConfirmAction(() => () => {
        setCameraAccessEnabled(false);
        setShowConfirmModal(false);
      });
      setShowConfirmModal(true);
    } else {
      setCameraAccessEnabled(true);
    }
  };

  const handleMicrophoneToggle = (checked: boolean) => {
    if (!checked) {
      setConfirmText("Audio features and voice commands will be disabled. Are you sure you want to disable microphone access?");
      setConfirmAction(() => () => {
        setMicrophoneAccessEnabled(false);
        setShowConfirmModal(false);
      });
      setShowConfirmModal(true);
    } else {
      setMicrophoneAccessEnabled(true);
    }
  };

  const handleSave = async () => {
    const success = await updatePreferences({
      notifications_enabled: notificationsEnabled,
      camera_access_enabled: cameraAccessEnabled,
      microphone_access_enabled: microphoneAccessEnabled,
    });

    if (success) {
      setHasUnsavedChanges(false);
      onClose();
    }
  };

  const handleClose = () => {
    if (hasUnsavedChanges) {
      setConfirmText("You have unsaved changes. Are you sure you want to exit without saving?");
      setConfirmAction(() => () => {
        setShowConfirmModal(false);
        onClose();
      });
      setShowConfirmModal(true);
    } else {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-gray-50 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="bg-white px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <div>
              <h2 className="text-xl text-primary-foreground font-semibold">Account Preferences</h2>
              <p className="text-sm text-gray-600">Manage your app settings and permissions</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              className="p-2 h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Notifications */}
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label className="text-base font-medium text-gray-900">Notifications</Label>
                <p className="text-sm text-gray-600">Receive updates about your progress and new tips</p>
              </div>
              <Switch
                checked={notificationsEnabled}
                onCheckedChange={handleNotificationsToggle}
                disabled={isLoading || isSaving}
              />
            </div>

            {/* Camera Access */}
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label className="text-base font-medium text-gray-900">Camera Access</Label>
                <p className="text-sm text-gray-600">Allow video uploads and photo capture</p>
              </div>
              <Switch
                checked={cameraAccessEnabled}
                onCheckedChange={handleCameraToggle}
                disabled={isLoading || isSaving}
              />
            </div>

            {/* Microphone Access */}
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label className="text-base font-medium text-gray-900">Microphone Access</Label>
                <p className="text-sm text-gray-600">Enable audio features and voice commands</p>
              </div>
              <Switch
                checked={microphoneAccessEnabled}
                onCheckedChange={handleMicrophoneToggle}
                disabled={isLoading || isSaving}
              />
            </div>
          </div>

          {/* Footer */}
          <div className="bg-white px-6 py-4 border-t border-gray-200 flex gap-3">
            <Button
              variant="outline"
              onClick={handleClose}
              className="flex-1"
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              className="flex-1 bg-gray-900 hover:bg-gray-800 text-white"
              disabled={isLoading || isSaving || !hasUnsavedChanges}
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={confirmAction}
        title="Are you sure?"
        message={confirmText}
        confirmText="Yes, Continue"
        cancelText="Cancel"
        isDestructive={true}
      />
    </>
  );
}