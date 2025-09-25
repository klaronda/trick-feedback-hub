import * as React from "react";
import * as TogglePrimitive from "@radix-ui/react-toggle";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";
import toggleOffActive from "@/assets/toggle-off-active.svg";
import toggleOffDisabled from "@/assets/toggle-off-disabled.svg";
import toggleOnActive from "@/assets/toggle-on-active.svg";
import toggleOnDisabled from "@/assets/toggle-on-disabled.svg";

const toggleVariants = cva(
  "inline-flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
  {
    variants: {
      variant: {
        default: "",
        outline: "",
      },
      size: {
        default: "w-14 h-8",
        sm: "w-12 h-7",
        lg: "w-16 h-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

const Toggle = React.forwardRef<
  React.ElementRef<typeof TogglePrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof TogglePrimitive.Root> & VariantProps<typeof toggleVariants>
>(({ className, variant, size, disabled, ...props }, ref) => {
  const getToggleImage = () => {
    if (disabled) {
      return props.pressed ? toggleOnDisabled : toggleOffDisabled;
    }
    return props.pressed ? toggleOnActive : toggleOffActive;
  };

  return (
    <TogglePrimitive.Root 
      ref={ref} 
      className={cn(toggleVariants({ variant, size }), className)} 
      disabled={disabled}
      {...props}
    >
      <img 
        src={getToggleImage()} 
        alt={props.pressed ? "Toggle on" : "Toggle off"}
        className="w-full h-full"
      />
    </TogglePrimitive.Root>
  );
});

Toggle.displayName = TogglePrimitive.Root.displayName;

export { Toggle, toggleVariants };
