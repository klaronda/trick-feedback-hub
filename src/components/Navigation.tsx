import { Button } from "@/components/ui/button";
import { Home, Video, MessageCircle, User } from "lucide-react";
import { memo } from "react";

interface NavigationProps {
  currentView: 'home' | 'videos' | 'coach' | 'profile';
  onNavigate: (view: 'home' | 'videos' | 'coach' | 'profile') => void;
}

const Navigation = memo(({ currentView, onNavigate }: NavigationProps) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200">
      <div className="flex items-center justify-around py-[11px] px-4 max-w-sm mx-auto">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onNavigate('home')}
          className={`flex flex-col items-center gap-1 h-auto px-4 py-2 rounded-full border transition-all ${
            currentView === 'home' 
              ? 'text-black bg-gray-100 border-gray-300 hover:bg-gray-100 hover:border-gray-400' 
              : 'text-gray-600 border-transparent hover:text-black hover:bg-gray-50 hover:border-gray-300'
          }`}
        >
          <Home className="w-5 h-5" />
          <span className="text-xs font-medium">Home</span>
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onNavigate('videos')}
          className={`flex flex-col items-center gap-1 h-auto px-4 py-2 rounded-full border transition-all ${
            currentView === 'videos' 
              ? 'text-black bg-gray-100 border-gray-300 hover:bg-gray-100 hover:border-gray-400' 
              : 'text-gray-600 border-transparent hover:text-black hover:bg-gray-50 hover:border-gray-300'
          }`}
        >
          <Video className="w-5 h-5" />
          <span className="text-xs font-medium">Videos</span>
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onNavigate('coach')}
          className={`flex flex-col items-center gap-1 h-auto px-4 py-2 rounded-full border transition-all ${
            currentView === 'coach' 
              ? 'text-black bg-gray-100 border-gray-300 hover:bg-gray-100 hover:border-gray-400' 
              : 'text-gray-600 border-transparent hover:text-black hover:bg-gray-50 hover:border-gray-300'
          }`}
        >
          <MessageCircle className="w-5 h-5" />
          <span className="text-xs font-medium">Coach</span>
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onNavigate('profile')}
          className={`flex flex-col items-center gap-1 h-auto px-4 py-2 rounded-full border transition-all ${
            currentView === 'profile' 
              ? 'text-black bg-gray-100 border-gray-300 hover:bg-gray-100 hover:border-gray-400' 
              : 'text-gray-600 border-transparent hover:text-black hover:bg-gray-50 hover:border-gray-300'
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