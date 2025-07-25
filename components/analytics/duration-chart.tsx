"use client";

import type { DurationBucket } from "@/lib/services/analytics";
import { cn } from "@/lib/utils";

interface DurationChartProps {
  buckets: DurationBucket[];
}

export function DurationChart({ buckets }: DurationChartProps) {
  if (buckets.length === 0) {
    return <div className="flex items-center justify-center h-64 text-white/40">No duration data available</div>;
  }

  const getColor = (index: number) => {
    const colors = [
      "from-green-500 to-emerald-500",
      "from-blue-500 to-cyan-500",
      "from-purple-500 to-pink-500",
      "from-yellow-500 to-orange-500",
      "from-red-500 to-rose-500",
    ];
    return colors[index % colors.length];
  };

  const maxCount = Math.max(...buckets.map((b) => b.count), 1);

  return (
    <div className="space-y-4">
      {buckets.map((bucket, index) => (
        <div key={bucket.range} className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-white/70">{bucket.range}</span>
            <span className="text-sm font-medium text-white/90">
              {bucket.count} ({bucket.percentage}%)
            </span>
          </div>
          <div className="relative h-8 bg-white/5 rounded-lg overflow-hidden group">
            <div
              className={cn(
                "absolute inset-y-0 left-0 bg-gradient-to-r transition-all duration-500",
                "group-hover:shadow-lg",
                getColor(index)
              )}
              style={{ width: `${(bucket.count / maxCount) * 100}%` }}
            >
              <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>
        </div>
      ))}

      {/* Summary stats */}
      <div className="pt-4 border-t border-white/10">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-white/50">Most common</p>
            <p className="font-medium text-white/90">
              {buckets.reduce((max, b) => (b.count > max.count ? b : max), buckets[0]).range}
            </p>
          </div>
          <div>
            <p className="text-white/50">Total meetings</p>
            <p className="font-medium text-white/90">{buckets.reduce((sum, b) => sum + b.count, 0)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
