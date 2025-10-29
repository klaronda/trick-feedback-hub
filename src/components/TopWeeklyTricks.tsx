import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

interface TrickData {
  trick_name: string;
  count: number;
}

export const TopWeeklyTricks = () => {
  const [topTricks, setTopTricks] = useState<TrickData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Using mock data by default since no video uploads yet
    const mockTricks = [
      { trick_name: "Ollie", count: 12 },
      { trick_name: "Kickflip", count: 9 },
      { trick_name: "Shuvit", count: 7 },
      { trick_name: "Frontside 180", count: 5 },
      { trick_name: "Heelflip", count: 3 }
    ];
    
    setTopTricks(mockTricks);
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-6 w-40 bg-gray-200 rounded animate-pulse" />
        <div className="bg-white rounded-[8px] border border-gray-200 p-4 space-y-4">
          {Array(5).fill(0).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
              <div className="h-2 w-full bg-gray-100 rounded-full animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const maxCount = Math.max(...topTricks.map(t => t.count));

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-medium text-gray-900">Top Weekly Tricks</h2>
      <div className="bg-white rounded-[8px] border border-gray-200 p-4 space-y-4">
        {topTricks.map((trick, index) => {
          const percentage = (trick.count / maxCount) * 100;
          const colors = [
            "var(--chart-blue)", // Blue (#60a5fa)
            "var(--chart-green)", // Green (#22c55e)
            "var(--chart-yellow)", // Yellow (#facc15)
            "var(--chart-purple)", // Purple (#a855f7)
            "var(--chart-orange)" // Orange (#fb923c)
          ];
          
          return (
            <div key={trick.trick_name} className="space-y-2">
              <div className="text-sm">
                <span className="font-medium text-gray-900">{trick.trick_name}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="h-2 rounded-full transition-all duration-500"
                  style={{ 
                    width: `${percentage}%`,
                    backgroundColor: colors[index]
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};