import React from 'react';
import { Pin } from 'lucide-react';
import pinFilledSvg from '@/assets/pin-filled.svg';

interface PinIconProps {
  filled?: boolean;
  className?: string;
}

export function PinIcon({ filled = false, className = "h-4 w-4" }: PinIconProps) {
  if (filled) {
    return (
      <img 
        src={pinFilledSvg} 
        alt="Pinned" 
        className={className}
      />
    );
  }
  
  return <Pin className={`${className} text-gray-500`} />;
}