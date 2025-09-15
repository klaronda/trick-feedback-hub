import { Bell, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface HeaderProps {
  userPlan?: { plan_name: string | null; is_subscribed: boolean } | null;
}

export const Header = ({ userPlan }: HeaderProps) => {
  const isPro = userPlan?.plan_name === 'pro' || userPlan?.is_subscribed;

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-border">
      <div className="flex items-center justify-between px-6 py-4">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm">S</span>
          </div>
          <span className="font-semibold text-lg">SkateCoach</span>
        </div>

        {/* Center - Plan Badge */}
        <Badge variant={isPro ? "default" : "secondary"} className={
          isPro 
            ? "bg-blue-500 text-white hover:bg-blue-600" 
            : "bg-green-500 text-white hover:bg-green-600"
        }>
          {isPro ? "Pro" : "Free"}
        </Badge>

        {/* Right - Notifications & Profile */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" className="p-2">
            <Bell className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="sm" className="p-2">
            <User className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </header>
  );
};