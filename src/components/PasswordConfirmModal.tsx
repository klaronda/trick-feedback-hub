import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X, Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface PasswordConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function PasswordConfirmModal({ isOpen, onClose, onConfirm }: PasswordConfirmModalProps) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleConfirm = async () => {
    if (!password.trim()) {
      setError('Password is required');
      return;
    }

    try {
      setIsLoading(true);
      setError('');

      // Verify password by attempting to update it with the same value
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) {
        if (error.message.includes('New password should be different')) {
          // This means the password is correct
          onConfirm();
          setPassword('');
        } else {
          throw error;
        }
      } else {
        onConfirm();
        setPassword('');
      }
    } catch (error: any) {
      console.error('Password verification failed:', error);
      setError('Incorrect password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setPassword('');
    setError('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-xl text-primary-foreground font-semibold">Confirm Password</h2>
            <p className="text-sm text-gray-600">Enter your password to change email</p>
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
          <div>
            <Label htmlFor="password" className="text-sm font-medium text-gray-700">
              Current Password
            </Label>
            <div className="relative mt-1">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError('');
                }}
                className="bg-white placeholder:text-gray-400/60 pr-10"
                placeholder="Enter your current password"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') handleConfirm();
                }}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 h-6 w-6"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4 text-gray-500" />
                ) : (
                  <Eye className="h-4 w-4 text-gray-500" />
                )}
              </Button>
            </div>
            {error && (
              <p className="text-sm text-red-600 mt-1">{error}</p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex gap-3">
          <Button
            variant="outline"
            onClick={handleClose}
            className="flex-1"
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            className="flex-1 bg-gray-900 hover:bg-gray-800 text-white"
            disabled={isLoading || !password.trim()}
          >
            {isLoading ? 'Verifying...' : 'Confirm'}
          </Button>
        </div>
      </div>
    </div>
  );
}