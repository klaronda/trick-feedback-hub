import { Button } from "@/components/ui/button";
import { Home, Video } from "lucide-react";

interface NavigationProps {
  currentView: 'home' | 'clips';
  onNavigate: (view: 'home' | 'clips') => void;
}

export const Navigation = ({ currentView, onNavigate }: NavigationProps) => {
  return (
    <nav className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50">
      <div className="bg-card border border-border rounded-full p-2 shadow-lg">
        <div className="flex gap-2">
          <Button
            variant={currentView === 'home' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onNavigate('home')}
            className="rounded-full"
          >
            <Home className="w-4 h-4" />
            <span className="hidden sm:inline ml-2">Home</span>
          </Button>
          <Button
            variant={currentView === 'clips' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onNavigate('clips')}
            className="rounded-full"
            disabled
          >
            <Video className="w-4 h-4" />
            <span className="hidden sm:inline ml-2">My Clips</span>
          </Button>
        </div>
      </div>
    </nav>
  );
};