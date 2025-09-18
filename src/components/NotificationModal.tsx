import React from 'react';
import { X, Upload, MessageSquare, Heart, BookOpen, Bell, Trash2, User, Crown, CrownIcon } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useNotifications, Notification } from '@/hooks/useNotifications';

interface NotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  userFirstName?: string;
}

const NotificationModal: React.FC<NotificationModalProps> = ({
  isOpen,
  onClose,
  userFirstName = "there"
}) => {
  const { notifications, loading, unreadCount, markAllAsRead } = useNotifications();

  const handleClose = async () => {
    if (unreadCount > 0) {
      await markAllAsRead();
    }
    onClose();
  };

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'video_upload':
        return <Upload className="w-4 h-4 text-blue-600" />;
      case 'coach_review':
        return <MessageSquare className="w-4 h-4 text-green-600" />;
      case 'tip_saved':
        return <Heart className="w-4 h-4 text-red-400 fill-current" />;
      case 'tip_removed':
        return <Heart className="w-4 h-4 text-gray-600" />;
      case 'video_deleted':
        return <Trash2 className="w-4 h-4 text-red-600" />;
      case 'profile_updated':
        return <User className="w-4 h-4 text-blue-600" />;
      case 'subscription_upgraded':
        return <Crown className="w-4 h-4 text-yellow-600" />;
      case 'subscription_downgraded':
        return <CrownIcon className="w-4 h-4 text-gray-600" />;
      default:
        return <Bell className="w-4 h-4 text-gray-600" />;
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const now = new Date();
    const date = new Date(timestamp);
    const diffInMs = now.getTime() - date.getTime();
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes} minute${diffInMinutes === 1 ? '' : 's'} ago`;
    if (diffInHours < 24) return `${diffInHours} hour${diffInHours === 1 ? '' : 's'} ago`;
    if (diffInHours < 48) return 'Yesterday';
    return date.toLocaleDateString();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 flex items-center justify-center p-4">
      <div className="w-[calc(100vw-32px)] max-w-sm bg-white rounded-2xl max-h-[80vh] flex flex-col">
        {/* Sticky header */}
        <div className="sticky top-0 bg-white rounded-t-2xl border-b border-gray-100 p-6 pb-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xl font-semibold text-gray-900">
              Hey {userFirstName}!
            </h2>
            <button
              onClick={handleClose}
              className="text-gray-600 hover:text-gray-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <p className="text-sm text-gray-600">
            Here's what's been happening with your skating journey
          </p>
        </div>

        {/* Scrollable content */}
        <ScrollArea className="flex-1 px-6 max-h-96">
          {loading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse" />
                    <div className="h-3 bg-gray-200 rounded w-1/2 animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <Bell className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No notifications yet</h3>
              <p className="text-gray-500 text-sm max-w-xs">
                Your notifications will appear here when you have activity
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className="flex items-start space-x-3 py-3 border-b border-gray-50 last:border-b-0"
                >
                  <div className="flex-shrink-0 w-8 h-8 bg-gray-50 rounded-full flex items-center justify-center">
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-medium text-gray-900">
                        {notification.title}
                      </p>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">
                      {notification.description}
                    </p>
                    <p className="text-xs text-gray-400">
                      {formatTimestamp(notification.created_at)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        <div className="p-6 pt-4 border-t border-gray-100">
          <p className="text-xs text-gray-500 text-center">
            Stay updated on your skating progress
          </p>
        </div>
      </div>
    </div>
  );
};

export { NotificationModal };