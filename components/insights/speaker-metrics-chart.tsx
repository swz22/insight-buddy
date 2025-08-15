"use client";

import { Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { SpeakerMetrics } from "@/types/meeting-insights";

export interface SpeakerMetric {
  speaker: string;
  duration: number;
  wordCount?: number;
  percentage: number;
}

interface SpeakerMetricsChartProps {
  data?: SpeakerMetric[] | SpeakerMetrics[];
  metrics?: SpeakerMetric[];
}

export function SpeakerMetricsChart({ data, metrics }: SpeakerMetricsChartProps) {
  const chartData = data || metrics || [];

  const normalizedData: SpeakerMetric[] = chartData.map((item: any) => ({
    speaker: item.speaker,
    duration: item.duration || item.totalDuration || 0,
    wordCount: item.wordCount || item.turnCount || 0,
    percentage: item.percentage || item.speakingPercentage || 0,
  }));

  const totalDuration = normalizedData.reduce((sum, m) => sum + m.duration, 0);
  const maxDuration = Math.max(...normalizedData.map((m) => m.duration), 1);

  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  const getBarColor = (index: number): string => {
    const colors = [
      "bg-gradient-to-r from-purple-500 to-purple-400",
      "bg-gradient-to-r from-cyan-500 to-cyan-400",
      "bg-gradient-to-r from-green-500 to-green-400",
      "bg-gradient-to-r from-yellow-500 to-yellow-400",
      "bg-gradient-to-r from-pink-500 to-pink-400",
      "bg-gradient-to-r from-indigo-500 to-indigo-400",
      "bg-gradient-to-r from-orange-500 to-orange-400",
      "bg-gradient-to-r from-teal-500 to-teal-400",
    ];
    return colors[index % colors.length];
  };

  const getAvatarColor = (index: number): string => {
    const colors = [
      "bg-purple-500/20 text-purple-400",
      "bg-cyan-500/20 text-cyan-400",
      "bg-green-500/20 text-green-400",
      "bg-yellow-500/20 text-yellow-400",
      "bg-pink-500/20 text-pink-400",
      "bg-indigo-500/20 text-indigo-400",
      "bg-orange-500/20 text-orange-400",
      "bg-teal-500/20 text-teal-400",
    ];
    return colors[index % colors.length];
  };

  if (!normalizedData || normalizedData.length === 0) {
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
      <div className="text-sm text-white/60 mb-4">
        Total speaking time: {formatDuration(totalDuration)} • {normalizedData.length} speakers detected
      </div>

      {normalizedData.map((metric, index) => (
        <div key={`${metric.speaker}-${index}`} className="space-y-2">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium",
                  getAvatarColor(index)
                )}
              >
                {metric.speaker.replace("Speaker ", "")}
              </div>
              <span className="text-white font-medium">{metric.speaker}</span>
            </div>
            <div className="text-right">
              <p className="text-white font-medium">{formatDuration(metric.duration)}</p>
              <p className="text-xs text-white/60">
                {metric.percentage}%{metric.wordCount ? ` • ${metric.wordCount} turns` : ""}
              </p>
            </div>
          </div>
          <div className="h-2 bg-white/[0.05] rounded-full overflow-hidden">
            <div
              className={cn("h-full transition-all duration-1000 ease-out", getBarColor(index))}
              style={{ width: `${(metric.duration / maxDuration) * 100}%` }}
            />
          </div>
        </div>
      ))}

      {normalizedData.length > 1 && (
        <div className="mt-6 pt-4 border-t border-white/10">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-white/60">Most Active</p>
              <p className="text-white font-medium">{normalizedData[0].speaker}</p>
            </div>
            <div>
              <p className="text-white/60">Least Active</p>
              <p className="text-white font-medium">{normalizedData[normalizedData.length - 1].speaker}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
