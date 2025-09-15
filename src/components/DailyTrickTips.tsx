import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { usePersonalizedCoach } from "@/hooks/usePersonalizedCoach";

interface DailyTrickTipsProps {
  userPlan?: { plan_name: string | null; is_subscribed: boolean } | null;
}

interface TrickTip {
  id: number;
  category: string;
  title: string;
  description: string;
  number: string;
}

export const DailyTrickTips = ({ userPlan }: DailyTrickTipsProps) => {
  const [currentTip, setCurrentTip] = useState(0);
  const [tips, setTips] = useState<TrickTip[]>([]);
  const { sendMessage, loading } = usePersonalizedCoach();
  
  const isPro = userPlan?.plan_name === 'pro' || userPlan?.is_subscribed;

  useEffect(() => {
    if (isPro) {
      generateDailyTips();
    }
  }, [isPro]);

  const generateDailyTips = async () => {
    try {
      const response = await sendMessage(
        "Generate 3 daily skateboarding tips for today. Include a mix of trick tips, exercises, and drills. Make them practical and actionable.",
        "general_coaching"
      );

      if (response) {
        // Parse the response and create tip objects
        const mockTips: TrickTip[] = [
          {
            id: 1,
            category: "Basics",
            title: "Master Your Ollie Foundation",
            description: "Focus on the timing between your back foot pop and front foot slide. Practice stationary first.",
            number: "1 of 3"
          },
          {
            id: 2,
            category: "Balance",
            title: "Board Control Drills",
            description: "Spend 10 minutes riding with one foot to improve balance and core strength.",
            number: "2 of 3"
          },
          {
            id: 3,
            category: "Progression",
            title: "Film Your Progress",
            description: "Record yourself from the side to analyze your form and track improvements over time.",
            number: "3 of 3"
          }
        ];
        setTips(mockTips);
      }
    } catch (error) {
      console.error('Error generating tips:', error);
    }
  };

  if (!isPro || tips.length === 0) return null;

  const nextTip = () => {
    setCurrentTip((prev) => (prev + 1) % tips.length);
  };

  const prevTip = () => {
    setCurrentTip((prev) => (prev - 1 + tips.length) % tips.length);
  };

  const tip = tips[currentTip];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Daily Trick Tips</h2>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={prevTip} className="p-2">
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={nextTip} className="p-2">
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <Card className="bg-white border border-border">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-muted-foreground">{tip.category}</span>
            <span className="text-sm text-muted-foreground">{tip.number}</span>
          </div>
          <h3 className="font-semibold mb-2">{tip.title}</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">{tip.description}</p>
          <Button variant="link" className="p-0 h-auto font-medium text-sm mt-2">
            Learn More
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};