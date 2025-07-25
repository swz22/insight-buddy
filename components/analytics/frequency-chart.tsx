"use client";

import { useMemo } from "react";
import { format } from "date-fns";
import type { DailyFrequency } from "@/lib/services/analytics";

interface FrequencyChartProps {
  data: DailyFrequency[];
}

export function FrequencyChart({ data }: FrequencyChartProps) {
  const { maxCount, chartData } = useMemo(() => {
    const max = Math.max(...data.map((d) => d.count), 1);
    const processed = data.map((item) => ({
      ...item,
      percentage: (item.count / max) * 100,
    }));
    return { maxCount: max, chartData: processed };
  }, [data]);

  if (data.length === 0) {
    return <div className="flex items-center justify-center h-64 text-white/40">No meeting data available</div>;
  }

  return (
    <div className="h-64 relative">
      {/* Y-axis labels */}
      <div className="absolute left-0 top-0 bottom-0 w-8 flex flex-col justify-between text-xs text-white/40">
        <span>{maxCount}</span>
        <span>{Math.floor(maxCount / 2)}</span>
        <span>0</span>
      </div>

      {/* Chart area */}
      <div className="ml-10 h-full relative">
        <div className="absolute inset-0 border-l border-b border-white/10" />

        {/* Grid lines */}
        <div className="absolute inset-0">
          <div className="absolute top-0 left-0 right-0 h-px bg-white/5" />
          <div className="absolute top-1/4 left-0 right-0 h-px bg-white/5" />
          <div className="absolute top-1/2 left-0 right-0 h-px bg-white/5" />
          <div className="absolute top-3/4 left-0 right-0 h-px bg-white/5" />
        </div>

        {/* Bars */}
        <div className="absolute inset-0 flex items-end justify-between px-1">
          {chartData.map((item, index) => (
            <div key={item.date} className="relative flex-1 mx-0.5 group" style={{ height: "100%" }}>
              <div
                className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-purple-500 to-cyan-500 rounded-t-sm transition-all duration-300 hover:from-purple-400 hover:to-cyan-400"
                style={{ height: `${item.percentage}%` }}
              >
                {/* Tooltip */}
                <div className="absolute -top-20 left-1/2 -translate-x-1/2 bg-black/90 backdrop-blur-sm rounded-lg px-3 py-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                  <p className="text-sm font-semibold text-white">{format(new Date(item.date), "MMM d")}</p>
                  <p className="text-xs text-white/80">
                    {item.count} meeting{item.count !== 1 ? "s" : ""}
                  </p>
                  {item.duration > 0 && (
                    <p className="text-xs text-white/60">{Math.round(item.duration / 60)}m total</p>
                  )}
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-black/90 rotate-45" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* X-axis labels */}
        <div className="absolute -bottom-6 left-0 right-0 flex justify-between text-xs text-white/40 px-1">
          {chartData
            .filter((_, i) => i % 7 === 0)
            .map((item) => (
              <span key={item.date}>{format(new Date(item.date), "MMM d")}</span>
            ))}
        </div>
      </div>
    </div>
  );
}
