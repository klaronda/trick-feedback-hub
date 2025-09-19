import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X, Mail } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface UpdateEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentEmail: string;
}

export function UpdateEmailModal({ isOpen, onClose, currentEmail }: UpdateEmailModalProps) {
  const [newEmail, setNewEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const validateEmail = (email: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const handleUpdateEmail = async () => {
    if (!newEmail.trim()) {
      setError('Email is required');
      return;
    }

    if (!validateEmail(newEmail)) {
      setError('Please enter a valid email address');
      return;
    }

    if (newEmail === currentEmail) {
      setError('New email must be different from current email');
      return;
    }

    try {
      setIsLoading(true);
      setError('');

      const { error } = await supabase.auth.updateUser({
        email: newEmail
      });

      if (error) throw error;

      setSuccess(true);
    } catch (error: any) {
      console.error('Email update failed:', error);
      if (error.message.includes('email_already_exists')) {
        setError('This email is already in use by another account');
      } else {
        setError('Failed to update email. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setNewEmail('');
    setError('');
    setSuccess(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-xl text-primary-foreground font-semibold">Update Email</h2>
            <p className="text-sm text-gray-600">Change your account email address</p>
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
        <div className="p-6">
          {success ? (
            <div className="text-center">
              <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <Mail className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Email Update Requested
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                We've sent a confirmation email to <strong>{newEmail}</strong>. 
                Please check your inbox and click the confirmation link to complete the email change.
              </p>
              <p className="text-xs text-gray-500">
                Your current email ({currentEmail}) will remain active until you confirm the change.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <Label htmlFor="currentEmail" className="text-sm font-medium text-gray-700">
                  Current Email
                </Label>
                <Input
                  id="currentEmail"
                  value={currentEmail}
                  disabled
                  className="mt-1 bg-gray-100 text-gray-600"
                />
              </div>

              <div>
                <Label htmlFor="newEmail" className="text-sm font-medium text-gray-700">
                  New Email
                </Label>
                <Input
                  id="newEmail"
                  type="email"
                  value={newEmail}
                  onChange={(e) => {
                    setNewEmail(e.target.value);
                    setError('');
                  }}
                  className="mt-1 bg-white placeholder:text-gray-400/60"
                  placeholder="Enter new email address"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') handleUpdateEmail();
                  }}
                />
                {error && (
                  <p className="text-sm text-red-600 mt-1">{error}</p>
                )}
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> You'll receive a confirmation email at your new address. 
                  Your current email will remain active until you confirm the change.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex gap-3">
          <Button
            variant="outline"
            onClick={handleClose}
            className="flex-1"
          >
            {success ? 'Close' : 'Cancel'}
          </Button>
          {!success && (
            <Button
              onClick={handleUpdateEmail}
              className="flex-1 bg-gray-900 hover:bg-gray-800 text-white"
              disabled={isLoading || !newEmail.trim()}
            >
              {isLoading ? 'Updating...' : 'Update Email'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}