"use client";

import * as React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  onCheckedChange?: (checked: boolean) => void;
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(({ className, onCheckedChange, ...props }, ref) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    props.onChange?.(e);
    onCheckedChange?.(e.target.checked);
  };

  return (
    <div className="relative inline-flex items-center">
      <input type="checkbox" className="sr-only" ref={ref} onChange={handleChange} {...props} />
      <label
        className={cn(
          "inline-flex items-center justify-center h-4 w-4 rounded border border-white/30 bg-white/[0.02] transition-all duration-200 cursor-pointer",
          "hover:border-white/50 hover:bg-white/[0.05]",
          "focus-within:outline-none focus-within:ring-2 focus-within:ring-purple-500/50 focus-within:ring-offset-2 focus-within:ring-offset-black",
          props.checked && "bg-purple-500 border-purple-500",
          props.disabled && "cursor-not-allowed opacity-50",
          className
        )}
      >
        {props.checked && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
      </label>
    </div>
  );
});
Checkbox.displayName = "Checkbox";

export { Checkbox };
