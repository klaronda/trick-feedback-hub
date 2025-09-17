import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";

const skeletonVariants = cva(
  "animate-pulse rounded-md",
  {
    variants: {
      variant: {
        default: "bg-muted",
        card: "bg-white border border-gray-200 rounded-[8px]",
        bar: "bg-gray-200 rounded",
        text: "bg-gray-200 rounded",
        header: "bg-gray-100 rounded"
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface SkeletonProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof skeletonVariants> {}

function Skeleton({ className, variant, ...props }: SkeletonProps) {
  return <div className={cn(skeletonVariants({ variant }), className)} {...props} />;
}

export { Skeleton, skeletonVariants };
