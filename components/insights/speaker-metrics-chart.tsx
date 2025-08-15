"use client";

import { Users } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SpeakerMetric {
  speaker: string;
  duration: number;
  wordCount: number;
  percentage: number;
}

interface SpeakerMetricsChartProps {
  data?: SpeakerMetric[];
}

export function SpeakerMetricsChart({ data = [] }: SpeakerMetricsChartProps) {
  const totalDuration = data.reduce((sum, m) => sum + m.duration, 0);
  const maxDuration = Math.max(...data.map((m) => m.duration), 1);

  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-white/40">
        <Users className="w-12 h-12 mb-2" />
        <p>No speaker data available</p>
        <p className="text-sm mt-1">Generate a transcript to see speaker insights</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-sm text-white/60 mb-4">Total speaking time: {formatDuration(totalDuration)}</div>

      {data.map((metric, index) => (
        <div key={metric.speaker} className="space-y-2">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium",
                  index === 0 && "bg-purple-500/20 text-purple-400",
                  index === 1 && "bg-cyan-500/20 text-cyan-400",
                  index === 2 && "bg-green-500/20 text-green-400",
                  index > 2 && "bg-white/10 text-white/70"
                )}
              >
                {metric.speaker.split(" ")[1] || "?"}
              </div>
              <span className="text-white font-medium">{metric.speaker}</span>
            </div>
            <div className="text-right">
              <p className="text-white font-medium">{formatDuration(metric.duration)}</p>
              <p className="text-xs text-white/60">
                {metric.percentage}% • {metric.wordCount} words
              </p>
            </div>
          </div>
          <div className="h-2 bg-white/[0.05] rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full transition-all duration-1000 ease-out",
                index === 0 && "bg-gradient-to-r from-purple-500 to-purple-400",
                index === 1 && "bg-gradient-to-r from-cyan-500 to-cyan-400",
                index === 2 && "bg-gradient-to-r from-green-500 to-green-400",
                index > 2 && "bg-white/30"
              )}
              style={{ width: `${(metric.duration / maxDuration) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
