import React, { useState, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { X, Camera } from 'lucide-react';
import { CropPhotoModal } from './CropPhotoModal';
import { PasswordConfirmModal } from './PasswordConfirmModal';
import { UpdateEmailModal } from './UpdateEmailModal';
import { ConfirmationModal } from './ConfirmationModal';
import { supabase } from '@/integrations/supabase/client';
import type { User } from '@supabase/supabase-js';

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  userProfile: {
    first_name: string | null;
    last_name: string | null;
    learning_goals: string | null;
  } | null;
  onProfileUpdate: () => void;
}

export function EditProfileModal({ isOpen, onClose, user, userProfile, onProfileUpdate }: EditProfileModalProps) {
  const [firstName, setFirstName] = useState(userProfile?.first_name || '');
  const [lastName, setLastName] = useState(userProfile?.last_name || '');
  const [learningGoals, setLearningGoals] = useState(userProfile?.learning_goals || '');
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  // Modal states
  const [showCropModal, setShowCropModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showExitConfirmModal, setShowExitConfirmModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getInitials = (email: string, firstName?: string | null) => {
    if (firstName) return firstName.charAt(0).toUpperCase();
    return email.charAt(0).toUpperCase();
  };

  const handleInputChange = (field: string, value: string) => {
    setHasUnsavedChanges(true);
    if (field === 'firstName') setFirstName(value);
    if (field === 'lastName') setLastName(value);
    if (field === 'learningGoals') setLearningGoals(value);
  };

  const handlePhotoClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      setShowCropModal(true);
    }
  };

  const handleCropComplete = async (croppedImage: File) => {
    try {
      setIsLoading(true);
      
      // Upload to Supabase storage
      const fileExt = croppedImage.name.split('.').pop();
      const fileName = `${user?.id}/avatar.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, croppedImage, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      setProfileImage(data.publicUrl);
      setHasUnsavedChanges(true);
      setShowCropModal(false);
    } catch (error) {
      console.error('Error uploading photo:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    
    try {
      setIsLoading(true);

      // Update profile
      const { error } = await supabase
        .from('profiles')
        .upsert({
          user_id: user.id,
          first_name: firstName,
          last_name: lastName,
          learning_goals: learningGoals,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      // Update learning context if learning goals changed
      if (learningGoals !== userProfile?.learning_goals) {
        await supabase.functions.invoke('update-learning-context', {
          body: { learning_goals: learningGoals }
        });
      }

      setHasUnsavedChanges(false);
      onProfileUpdate();
      onClose();
    } catch (error) {
      console.error('Error updating profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (hasUnsavedChanges) {
      setShowExitConfirmModal(true);
    } else {
      onClose();
    }
  };

  const handleEmailChange = () => {
    setShowPasswordModal(true);
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-gray-50 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="bg-white px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <div>
              <h2 className="text-xl text-primary-foreground font-semibold">Edit Profile</h2>
              <p className="text-sm text-gray-600">Update your account information</p>
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
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
            {/* Profile Photo */}
            <div className="flex flex-col items-center mb-6">
              <div className="relative">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={profileImage || undefined} />
                  <AvatarFallback className="text-lg">
                    {user ? getInitials(user.email || '', firstName) : ''}
                  </AvatarFallback>
                </Avatar>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePhotoClick}
                  className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full p-0"
                >
                  <Camera className="h-4 w-4" />
                </Button>
              </div>
              <Button
                variant="outline"
                onClick={handlePhotoClick}
                className="mt-3 text-sm"
                disabled={isLoading}
              >
                Change Photo
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>

            {/* Form Fields */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName" className="text-sm font-medium text-gray-700">First Name</Label>
                  <Input
                    id="firstName"
                    value={firstName}
                    onChange={(e) => handleInputChange('firstName', e.target.value)}
                    className="mt-1 bg-white placeholder:text-gray-400/60"
                    placeholder="Enter first name"
                  />
                </div>
                <div>
                  <Label htmlFor="lastName" className="text-sm font-medium text-gray-700">Last Name</Label>
                  <Input
                    id="lastName"
                    value={lastName}
                    onChange={(e) => handleInputChange('lastName', e.target.value)}
                    className="mt-1 bg-white placeholder:text-gray-400/60"
                    placeholder="Enter last name"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="email" className="text-sm font-medium text-gray-700">Email</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Input
                    id="email"
                    value={user?.email || ''}
                    disabled
                    className="bg-gray-100 text-gray-600"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleEmailChange}
                    className="whitespace-nowrap"
                  >
                    Change Email
                  </Button>
                </div>
              </div>

              <div>
                <Label htmlFor="learningGoals" className="text-sm font-medium text-gray-700">Learning Goals</Label>
                <Textarea
                  id="learningGoals"
                  value={learningGoals}
                  onChange={(e) => handleInputChange('learningGoals', e.target.value)}
                  className="mt-1 bg-white placeholder:text-gray-400/60"
                  placeholder="What tricks or skills do you want to learn?"
                  rows={3}
                />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-white px-6 py-4 border-t border-gray-200 flex gap-3">
            <Button
              variant="outline"
              onClick={handleClose}
              className="flex-1"
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              className="flex-1 bg-gray-900 hover:bg-gray-800 text-white"
              disabled={isLoading || !hasUnsavedChanges}
            >
              {isLoading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </div>

      {/* Modals */}
      <CropPhotoModal
        isOpen={showCropModal}
        onClose={() => setShowCropModal(false)}
        image={selectedImage}
        onCropComplete={handleCropComplete}
      />

      <PasswordConfirmModal
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        onConfirm={() => {
          setShowPasswordModal(false);
          setShowEmailModal(true);
        }}
      />

      <UpdateEmailModal
        isOpen={showEmailModal}
        onClose={() => setShowEmailModal(false)}
        currentEmail={user?.email || ''}
      />

      <ConfirmationModal
        isOpen={showExitConfirmModal}
        onClose={() => setShowExitConfirmModal(false)}
        onConfirm={() => {
          setShowExitConfirmModal(false);
          onClose();
        }}
        title="Discard Changes?"
        message="You have unsaved changes. Are you sure you want to exit without saving?"
        confirmText="Discard"
        cancelText="Continue Editing"
      />
    </>
  );
}