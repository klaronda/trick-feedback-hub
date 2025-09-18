import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmationModal } from '@/components/ConfirmationModal';
import { Pin, Trash2 } from 'lucide-react';
import expandIcon from '@/assets/expand.svg';

interface SavedTipCardProps {
  tip: {
    id: number;
    tip: any;
    created_at: string;
    is_pinned?: boolean;
  };
  onDelete: (tip: any) => void;
  onTogglePin: (tipId: number) => Promise<boolean>;
  showPinIcon?: boolean;
  onExpandClick?: (tip: any) => void;
}

export function SavedTipCard({ tip, onDelete, onTogglePin, showPinIcon = true, onExpandClick }: SavedTipCardProps) {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  
  const tipData = tip.tip;
  const formattedDate = new Date(tip.created_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  const handleTogglePin = async () => {
    if (!showPinIcon) return;
    
    setIsToggling(true);
    try {
      await onTogglePin(tip.id);
    } catch (error) {
      console.error('Error toggling pin:', error);
    } finally {
      setIsToggling(false);
    }
  };

  const handleDelete = () => {
    onDelete(tip);
    setShowDeleteModal(false);
  };

  // Badge logic matching Daily Tips component
  const badgeText = tipData?.badge_category || tipData?.tags?.[0] || tipData?.difficulty;

  return (
    <>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          {/* Title row with pin and expand controls */}
          <div className="flex items-start justify-between mb-2">
            <h3 className="text-sm font-semibold text-gray-900 flex-1 pr-2">
              {tipData?.headline || 'Untitled Tip'}
            </h3>
            
            <div className="flex items-center gap-1 shrink-0">
              {showPinIcon && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleTogglePin}
                  disabled={isToggling}
                  className="p-1 h-7 w-7 hover:bg-gray-100 rounded"
                >
                  <Pin 
                    className={`h-4 w-4 transition-colors ${
                      tip.is_pinned 
                        ? 'fill-gray-900' 
                        : 'text-gray-500'
                    }`}
                  />
                </Button>
              )}
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onExpandClick?.(tip)}
                className="p-1 h-7 w-7 text-gray-500 hover:bg-gray-100 rounded"
              >
                <img src={expandIcon} alt="Expand" className="h-4 w-4" />
              </Button>
            </div>
          </div>

        {/* Teaser text */}
        <p className="text-sm text-gray-600 mb-4 leading-relaxed">
          {tipData?.teaser_text || tipData?.tip_text || 'No description available'}
        </p>
        
        {/* Bottom row with badge, timestamp, and trash */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {badgeText && (
              <Badge variant="pending" className="text-xs">
                {badgeText}
              </Badge>
            )}
            <span className="text-xs text-gray-600">
              {formattedDate}
            </span>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowDeleteModal(true)}
            className="p-1 h-7 w-7 text-red-400 hover:text-red-600 hover:bg-red-50 rounded"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <ConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        title="Remove Saved Tip"
        message="Are you sure you want to remove this tip from your saved tips? This action cannot be undone."
        confirmText="Remove"
        cancelText="Cancel"
      />
    </>
  );
}