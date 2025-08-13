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
  metrics?: SpeakerMetric[];
}

export function SpeakerMetricsChart({ metrics = [] }: SpeakerMetricsChartProps) {
  const totalDuration = metrics.reduce((sum, m) => sum + m.duration, 0);
  const maxDuration = Math.max(...metrics.map((m) => m.duration), 1);

  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  if (!metrics || metrics.length === 0) {
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

      {metrics.map((metric, index) => (
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
              <span className="text-white/90 font-medium">{metric.speaker}</span>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-white/90">{metric.percentage}%</p>
              <p className="text-xs text-white/50">{formatDuration(metric.duration)}</p>
            </div>
          </div>

          <div className="relative h-8 bg-white/5 rounded-lg overflow-hidden group">
            <div
              className={cn(
                "absolute inset-y-0 left-0 transition-all duration-500",
                "group-hover:shadow-lg",
                index === 0 && "bg-gradient-to-r from-purple-500 to-purple-600",
                index === 1 && "bg-gradient-to-r from-cyan-500 to-cyan-600",
                index === 2 && "bg-gradient-to-r from-green-500 to-green-600",
                index > 2 && "bg-gradient-to-r from-white/20 to-white/30"
              )}
              style={{ width: `${(metric.duration / maxDuration) * 100}%` }}
            >
              <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>

          <div className="flex justify-between text-xs text-white/40">
            <span>{metric.wordCount.toLocaleString()} words</span>
            <span>{(metric.wordCount / (metric.duration / 60)).toFixed(0)} words/min</span>
          </div>
        </div>
      ))}

      <div className="pt-4 border-t border-white/10">
        <h4 className="text-sm font-medium text-white/70 mb-2">Speaking Balance</h4>
        <div className="flex gap-1">
          {metrics.map((metric, index) => (
            <div
              key={metric.speaker}
              className={cn(
                "h-2 transition-all duration-500 rounded-sm",
                index === 0 && "bg-purple-500",
                index === 1 && "bg-cyan-500",
                index === 2 && "bg-green-500",
                index > 2 && "bg-white/30"
              )}
              style={{ width: `${metric.percentage}%` }}
              title={`${metric.speaker}: ${metric.percentage}%`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
