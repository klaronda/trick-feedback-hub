import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PlanBadge } from "@/components/ui/PlanBadge";
import { Switch } from "@/components/ui/switch";
import { Settings, TrendingUp, Upload, CheckCircle, LogOut, Trash2 } from "lucide-react";
import type { User } from "@supabase/supabase-js";

interface ProfileProps {
  user: User | null;
  userProfile: { first_name: string | null } | null;
  userPlan: { plan_name: string | null; is_subscribed: boolean } | null;
  onUpgrade: () => void;
}

export const Profile = ({ user, userProfile, userPlan, onUpgrade }: ProfileProps) => {
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

  const isPro = userPlan?.plan_name === 'pro' || userPlan?.is_subscribed;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-2xl font-extralight text-gray-900">Profile</h1>
        <p className="text-gray-600">Manage your account and preferences</p>
      </div>

      {/* Account Section */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src="" />
              <AvatarFallback className="bg-gray-100 text-gray-600 text-lg font-medium">
                {user?.email ? getInitials(user.email, userProfile?.first_name) : "U"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h3 className="font-medium text-gray-900">
                {user?.email ? getName(user.email, userProfile?.first_name) : "User"}
              </h3>
              <p className="text-sm text-gray-600">{user?.email}</p>
              <p className="text-sm text-gray-500">Skating since 2020</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Section */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Upload className="h-5 w-5 text-gray-600" />
              <div>
                <p className="text-2xl font-bold text-gray-900">0</p>
                <p className="text-sm text-gray-600">Videos Uploaded</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-gray-600" />
              <div>
                <p className="text-2xl font-bold text-gray-900">-</p>
                <p className="text-sm text-gray-600">Avg Score</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Subscription Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <CardTitle className="text-lg">Subscription</CardTitle>
          <Settings className="h-5 w-5 text-gray-600" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-medium text-gray-900">Current Plan</h3>
                <PlanBadge plan={userPlan?.plan_name || 'free'} />
              </div>
            </div>
          </div>
          
          {isPro ? (
            <div className="space-y-3">
              <h4 className="font-medium text-gray-900">Pro Features</h4>
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
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-gray-600">Upgrade to Pro for unlimited uploads and advanced features</p>
              <Button onClick={onUpgrade} className="w-full">
                Upgrade to Pro
              </Button>
            </div>
          )}
          
          <div className="pt-2 border-t">
            <p className="text-sm text-gray-600">Monthly Usage: 0/5 uploads</p>
          </div>
        </CardContent>
      </Card>

      {/* Saved Tips Section */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Saved Tips</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-gray-500">No saved tips yet</p>
            <p className="text-sm text-gray-400 mt-1">Tips you save will appear here</p>
          </div>
        </CardContent>
      </Card>

      {/* Preferences Section */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Preferences</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
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

      {/* Account Actions */}
      <div className="space-y-3">
        <Button variant="outline" className="w-full justify-start text-red-600 border-red-200 hover:bg-red-50">
          <Trash2 className="w-4 h-4 mr-2" />
          Delete Account
        </Button>
        <Button variant="outline" className="w-full justify-start">
          <LogOut className="w-4 h-4 mr-2" />
          Sign Out
        </Button>
      </div>
    </div>
  );
};