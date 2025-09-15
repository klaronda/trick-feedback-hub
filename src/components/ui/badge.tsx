import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center justify-center font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        // Status badges (24px height)
        completed: "h-6 px-2 text-xs font-medium rounded-md border border-[#bbf7d0] bg-[#dcfce7] text-[#15803d]",
        processing: "h-6 px-2 text-xs font-medium rounded-md border border-[#fed7aa] bg-[#ffedd5] text-[#c2410c]",
        pending: "h-6 px-2 text-xs font-medium rounded-md border border-[#e5e7eb] bg-[#f3f4f6] text-[#374151]",
        
        // Plan badges (20px height)
        pro: "h-5 px-1.5 text-[11px] font-medium rounded-md border border-[#bfdbfe] bg-[#dbeafe] text-[#1d4ed8]",
        
        // Standard badges (24px height)
        active: "h-6 px-2 text-xs font-medium rounded-md border border-[#bfdbfe] bg-[#dbeafe] text-[#1d4ed8]",
        category: "h-[22px] px-2 text-[11px] font-medium rounded-md border border-[#d1d5db] bg-[#f3f4f6] text-[#374151]",
        
        // Large interactive badges (28px height)
        improvement: "h-7 px-2.5 text-xs font-medium rounded-md border border-[#fed7aa] bg-[#fff7ed] text-[#c2410c]",
        
        // Score badge (24px height, semibold)
        score: "h-6 px-2 text-xs font-semibold rounded-md border border-[#bbf7d0] bg-[#dcfce7] text-[#15803d]",
        
        // Legacy variants
        default: "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary: "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive: "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
