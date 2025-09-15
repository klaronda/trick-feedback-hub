import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

export interface NotificationBarProps {
  message: string;
  type: 'success' | 'error';
  isVisible: boolean;
  onHide: () => void;
}

export function NotificationBar({ message, type, isVisible, onHide }: NotificationBarProps) {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onHide();
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [isVisible, onHide]);

  return (
    <div
      className={cn(
        'fixed top-0 left-0 right-0 z-50 px-4 py-3 text-center font-medium transition-transform duration-300 ease-in-out border-l-4',
        type === 'success' 
          ? 'bg-[var(--success-bg)] text-[var(--success-text)] border-l-[var(--success-text)]' 
          : 'bg-[var(--error-bg)] text-[var(--error-text)] border-l-[var(--error-text)]',
        isVisible 
          ? 'transform translate-y-0' 
          : 'transform -translate-y-full'
      )}
    >
      {message}
    </div>
  );
}

// Hook for managing notification state
export function useNotificationBar() {
  const [notification, setNotification] = useState<{
    message: string;
    type: 'success' | 'error';
    isVisible: boolean;
  }>({
    message: '',
    type: 'success',
    isVisible: false,
  });

  const showNotification = (message: string, type: 'success' | 'error') => {
    setNotification({
      message,
      type,
      isVisible: true,
    });
  };

  const hideNotification = () => {
    setNotification(prev => ({
      ...prev,
      isVisible: false,
    }));
  };

  return {
    notification,
    showNotification,
    hideNotification,
  };
}