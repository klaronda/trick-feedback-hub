import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
// Toast removed per user request
import { useQuery, useQueryClient } from "@tanstack/react-query";

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
  
  // Toast removed per user request
  const queryClient = useQueryClient();
  
  const isPro = userPlan?.plan_name === 'pro' || userPlan?.is_subscribed;
  
  console.log('DailyTrickTips userPlan:', userPlan);
  console.log('DailyTrickTips isPro:', isPro);

  // Use React Query for caching daily tips
  const { data: tips = [], isLoading: loading, error, refetch } = useQuery({
    queryKey: ['daily-tips', isPro],
    queryFn: async () => {
      if (!isPro) {
        console.log('Not pro user, skipping daily tips');
        return [];
      }
      
      console.log('Fetching daily tips for pro user, seenSlots:', seenSlots);
      
      const { data, error } = await supabase.functions.invoke('generate-daily-tips', {
        body: { seenSlots }
      });

      console.log('Daily tips response:', { data, error });

      if (error) {
        console.error('Daily tips function error:', error);
        throw error;
      }
      
      if (data.success && data.tips) {
        console.log('Successfully loaded tips:', data.tips);
        // Mark first tip as seen when loaded
        if (data.tips.length > 0 && !seenSlots.includes(1)) {
          setSeenSlots(prev => [...prev, 1]);
        }
        return data.tips;
      }
      
      console.log('No tips returned or unsuccessful response');
      return [];
    },
    enabled: isPro,
    staleTime: 1000 * 60 * 30, // Cache for 30 minutes (reduced from 1 hour)
    gcTime: 1000 * 60 * 60 * 24, // Keep in cache for 24 hours
    refetchInterval: 1000 * 60 * 30, // Auto-refetch every 30 minutes
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

  if (tips.length === 0) {
    console.log('No tips available, showing empty state');
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-medium">Daily Trick Tips</h2>
        <div className="bg-white rounded-[8px] border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">No daily tips available. New tips will be generated for you soon!</p>
            <button 
              onClick={() => refetch()}
              className="text-xs text-blue-600 hover:text-blue-800 underline"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

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
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => refetch()}
            className="p-2 hover:bg-muted ml-1"
            title="Refresh tips"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
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