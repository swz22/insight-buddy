import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
  variant?: "text" | "circular" | "rectangular" | "card";
  animation?: "wave" | "pulse";
}

export function Skeleton({ className, variant = "text", animation = "wave" }: SkeletonProps) {
  return (
    <div
      className={cn(
        "skeleton",
        animation === "pulse" && "animate-pulse",
        {
          "h-4 rounded": variant === "text",
          "rounded-full": variant === "circular",
          "rounded-lg": variant === "rectangular",
          "h-56 rounded-xl": variant === "card",
        },
        className
      )}
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="skeleton-card p-6 space-y-4">
      <div className="space-y-2">
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </div>
      <Skeleton className="h-16" variant="rectangular" />
      <div className="flex gap-4">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-20" />
      </div>
      <div className="flex gap-2 pt-2">
        <Skeleton className="h-9 flex-1" variant="rectangular" />
        <Skeleton className="h-9 w-20" variant="rectangular" />
        <Skeleton className="h-9 w-20" variant="rectangular" />
      </div>
    </div>
  );
}
