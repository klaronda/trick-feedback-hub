import { Bell, User, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface HeaderProps {
  userPlan?: { plan_name: string | null; is_subscribed: boolean } | null;
}

export const Header = ({ userPlan }: HeaderProps) => {
  const isPro = userPlan?.plan_name === 'pro' || userPlan?.is_subscribed;

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200">
      <div className="flex items-center justify-between px-4 py-4 max-w-sm mx-auto">
        {/* Logo */}
        <div className="flex items-center space-x-3">
          <div className="bg-gray-900 text-white rounded p-2 flex items-center justify-center">
            <Zap className="h-5 w-5" />
          </div>
          <h1 className="text-lg font-semibold text-gray-900">SkateCoach</h1>
        </div>

        {/* Right - Plan Badge, Notifications & Profile */}
        <div className="flex items-center gap-2">
          <Badge variant={isPro ? "pro" : "category"}>
            {isPro ? "Pro" : "Free"}
          </Badge>
          <Button variant="ghost" size="sm" className="p-1.5 text-gray-600 hover:text-gray-900">
            <Bell className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" className="p-1.5 text-gray-600 hover:text-gray-900">
            <User className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </header>
  );
};