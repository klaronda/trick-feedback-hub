import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmationModal } from '@/components/ConfirmationModal';
import { Pin, ChevronRight, Trash2 } from 'lucide-react';

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
}

export function SavedTipCard({ tip, onDelete, onTogglePin, showPinIcon = true }: SavedTipCardProps) {
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

  return (
    <>
      <div className="flex items-start justify-between p-4 border border-border rounded-lg bg-card hover:bg-accent/5 transition-colors">
        {/* Left side content */}
        <div className="flex-1 min-w-0 pr-4">
          <h3 className="font-semibold text-card-foreground mb-1 line-clamp-2">
            {tipData?.headline || 'Untitled Tip'}
          </h3>
          
          <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
            {tipData?.teaser_text || tipData?.tip_text || 'No description available'}
          </p>
          
          <div className="flex items-center gap-2">
            {tipData?.badge_category && (
              <Badge variant="secondary" className="text-xs">
                {tipData.badge_category}
              </Badge>
            )}
            <span className="text-xs text-muted-foreground">
              {formattedDate}
            </span>
          </div>
        </div>

        {/* Right side controls */}
        <div className="flex flex-col items-end justify-between h-full min-h-[80px] shrink-0">
          {/* Top controls */}
          <div className="flex items-center gap-2">
            {showPinIcon && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleTogglePin}
                disabled={isToggling}
                className="p-1 h-8 w-8 hover:bg-accent"
              >
                <Pin 
                  className={`h-4 w-4 transition-colors ${
                    tip.is_pinned 
                      ? 'fill-foreground text-foreground' 
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                />
              </Button>
            )}
            
            <Button
              variant="ghost"
              size="sm"
              className="p-1 h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-accent"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Bottom control */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowDeleteModal(true)}
            className="p-1 h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
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