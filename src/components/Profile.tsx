import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PlanBadge } from "@/components/ui/PlanBadge";
import { Switch } from "@/components/ui/switch";
import { Settings, TrendingUp, Upload, CheckCircle, LogOut, Trash2, X } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { useProfileStats } from "@/hooks/useProfileStats";

interface ProfileProps {
  user: User | null;
  userProfile: { 
    first_name: string | null;
    stance: string | null;
    learning_goals: string | null;
  } | null;
  userPlan: { plan_name: string | null; is_subscribed: boolean } | null;
  onUpgrade: () => void;
}

export const Profile = ({ user, userProfile, userPlan, onUpgrade }: ProfileProps) => {
  const { totalUploads, monthlyUploads, coachChats, loading } = useProfileStats(user);
  const getInitials = (email: string, firstName?: string | null) => {
    if (firstName) {
      return firstName.charAt(0).toUpperCase();
    }
    return email.charAt(0).toUpperCase();
  };

  const getName = (email: string, firstName?: string | null) => {
    if (firstName) {
      return firstName;
    }
    return email.split('@')[0];
  };

  const summarizeGoals = (goals?: string | null) => {
    if (!goals) return null;
    // Extract first 2-3 meaningful words
    const words = goals.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 2)
      .slice(0, 3);
    return words.join(' ');
  };

  const isPro = userPlan?.plan_name === 'pro' || userPlan?.is_subscribed;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-2xl font-extralight text-gray-900">Profile</h1>
        <p className="text-gray-600">Manage your account and preferences</p>
      </div>

      {/* Account Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium text-gray-900">Account</h2>
          <Settings className="h-5 w-5 text-gray-600" />
        </div>
        <Card className="bg-white border-gray-200">
          <CardContent className="space-y-6 pt-6">
            {/* Profile Info */}
            <div className="flex items-center space-x-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src="" />
                <AvatarFallback className="bg-gray-100 text-gray-600 text-lg font-medium">
                  {user?.email ? getInitials(user.email, userProfile?.first_name) : "U"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="font-medium text-gray-900">
                  {user?.email ? getName(user.email, userProfile?.first_name) : "User"}
                </p>
                <p className="text-sm text-gray-600">{user?.email}</p>
                <p className="text-sm text-gray-500">Skating since 2020</p>
              </div>
            </div>
            
            {/* Stance and Goals */}
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Stance</p>
                <p className="text-sm text-gray-900 mt-1 capitalize">
                  {userProfile?.stance || 'Not set'}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Goals</p>
                <p className="text-sm text-gray-900 mt-1 capitalize">
                  {summarizeGoals(userProfile?.learning_goals) || 'Not set'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Subscription Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium text-gray-900">Subscription</h2>
          {isPro && <Settings className="h-5 w-5 text-gray-600" />}
        </div>
        <Card className="bg-white border-gray-200">
          <CardContent className="space-y-4 pt-6">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <PlanBadge plan={userPlan?.plan_name || 'free'} />
              </div>
              {isPro ? (
                <p className="text-xs text-gray-600 mt-1">
                  $5.00/month | Renews October 16, 2025
                </p>
              ) : (
                <p className="text-xs text-gray-600 mt-1">
                  Upgrade to Pro for just $5/month and get unlimited uploads and more.
                </p>
              )}
            </div>
            {isPro ? (
              <div className="flex-shrink-0">
                <Badge variant="pro">
                  Active
                </Badge>
              </div>
            ) : (
              <div className="flex-shrink-0">
                <Button 
                  onClick={onUpgrade}
                  size="sm"
                  className="bg-gray-900 hover:bg-gray-800 text-white"
                >
                  Go Pro
                </Button>
              </div>
            )}
          </div>
          
          {isPro ? (
            <div className="space-y-3 pt-4 border-t border-gray-100">
              <h4 className="font-medium text-gray-900">Features</h4>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm text-gray-600">Unlimited video uploads</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm text-gray-600">Advanced trick analysis</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm text-gray-600">Personalized coaching</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm text-gray-600">Daily trick tips</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm text-gray-600">Access to top weekly tricks</span>
                </div>
              </div>
              
              {/* Usage Stats */}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Videos Uploaded</p>
                  <p className="text-sm text-gray-900 mt-1">{loading ? "..." : totalUploads}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Coach Chats</p>
                  <p className="text-sm text-gray-900 mt-1">{loading ? "..." : coachChats}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3 pt-4 border-t border-gray-100">
              <h4 className="font-medium text-gray-900">Features</h4>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm text-gray-600">5 video uploads per month</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm text-gray-600">Coaching feedback on uploaded videos</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm text-gray-600">Access to top weekly tricks</span>
                </div>
                <div className="flex items-center space-x-2">
                  <X className="h-4 w-4 text-red-400" />
                  <span className="text-sm text-gray-600">Unlimited video uploads</span>
                </div>
                <div className="flex items-center space-x-2">
                  <X className="h-4 w-4 text-red-400" />
                  <span className="text-sm text-gray-600">Advanced trick analysis</span>
                </div>
                <div className="flex items-center space-x-2">
                  <X className="h-4 w-4 text-red-400" />
                  <span className="text-sm text-gray-600">Personalized coaching</span>
                </div>
                <div className="flex items-center space-x-2">
                  <X className="h-4 w-4 text-red-400" />
                  <span className="text-sm text-gray-600">Daily trick tips</span>
                </div>
              </div>
              
              {/* Usage Stats */}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Videos Uploaded</p>
                  <p className="text-sm text-gray-900 mt-1">{loading ? "..." : totalUploads}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Monthly Upload Limit</p>
                  <p className="text-sm text-gray-900 mt-1">{loading ? "..." : `${monthlyUploads}/5`}</p>
                </div>
              </div>
            </div>
          )}
          </CardContent>
        </Card>
      </div>

      {/* Saved Tips Section - Pro Only */}
      {isPro && (
        <div className="space-y-3">
          <h2 className="text-lg font-medium text-gray-900">Saved Tips</h2>
          <Card className="bg-white border-gray-200">
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <p className="text-gray-500">No saved tips yet</p>
                <p className="text-sm text-gray-400 mt-1">Tips you save will appear here</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Preferences Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium text-gray-900">Preferences</h2>
          <Settings className="h-5 w-5 text-gray-600" />
        </div>
          <Card className="bg-white border-gray-200">
          <CardContent className="space-y-4 pt-6">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-gray-900">Push Notifications</h4>
              <p className="text-sm text-gray-600">Get notified about new tips and updates</p>
            </div>
            <Switch />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-gray-900">Camera Access</h4>
              <p className="text-sm text-gray-600">Allow app to access your camera</p>
            </div>
            <Switch defaultChecked />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-gray-900">Microphone</h4>
              <p className="text-sm text-gray-600">Allow app to access your microphone</p>
            </div>
            <Switch defaultChecked />
          </div>
          </CardContent>
        </Card>
      </div>

      {/* Account Actions */}
      <div className="space-y-2">
        <Button variant="ghost" className="w-full justify-start text-gray-500 hover:text-gray-700 hover:bg-gray-50">
          <LogOut className="w-4 h-4 mr-2" />
          Sign Out
        </Button>
        <Button variant="ghost" className="w-full justify-start text-gray-400 hover:text-red-600 hover:bg-red-50">
          <Trash2 className="w-4 h-4 mr-2" />
          Delete Account
        </Button>
      </div>
    </div>
  );
};