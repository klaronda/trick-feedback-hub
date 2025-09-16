import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center justify-center font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        // Status badges (24px height) - Using design system colors with lg border radius to match cards
        completed: "h-6 px-2 text-xs font-medium rounded-lg border border-[var(--success-border)] bg-[var(--success-bg)] text-[var(--success-text)]",
        processing: "h-6 px-2 text-xs font-medium rounded-lg border border-[var(--warning-border)] bg-[var(--warning-bg)] text-[var(--warning-text)]",
        pending: "h-6 px-2 text-xs font-medium rounded-lg border border-[var(--neutral-border)] bg-[var(--neutral-bg)] text-[var(--neutral-text)]",
        
        // Plan badges (20px height)
        pro: "h-5 px-1.5 text-[11px] font-medium rounded-md border border-[var(--premium-border)] bg-[var(--premium-bg)] text-[var(--premium-text)]",
        
        // Standard badges (24px height)
        active: "h-6 px-2 text-xs font-medium rounded-md border border-[var(--premium-border)] bg-[var(--premium-bg)] text-[var(--premium-text)]",
        category: "h-[22px] px-2 text-[11px] font-medium rounded-md border border-[var(--neutral-border)] bg-[var(--neutral-bg)] text-[var(--neutral-text)]",
        
        // Large interactive badges (28px height)
        improvement: "h-7 px-2.5 text-xs font-medium rounded-md border border-[var(--warning-border)] bg-[var(--warning-bg)] text-[var(--warning-text)]",
        
        // Score badge (24px height, semibold)
        score: "h-6 px-2 text-xs font-semibold rounded-md border border-[var(--success-border)] bg-[var(--success-bg)] text-[var(--success-text)]",
        
        // Error/destructive badge
        error: "h-6 px-2 text-xs font-medium rounded-lg border border-[var(--error-border)] bg-[var(--error-bg)] text-[var(--error-text)]",
        
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
