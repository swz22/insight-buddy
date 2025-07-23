import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, type, ...props }, ref) => {
  return (
    <input
      type={type}
      className={cn(
        "flex h-10 w-full rounded-lg glass",
        "border border-white/20 hover:border-white/30",
        "px-3 py-2 text-sm",
        "placeholder:text-white/50",
        "focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent focus:bg-white/[0.05]",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "transition-all duration-200",
        "file:border-0 file:bg-transparent file:text-sm file:font-medium",
        className
      )}
      ref={ref}
      {...props}
    />
  );
});
Input.displayName = "Input";

export { Input };
