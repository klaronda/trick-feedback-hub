import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
// import { useToast } from "@/components/ui/use-toast"; // Removed to reduce toast notifications
import { useQuery } from "@tanstack/react-query";

interface DailyTrickTipsProps {
  userPlan?: { plan_name: string | null; is_subscribed: boolean } | null;
  onTipClick?: (tip: TrickTip) => void;
}

interface TrickTip {
  id: string;
  headline?: string;
  teaser_text?: string;
  detailed_content?: string;
  badge_category?: string;
  greeting: string | null;
  tip_text: string;
  actionable_step: string;
  safety_note: string | null;
  difficulty: string;
  tags: string[];
  estimated_time_min: number;
  generated_at: string;
}

interface TipSlot {
  slot: number;
  tip: TrickTip;
}

export const DailyTrickTips = ({ userPlan, onTipClick }: DailyTrickTipsProps) => {
  const [currentTip, setCurrentTip] = useState(0);
  const [seenSlots, setSeenSlots] = useState<number[]>([]);
  // const { toast } = useToast(); // Removed to reduce toast notifications
  
  const isPro = userPlan?.plan_name === 'pro' || userPlan?.is_subscribed;

  // Use React Query for caching daily tips
  const { data: tips = [], isLoading: loading, error } = useQuery({
    queryKey: ['daily-tips', isPro],
    queryFn: async () => {
      if (!isPro) return [];
      
      const { data, error } = await supabase.functions.invoke('generate-daily-tips', {
        body: { seenSlots }
      });

      if (error) throw error;
      
      if (data.success && data.tips) {
        // Mark first tip as seen when loaded
        if (data.tips.length > 0 && !seenSlots.includes(1)) {
          setSeenSlots(prev => [...prev, 1]);
        }
        return data.tips;
      }
      return [];
    },
    enabled: isPro,
    staleTime: 1000 * 60 * 60, // Cache for 1 hour
    gcTime: 1000 * 60 * 60 * 24, // Keep in cache for 24 hours
  });

  useEffect(() => {
    if (error) {
      console.error('Error loading daily tips:', error);
      // toast({
      //   title: "Error loading tips",
      //   description: "Failed to load your daily trick tips. Please try again.",
      //   variant: "destructive",
      // });
    }
  }, [error]);

  const handleLearnMore = (tip: TrickTip) => {
    if (onTipClick) {
      onTipClick(tip);
    }
  };

  if (!isPro) return null;

  const nextTip = () => {
    const newIndex = (currentTip + 1) % tips.length;
    setCurrentTip(newIndex);
    const newSlot = tips[newIndex]?.slot;
    if (newSlot && !seenSlots.includes(newSlot)) {
      setSeenSlots(prev => [...prev, newSlot]);
    }
  };

  const prevTip = () => {
    const newIndex = (currentTip - 1 + tips.length) % tips.length;
    setCurrentTip(newIndex);
    const newSlot = tips[newIndex]?.slot;
    if (newSlot && !seenSlots.includes(newSlot)) {
      setSeenSlots(prev => [...prev, newSlot]);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">Daily Trick Tips</h2>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" disabled className="p-2">
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" disabled className="p-2">
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
        <div className="bg-white rounded-[8px] border border-gray-200 p-4">
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="h-5 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-full"></div>
          </div>
        </div>
      </div>
    );
  }

  if (tips.length === 0) return null;

  const currentTipData = tips[currentTip];
  const tip = currentTipData?.tip;

  if (!tip) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium">Daily Trick Tips</h2>
        <div className="flex gap-2">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={prevTip} 
            disabled={tips.length <= 1}
            className="p-2 hover:bg-muted"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={nextTip} 
            disabled={tips.length <= 1}
            className="p-2 hover:bg-muted"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-[8px] border border-gray-200 p-4">
        <div className="flex items-start justify-between mb-2">
          <Badge variant="pending" className="text-xs">
            {tip.badge_category || tip.tags?.[0] || tip.difficulty}
          </Badge>
          <span className="text-xs text-gray-600">
            {currentTip + 1} of {tips.length}
          </span>
        </div>
        
        <h3 className="font-semibold text-sm text-gray-900 mb-2 line-clamp-1 mt-3">
          {tip.headline || "Practice Tip"}
        </h3>
        
        <p className="text-sm text-gray-600 mb-4 leading-relaxed">
          {tip.teaser_text || tip.tip_text}
        </p>
        
        <div className="flex justify-end">
          <button 
            onClick={() => handleLearnMore(tip)}
            className="p-0 h-auto font-medium text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            Learn More
          </button>
        </div>
      </div>
    </div>
  );
};