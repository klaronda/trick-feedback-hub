import { ReactNode, useEffect, useState } from "react";

interface ViewTransitionProps {
  children: ReactNode;
  viewKey: string;
  className?: string;
}

export const ViewTransition = ({ children, viewKey, className = "" }: ViewTransitionProps) => {
  const [isVisible, setIsVisible] = useState(true);
  const [currentKey, setCurrentKey] = useState(viewKey);

  useEffect(() => {
    if (viewKey !== currentKey) {
      // Start fade out
      setIsVisible(false);
      
      // After fade out completes, update content and fade in
      const timer = setTimeout(() => {
        setCurrentKey(viewKey);
        setIsVisible(true);
      }, 200); // Match fade-out duration
      
      return () => clearTimeout(timer);
    }
  }, [viewKey, currentKey]);

  return (
    <div 
      className={`transition-all duration-300 ease-out ${
        isVisible 
          ? "opacity-100 translate-y-0" 
          : "opacity-0 -translate-y-2"
      } ${className}`}
    >
      {currentKey === viewKey ? children : null}
    </div>
  );
};