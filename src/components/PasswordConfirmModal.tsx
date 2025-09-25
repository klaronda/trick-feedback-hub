import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="w-[calc(100vw-32px)] sm:max-w-md bg-white border-gray-200">
        <DialogHeader className="text-left">
          <DialogTitle className="text-xl text-gray-900 font-semibold">Confirm Password</DialogTitle>
          <DialogDescription className="text-sm text-gray-600">Enter your password to change email</DialogDescription>
        </DialogHeader>

        {/* Content */}
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

        <DialogFooter className="flex gap-3">
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
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}