import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Bookmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

interface DailyTrickTipsProps {
  userPlan?: { plan_name: string | null; is_subscribed: boolean } | null;
}

interface TrickTip {
  id: string;
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

export const DailyTrickTips = ({ userPlan }: DailyTrickTipsProps) => {
  const [currentTip, setCurrentTip] = useState(0);
  const [tips, setTips] = useState<TipSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [seenSlots, setSeenSlots] = useState<number[]>([]);
  const { toast } = useToast();
  
  const isPro = userPlan?.plan_name === 'pro' || userPlan?.is_subscribed;

  useEffect(() => {
    if (isPro) {
      loadDailyTips();
    }
  }, [isPro]);

  const loadDailyTips = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-daily-tips', {
        body: { seenSlots }
      });

      if (error) throw error;

      if (data.success && data.tips) {
        setTips(data.tips);
        // Mark first tip as seen when loaded
        if (data.tips.length > 0 && !seenSlots.includes(1)) {
          setSeenSlots(prev => [...prev, 1]);
        }
      }
    } catch (error) {
      console.error('Error loading daily tips:', error);
      toast({
        title: "Error loading tips",
        description: "Failed to load your daily trick tips. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const saveTip = async (tip: TrickTip) => {
    try {
      const { error } = await supabase.rpc('save_trick_tip', {
        tip_data: tip as any,
        source: 'daily-tips'
      });

      if (error) throw error;

      toast({
        title: "Tip saved!",
        description: "The tip has been saved to your profile.",
      });
    } catch (error) {
      console.error('Error saving tip:', error);
      toast({
        title: "Error saving tip", 
        description: "Failed to save the tip. Please try again.",
        variant: "destructive",
      });
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
          <h2 className="text-lg font-semibold">Daily Trick Tips</h2>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" disabled className="p-2">
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" disabled className="p-2">
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
        <div className="bg-card rounded-lg border p-4">
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-muted rounded w-1/4"></div>
            <div className="h-5 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-full"></div>
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
        <h2 className="text-lg font-semibold">Daily Trick Tips</h2>
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

      <div className="bg-card rounded-lg border p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-muted-foreground capitalize">
            {tip.tags[0] || tip.difficulty}
          </span>
          <span className="text-sm text-muted-foreground">
            {currentTip + 1} of {tips.length}
          </span>
        </div>
        
        {tip.greeting && (
          <p className="text-sm text-muted-foreground mb-2">{tip.greeting}</p>
        )}
        
        <p className="font-medium text-foreground mb-2 leading-relaxed">
          {tip.tip_text}
        </p>
        
        <p className="text-sm text-muted-foreground mb-3 leading-relaxed">
          {tip.actionable_step}
        </p>
        
        {tip.safety_note && (
          <p className="text-xs text-yellow-600 bg-yellow-50 p-2 rounded mb-3 leading-relaxed">
            ⚠️ {tip.safety_note}
          </p>
        )}
        
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            {tip.tags.slice(0, 3).map((tag, index) => (
              <span 
                key={index}
                className="text-xs px-2 py-1 bg-muted rounded-full"
              >
                {tag}
              </span>
            ))}
          </div>
          
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => saveTip(tip)}
            className="text-sm font-medium hover:bg-muted"
          >
            <Bookmark className="w-4 h-4 mr-1" />
            Save
          </Button>
        </div>
        
        {tip.estimated_time_min > 0 && (
          <p className="text-xs text-muted-foreground mt-2">
            Estimated time: {tip.estimated_time_min} minutes
          </p>
        )}
      </div>
    </div>
  );
};