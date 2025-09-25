import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PlanBadge } from "@/components/ui/PlanBadge";
import { Toggle } from "@/components/ui/toggle";
import { Settings, TrendingUp, Upload, CheckCircle, LogOut, Trash2, X, Heart } from "lucide-react";
import { SavedTipCard } from '@/components/SavedTipCard';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { User } from "@supabase/supabase-js";
import { useProfileStats } from "@/hooks/useProfileStats";
import { useSavedTips } from "@/hooks/useSavedTips";
import { useGoalsSummary } from "@/hooks/useGoalsSummary";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { ConfirmationModal } from "./ConfirmationModal";
import { TrickTipModal } from "./TrickTipModal";
import { EditProfileModal } from "./EditProfileModal";
import { AccountPreferencesModal } from "./AccountPreferencesModal";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
// import { toast } from "sonner"; // Removed to reduce toast notifications

interface ProfileProps {
  user: User | null;
  userProfile: { 
    first_name: string | null;
    last_name: string | null;
    stance: string | null;
    learning_goals: string | null;
    profile_image_url: string | null;
  } | null;
  userPlan: { plan_name: string | null; is_subscribed: boolean } | null;
  onUpgrade: () => void;
  onSignOut: () => void;
  onProfileUpdate: () => void;
}

