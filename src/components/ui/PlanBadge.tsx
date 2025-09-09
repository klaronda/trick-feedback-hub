import { Badge } from "@/components/ui/badge";

export interface PlanBadgeProps {
  plan: string;
  className?: string;
}

export function PlanBadge({ plan, className }: PlanBadgeProps) {
  const isPro = plan === "pro";
  
  return (
    <Badge 
      variant={isPro ? "default" : "outline"} 
      className={className}
    >
      {isPro ? "Pro Plan" : "Free Plan"}
    </Badge>
  );
}