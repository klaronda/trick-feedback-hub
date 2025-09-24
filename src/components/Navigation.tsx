import { Button } from "@/components/ui/button";
import { Home, Video, MessageCircle, User } from "lucide-react";
import { memo } from "react";

interface NavigationProps {
  currentView: 'home' | 'videos' | 'coach' | 'profile';
  onNavigate: (view: 'home' | 'videos' | 'coach' | 'profile') => void;
}

const Navigation = memo(({ currentView, onNavigate }: NavigationProps) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-border transition-all duration-300">
      <div className="flex items-center justify-around py-[11px] px-4 max-w-sm mx-auto">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onNavigate('home')}
          className={`flex flex-col items-center gap-1 h-auto px-4 py-2 rounded-full border transition-all duration-300 ease-out transform ${
            currentView === 'home' 
              ? 'text-foreground bg-muted border-border scale-105 shadow-sm' 
              : 'text-muted-foreground border-transparent hover:text-foreground hover:bg-muted/50 hover:border-border hover:scale-102'
          }`}
        >
          <Home className="w-5 h-5" />
          <span className="text-xs font-medium">Home</span>
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onNavigate('videos')}
          className={`flex flex-col items-center gap-1 h-auto px-4 py-2 rounded-full border transition-all duration-300 ease-out transform ${
            currentView === 'videos' 
              ? 'text-foreground bg-muted border-border scale-105 shadow-sm' 
              : 'text-muted-foreground border-transparent hover:text-foreground hover:bg-muted/50 hover:border-border hover:scale-102'
          }`}
        >
          <Video className="w-5 h-5" />
          <span className="text-xs font-medium">Videos</span>
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onNavigate('coach')}
          className={`flex flex-col items-center gap-1 h-auto px-4 py-2 rounded-full border transition-all duration-300 ease-out transform ${
            currentView === 'coach' 
              ? 'text-foreground bg-muted border-border scale-105 shadow-sm' 
              : 'text-muted-foreground border-transparent hover:text-foreground hover:bg-muted/50 hover:border-border hover:scale-102'
          }`}
        >
          <MessageCircle className="w-5 h-5" />
          <span className="text-xs font-medium">Coach</span>
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onNavigate('profile')}
          className={`flex flex-col items-center gap-1 h-auto px-4 py-2 rounded-full border transition-all duration-300 ease-out transform ${
            currentView === 'profile' 
              ? 'text-foreground bg-muted border-border scale-105 shadow-sm' 
              : 'text-muted-foreground border-transparent hover:text-foreground hover:bg-muted/50 hover:border-border hover:scale-102'
          }`}
        >
          <User className="w-5 h-5" />
          <span className="text-xs font-medium">Profile</span>
        </Button>
      </div>
    </nav>
  );
});

Navigation.displayName = "Navigation";

export { Navigation };