export const Profile = ({ user, userProfile, userPlan, onUpgrade, onSignOut, onProfileUpdate }: ProfileProps) => {
  const { totalUploads, monthlyUploads, coachChats, loading } = useProfileStats(user);
  const { savedTips, loading: tipsLoading, unsaveTip, togglePin, canUnsaveFromHomepage } = useSavedTips();
  const { preferences, isLoading: preferencesLoading } = useUserPreferences();
  const [showDeleteTipModal, setShowDeleteTipModal] = useState(false);
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);
  const [showConfirmDeleteModal, setShowConfirmDeleteModal] = useState(false);
  const [showSignOutModal, setShowSignOutModal] = useState(false);
  const [showPreferencesModal, setShowPreferencesModal] = useState(false);
  const [tipToDelete, setTipToDelete] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedTrickTip, setSelectedTrickTip] = useState<any>(null);
  const [showTrickTipModal, setShowTrickTipModal] = useState(false);
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
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

  const { summary: goalsSummary, loading: summaryLoading } = useGoalsSummary(userProfile?.learning_goals);

  const isPro = userPlan?.plan_name === 'pro' || userPlan?.is_subscribed;

  // Helper function to organize tips by sections
  const organizeTipsBySection = () => {
    const pinnedTips = savedTips.filter(tip => tip.is_pinned);
    const unpinnedTips = savedTips.filter(tip => !tip.is_pinned);
    
    // Group unpinned tips by month/year
    const tipsByMonth = unpinnedTips.reduce((acc, tip) => {
      const date = new Date(tip.created_at);
      const monthYear = date.toLocaleDateString('en-US', { 
        month: 'long', 
        year: 'numeric' 
      });
      
      if (!acc[monthYear]) {
        acc[monthYear] = [];
      }
      acc[monthYear].push(tip);
      return acc;
    }, {} as Record<string, typeof savedTips>);

    return { pinnedTips, tipsByMonth };
  };

  const { pinnedTips, tipsByMonth } = organizeTipsBySection();

  const handleDeleteTipClick = (savedTip: any) => {
    setTipToDelete(savedTip);
    setShowDeleteTipModal(true);
  };

  const handleDeleteTip = async () => {
    if (!tipToDelete) return;
    await unsaveTip(tipToDelete.id);
    setShowDeleteTipModal(false);
    setTipToDelete(null);
  };

  const handleDeleteAccount = () => {
    setShowDeleteAccountModal(false);
    setShowConfirmDeleteModal(true);
  };

  const handleExpandTrickTip = (tip: any) => {
    setSelectedTrickTip(tip.tip);
    setShowTrickTipModal(true);
  };

  const handleSaveTrickTip = async (tip: any) => {
    // This will be handled by the modal if needed
  };

  const handleConfirmDeleteAccount = async () => {
    if (!user) return;
    
    setIsDeleting(true);
    try {
      // Delete user's trick attempts
      await supabase
        .from('trick_attempts')
        .delete()
        .eq('user_id', user.id);

      // Delete user's saved tips
      await supabase
        .from('saved_trick_tips')
        .delete()
        .eq('user_id', user.id);

      // Delete user profile
      await supabase
        .from('profiles')
        .delete()
        .eq('user_id', user.id);

      // Delete user record
      await supabase
        .from('users')
        .delete()
        .eq('id', user.id);

      // Sign out user
      await supabase.auth.signOut();
      
      // toast.success('Account deleted successfully');
      
      // Redirect will happen via auth state change
    } catch (error) {
      console.error('Error deleting account:', error);
      // toast.error('Failed to delete account. Please try again.');
    } finally {
      setIsDeleting(false);
      setShowConfirmDeleteModal(false);
    }
  };

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
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowEditProfileModal(true)}
            className="p-1 h-7 w-7 hover:bg-gray-100 rounded"
          >
            <Settings className="h-5 w-5 text-gray-600" />
          </Button>
        </div>
        <Card className="bg-white border-gray-200">
          <CardContent className="space-y-6 pt-6">
            {/* Profile Info */}
            <div className="flex items-center space-x-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={userProfile?.profile_image_url || ""} />
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
                  {summaryLoading ? 'Summarizing...' : goalsSummary}
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
                <h4 className="font-medium text-gray-900">
                  {isPro ? "Pro Plan" : "Free Plan"}
                </h4>
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
            <h2 className="text-lg font-normal text-gray-900">Saved Tips</h2>
            <Card className="bg-white border-gray-200">
              <CardContent className="pt-6">
                {tipsLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div key={i} className="animate-pulse">
                        <div className="h-16 bg-gray-200 rounded-lg"></div>
                      </div>
                    ))}
                  </div>
                ) : savedTips.length === 0 ? (
                  <div className="text-center py-8">
                    <Heart className="w-8 h-8 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No saved tips yet</p>
                    <p className="text-sm text-gray-400 mt-1">Tips you save will appear here</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Pinned Tips Section */}
                    {pinnedTips.length > 0 && (
                      <div>
                        <h3 className="text-sm font-medium text-gray-600 mb-3">Pinned Tips</h3>
                        <div className="space-y-2">
                          {pinnedTips.map((tip) => (
                             <SavedTipCard
                               key={tip.id}
                               tip={tip}
                               onDelete={handleDeleteTipClick}
                               onTogglePin={togglePin}
                               onExpandClick={handleExpandTrickTip}
                               showPinIcon={true}
                             />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Scrollable Tips Container */}
                    <div className="space-y-4">
                      {Object.entries(tipsByMonth).map(([monthYear, tips]) => (
                        <div key={monthYear}>
                          <h3 className="text-sm font-normal text-gray-700 mb-3">{monthYear}</h3>
                           <ScrollArea className="h-[400px]">
                             <div className="space-y-2">
                               {tips.slice(0, 6).map((tip, index) => (
                                 <div
                                   key={tip.id}
                                   className={index === 5 ? "opacity-50" : ""}
                                 >
                                   <SavedTipCard
                                     tip={tip}
                                     onDelete={handleDeleteTipClick}
                                     onTogglePin={togglePin}
                                     onExpandClick={handleExpandTrickTip}
                                     showPinIcon={true}
                                   />
                                 </div>
                               ))}
                              {tips.length > 6 && (
                                <div className="text-center py-2">
                                  <p className="text-sm text-gray-500">
                                    +{tips.length - 6} more tips...
                                  </p>
                                </div>
                              )}
                            </div>
                          </ScrollArea>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
      )}

      {/* Preferences Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium text-gray-900">Preferences</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowPreferencesModal(true)}
            className="p-1 h-7 w-7 hover:bg-gray-100 rounded"
          >
            <Settings className="h-5 w-5 text-gray-600" />
          </Button>
        </div>
          <Card className="bg-white border-gray-200">
          <CardContent className="space-y-4 pt-6">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-gray-900">Push Notifications</h4>
              <p className="text-sm text-gray-600">Get notified about new tips and updates</p>
            </div>
            <Toggle 
              pressed={preferences?.notifications_enabled ?? true} 
              disabled 
              onClick={() => setShowPreferencesModal(true)}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-gray-900">Camera Access</h4>
              <p className="text-sm text-gray-600">Allow app to access your camera</p>
            </div>
            <Toggle 
              pressed={preferences?.camera_access_enabled ?? true} 
              disabled 
              onClick={() => setShowPreferencesModal(true)}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-gray-900">Microphone</h4>
              <p className="text-sm text-gray-600">Allow app to access your microphone</p>
            </div>
            <Toggle 
              pressed={preferences?.microphone_access_enabled ?? true} 
              disabled 
              onClick={() => setShowPreferencesModal(true)}
            />
          </div>
          </CardContent>
        </Card>
      </div>

      {/* Account Actions */}
      <div className="space-y-2">
        <Button 
          variant="ghost" 
          className="w-full justify-start text-gray-500 hover:text-gray-700 hover:bg-gray-50"
          onClick={() => setShowSignOutModal(true)}
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sign Out
        </Button>
        <Button 
          variant="ghost" 
          className="w-full justify-start text-gray-400 hover:text-red-600 hover:bg-red-50"
          onClick={() => setShowDeleteAccountModal(true)}
          disabled={isDeleting}
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Delete Account
        </Button>
      </div>

      {/* Sign Out Confirmation Modal */}
      <ConfirmationModal
        isOpen={showSignOutModal}
        onClose={() => setShowSignOutModal(false)}
        onConfirm={onSignOut}
        title="Sign Out?"
        message="You'll need to sign in again to use SkateCoach."
        confirmText="Sign Out"
        cancelText="Cancel"
        isDestructive={false}
      />

      {/* Delete Saved Tip Modal */}
      <ConfirmationModal
        isOpen={showDeleteTipModal}
        onClose={() => {
          setShowDeleteTipModal(false);
          setTipToDelete(null);
        }}
        onConfirm={handleDeleteTip}
        title="Are you sure?"
        message={`This will remove "${tipToDelete?.tip?.headline || tipToDelete?.tip?.tip_text?.substring(0, 30) + '...' || 'this tip'}" from your saved tips.`}
        confirmText="Yes"
        cancelText="No"
        isDestructive={true}
      />

      {/* Delete Account Initial Modal */}
      <ConfirmationModal
        isOpen={showDeleteAccountModal}
        onClose={() => setShowDeleteAccountModal(false)}
        onConfirm={handleDeleteAccount}
        title="Delete Account?"
        message="Are you sure you want to delete your SkateCoach account?"
        confirmText="Yes"
        cancelText="No"
        isDestructive={true}
      />

      {/* Confirm Account Deletion Modal */}
      <ConfirmationModal
        isOpen={showConfirmDeleteModal}
        onClose={() => setShowConfirmDeleteModal(false)}
        onConfirm={handleConfirmDeleteAccount}
        title="Confirm Account Deletion"
        message={`Confirm you want to delete your SkateCoach account.

This action will permanently delete all your uploaded videos, coaching feedback, saved tips, activity history, and account information. This cannot be undone.`}
        confirmText="Confirm Delete"
        cancelText="No"
        isDestructive={true}
      />

      {/* Trick Tip Modal */}
      {selectedTrickTip && (
        <TrickTipModal
          tip={selectedTrickTip}
          isOpen={showTrickTipModal}
          onClose={() => {
            setShowTrickTipModal(false);
            setSelectedTrickTip(null);
          }}
          onSave={handleSaveTrickTip}
        />
      )}

      {/* Edit Profile Modal */}
      <EditProfileModal
        isOpen={showEditProfileModal}
        onClose={() => setShowEditProfileModal(false)}
        user={user}
        userProfile={userProfile}
        onProfileUpdate={onProfileUpdate}
      />

      {/* Account Preferences Modal */}
      <AccountPreferencesModal
        isOpen={showPreferencesModal}
        onClose={() => setShowPreferencesModal(false)}
      />
    </div>
  );
};