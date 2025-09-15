import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Upload, Bell, BookmarkPlus, Video } from "lucide-react";
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
  color: string;
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
          icon: <Upload className="w-4 h-4" />,
          color: 'text-blue-500'
        });

        // Feedback activity (if processed)
        if (attempt.status === 'completed' && attempt.processed_at) {
          activityItems.push({
            id: `feedback-${attempt.id}`,
            type: 'feedback',
            title: 'Coach feedback ready',
            description: `Your ${attempt.trick_name || 'trick'} analysis is complete with coaching tips`,
            timestamp: formatTimestamp(attempt.processed_at),
            icon: <Bell className="w-4 h-4" />,
            color: 'text-orange-500'
          });
        }
      });

      // Add some sample activities for demonstration
      activityItems.push(
        {
          id: 'tip-saved-1',
          type: 'tip_saved',
          title: 'Tip saved',
          description: 'You saved "Master Your Ollie Foundation" to your collection',
          timestamp: 'Yesterday',
          icon: <BookmarkPlus className="w-4 h-4" />,
          color: 'text-green-500'
        }
      );

      // Sort by most recent first
      activityItems.sort((a, b) => {
        // For demo purposes, just maintain the order
        return 0;
      });

      setActivities(activityItems.slice(0, 8)); // Show max 8 items
    } catch (error) {
      console.error('Error fetching activities:', error);
      setActivities([]);
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-sm mx-auto h-[80vh] p-0 gap-0 rounded-2xl">
        {/* Sticky header */}
        <div className="sticky top-0 z-10 bg-white border-b border-gray-100 p-4 rounded-t-2xl">
          <DialogHeader className="space-y-2">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-lg font-semibold text-gray-900">
                {userFirstName}'s Activity
              </DialogTitle>
              <Button 
                onClick={onClose}
                className="bg-gray-900 hover:bg-gray-800 text-white px-4 py-1.5 h-auto text-sm rounded-lg"
              >
                Done
              </Button>
            </div>
            <DialogDescription className="text-sm text-gray-600">
              Recent uploads, notifications, saved tips and more.
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Scrollable content */}
        <ScrollArea className="flex-1 px-4 pb-4">
          {loading ? (
            <div className="space-y-4 pt-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg animate-pulse">
                  <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-200 rounded w-full"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : activities.length > 0 ? (
            <div className="space-y-3 pt-4">
              {activities.map((activity) => (
                <div key={activity.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className={`w-8 h-8 rounded-full bg-white border-2 border-gray-100 flex items-center justify-center ${activity.color}`}>
                    {activity.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-gray-900 mb-1">
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
      </DialogContent>
    </Dialog>
  );
};