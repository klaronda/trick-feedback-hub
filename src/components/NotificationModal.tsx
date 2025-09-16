import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Upload, Bell, BookmarkPlus, MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface NotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  userFirstName?: string;
}

interface ActivityItem {
  id: string;
  type: 'upload' | 'feedback' | 'tip_saved' | 'notification';
  title: string;
  description: string;
  timestamp: string;
  icon: React.ReactNode;
}

export const NotificationModal = ({ isOpen, onClose, userFirstName = "User" }: NotificationModalProps) => {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      fetchUserActivities();
    }
  }, [isOpen]);

  const fetchUserActivities = async () => {
    try {
      setLoading(true);
      const { data: attempts, error } = await supabase
        .from('trick_attempts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      // Transform attempts into activity items
      const activityItems: ActivityItem[] = [];
      
      attempts?.forEach((attempt) => {
        // Upload activity
        activityItems.push({
          id: `upload-${attempt.id}`,
          type: 'upload',
          title: 'Video uploaded',
          description: `Your ${attempt.trick_name || 'trick'} attempt is being reviewed by Coach`,
          timestamp: formatTimestamp(attempt.created_at),
          icon: <Upload className="w-4 h-4" />
        });

        // Feedback activity (if processed)
        if (attempt.status === 'completed' && attempt.processed_at) {
          activityItems.push({
            id: `feedback-${attempt.id}`,
            type: 'feedback',
            title: 'Coach feedback ready',
            description: `Your ${attempt.trick_name || 'trick'} analysis is complete with coaching tips`,
            timestamp: formatTimestamp(attempt.processed_at),
            icon: <MessageSquare className="w-4 h-4" />
          });
        }
      });

      // Add some sample activities for demonstration
      if (activityItems.length === 0) {
        activityItems.push(
          {
            id: 'upload-demo',
            type: 'upload',
            title: 'Video uploaded',
            description: 'Your 360 flip attempt is being reviewed by Coach',
            timestamp: '10 hours ago',
            icon: <Upload className="w-4 h-4" />
          },
          {
            id: 'tip-saved-1',
            type: 'tip_saved',
            title: 'Tip saved',
            description: 'You saved "Master Your Ollie Foundation" to your collection',
            timestamp: 'Yesterday',
            icon: <BookmarkPlus className="w-4 h-4" />
          }
        );
      }

      setActivities(activityItems.slice(0, 8)); // Show max 8 items
    } catch (error) {
      console.error('Error fetching activities:', error);
      // Show demo data on error
      setActivities([
        {
          id: 'upload-demo',
          type: 'upload',
          title: 'Video uploaded',
          description: 'Your 360 flip attempt is being reviewed by Coach',
          timestamp: '10 hours ago',
          icon: <Upload className="w-4 h-4" />
        },
        {
          id: 'tip-saved-1',
          type: 'tip_saved',
          title: 'Tip saved',
          description: 'You saved "Master Your Ollie Foundation" to your collection',
          timestamp: 'Yesterday',
          icon: <BookmarkPlus className="w-4 h-4" />
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const now = new Date();
    const date = new Date(timestamp);
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours} hours ago`;
    if (diffInHours < 48) return 'Yesterday';
    return date.toLocaleDateString();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex items-center justify-center px-4">
      <div className="w-[calc(100vw-32px)] max-w-sm bg-white rounded-2xl max-h-[80vh] flex flex-col">
        {/* Sticky header */}
        <div className="sticky top-0 bg-white rounded-t-2xl border-b border-gray-100 p-6 pb-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xl font-semibold text-gray-900">
              {userFirstName}'s Activity
            </h2>
            <Button 
              onClick={onClose}
              className="bg-gray-900 hover:bg-gray-800 text-white px-4 py-1.5 h-auto text-sm rounded-lg font-medium"
            >
              Done
            </Button>
          </div>
          <p className="text-sm text-gray-600">
            Recent uploads, notifications, saved tips and more.
          </p>
        </div>

        {/* Scrollable content */}
        <ScrollArea className="flex-1 px-6 pb-6">
          {loading ? (
            <div className="space-y-4 pt-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl">
                    <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                      <div className="h-3 bg-gray-200 rounded w-full"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : activities.length > 0 ? (
            <div className="space-y-3 pt-4">
              {activities.map((activity) => (
                <div key={activity.id} className="bg-gray-50 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 flex-shrink-0">
                      {activity.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-semibold text-gray-900 mb-1">
                        {activity.title}
                      </h4>
                      <p className="text-sm text-gray-600 mb-2 leading-relaxed">
                        {activity.description}
                      </p>
                      <p className="text-xs text-gray-500">
                        {activity.timestamp}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <Bell className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No activity yet</h3>
              <p className="text-sm text-gray-600 max-w-xs">
                Upload your first video to start tracking your progress and receive personalized coaching tips.
              </p>
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  );
};