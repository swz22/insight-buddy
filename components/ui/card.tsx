import * as React from "react";
import { cn } from "@/lib/utils";

const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "rounded-xl",
      "bg-white/[0.03] backdrop-blur-sm",
      "shadow-xl",
      "transition-all duration-300",
      "hover:bg-white/[0.05]",
      "hover:shadow-2xl hover:shadow-purple-500/10",
      "relative overflow-hidden",
      "before:absolute before:inset-0 before:rounded-xl before:p-[1px]",
      "before:bg-gradient-to-b before:from-white/[0.15] before:to-white/[0.05]",
      "before:-z-10 before:transition-opacity before:duration-300",
      "hover:before:from-white/[0.2] hover:before:to-white/[0.08]",
      className
    )}
    {...props}
  >
    <div className="absolute inset-[1px] rounded-xl bg-black/60 -z-10" />
    {props.children}
  </div>
));
Card.displayName = "Card";

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex flex-col space-y-1.5 p-6", className)} {...props} />
  )
);
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn("text-2xl font-semibold leading-none tracking-tight font-display", className)}
      {...props}
    />
  )
);
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => <p ref={ref} className={cn("text-sm text-white/50", className)} {...props} />
);
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
);
CardContent.displayName = "CardContent";

export { Card, CardHeader, CardTitle, CardDescription, CardContent };
