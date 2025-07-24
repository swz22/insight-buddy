import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "ghost" | "glass" | "glow";
  size?: "default" | "sm" | "lg";
  asChild?: boolean;
}

const buttonVariants = {
  base: "inline-flex items-center justify-center rounded-lg text-sm font-medium transition-all duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-500/50 disabled:pointer-events-none disabled:opacity-50 min-h-[44px] min-w-[44px] spring-scale ripple",
  variants: {
    default:
      "bg-primary text-primary-foreground hover:bg-primary/90 hover:scale-105 hover:shadow-lg hover:shadow-primary/25",
    outline: "border border-white/10 bg-transparent hover:bg-white/5 hover:border-white/20 hover:scale-105",
    ghost: "hover:bg-white/5 hover:scale-105",
    glass: "glass glass-hover hover:scale-105 hover:shadow-lg hover:shadow-white/10",
    glow: "gradient-primary text-white hover:scale-105 glow glow-hover",
  },
  sizes: {
    default: "h-10 px-6 py-2",
    sm: "h-9 rounded-md px-4 min-h-[36px]",
    lg: "h-12 rounded-lg px-8 text-base",
  },
};

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants.base, buttonVariants.variants[variant], buttonVariants.sizes[size], className)}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button };
