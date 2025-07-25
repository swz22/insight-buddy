"use client";

import type { HourlyDistribution } from "@/lib/services/analytics";
import { cn } from "@/lib/utils";

interface TimeDistributionChartProps {
  distribution: HourlyDistribution[];
}

export function TimeDistributionChart({ distribution }: TimeDistributionChartProps) {
  if (distribution.length === 0) {
    return <div className="flex items-center justify-center h-64 text-white/40">No time data available</div>;
  }

  const formatHour = (hour: number) => {
    if (hour === 0) return "12am";
    if (hour === 12) return "12pm";
    if (hour < 12) return `${hour}am`;
    return `${hour - 12}pm`;
  };

  const maxPercentage = Math.max(...distribution.map((d) => d.percentage), 1);

  // Group into time periods for coloring
  const getColor = (hour: number) => {
    if (hour >= 6 && hour < 9) return "from-yellow-500 to-orange-500";
    if (hour >= 9 && hour < 12) return "from-blue-500 to-cyan-500";
    if (hour >= 12 && hour < 15) return "from-green-500 to-emerald-500";
    if (hour >= 15 && hour < 18) return "from-purple-500 to-pink-500";
    if (hour >= 18 && hour < 21) return "from-indigo-500 to-blue-500";
    return "from-gray-500 to-gray-600";
  };

  return (
    <div className="space-y-4">
      {/* Heat map grid */}
      <div className="grid grid-cols-6 gap-2">
        {distribution.map((slot) => {
          const intensity = slot.percentage / maxPercentage;

          return (
            <div key={slot.hour} className="relative group">
              <div
                className={cn(
                  "aspect-square rounded-lg bg-gradient-to-br transition-all duration-300",
                  "flex items-center justify-center text-xs font-medium",
                  "hover:scale-110 hover:z-10",
                  getColor(slot.hour)
                )}
                style={{ opacity: 0.3 + intensity * 0.7 }}
              >
                <span className="text-white/90">{formatHour(slot.hour)}</span>

                {/* Tooltip */}
                <div className="absolute -top-14 left-1/2 -translate-x-1/2 bg-black/90 backdrop-blur-sm rounded-lg px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                  <p className="text-xs font-semibold text-white">
                    {slot.count} meeting{slot.count !== 1 ? "s" : ""}
                  </p>
                  <p className="text-xs text-white/60">{slot.percentage}% of total</p>
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-black/90 rotate-45" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="grid grid-cols-3 gap-2 text-xs text-white/50">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-gradient-to-r from-yellow-500 to-orange-500" />
          <span>Morning</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-gradient-to-r from-green-500 to-emerald-500" />
          <span>Afternoon</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-gradient-to-r from-indigo-500 to-blue-500" />
          <span>Evening</span>
        </div>
      </div>
    </div>
  );
}
