import { Button } from "@/components/ui/button";
import { Home, Video, MessageCircle, User } from "lucide-react";

interface NavigationProps {
  currentView: 'home' | 'videos' | 'coach' | 'profile';
  onNavigate: (view: 'home' | 'videos' | 'coach' | 'profile') => void;
}

export const Navigation = ({ currentView, onNavigate }: NavigationProps) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-border">
      <div className="flex items-center justify-around py-2 px-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onNavigate('home')}
          className={`flex flex-col items-center gap-1 p-3 ${
            currentView === 'home' ? 'text-primary' : 'text-muted-foreground'
          }`}
        >
          <Home className="w-5 h-5" />
          <span className="text-xs font-medium">Home</span>
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onNavigate('videos')}
          className={`flex flex-col items-center gap-1 p-3 ${
            currentView === 'videos' ? 'text-primary' : 'text-muted-foreground'
          }`}
        >
          <Video className="w-5 h-5" />
          <span className="text-xs font-medium">Videos</span>
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onNavigate('coach')}
          className={`flex flex-col items-center gap-1 p-3 ${
            currentView === 'coach' ? 'text-primary' : 'text-muted-foreground'
          }`}
          disabled
        >
          <MessageCircle className="w-5 h-5" />
          <span className="text-xs font-medium">Coach</span>
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onNavigate('profile')}
          className={`flex flex-col items-center gap-1 p-3 ${
            currentView === 'profile' ? 'text-primary' : 'text-muted-foreground'
          }`}
          disabled
        >
          <User className="w-5 h-5" />
          <span className="text-xs font-medium">Profile</span>
        </Button>
      </div>
    </nav>
  );
};