"use client";

import { SpeakerMetrics } from "@/types/meeting-insights";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Clock, MessageSquare, Users, TrendingUp } from "lucide-react";

interface SpeakerMetricsChartProps {
  metrics: SpeakerMetrics[];
}

export function SpeakerMetricsChart({ metrics }: SpeakerMetricsChartProps) {
  const maxDuration = Math.max(...metrics.map((m) => m.totalDuration));

  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}m ${secs}s`;
  };

  return (
    <Card className="bg-white/[0.02] backdrop-blur-sm border-white/10">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Users className="w-5 h-5 text-purple-400" />
          Speaker Analytics
        </CardTitle>
        <CardDescription className="text-white/60">
          Speaking time distribution and participation metrics
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {metrics.map((speaker, index) => (
          <div key={speaker.speaker} className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium",
                    index === 0 && "bg-purple-500/20 text-purple-400",
                    index === 1 && "bg-blue-500/20 text-blue-400",
                    index === 2 && "bg-green-500/20 text-green-400",
                    index > 2 && "bg-white/10 text-white/80"
                  )}
                >
                  {speaker.speaker.split(" ")[1]}
                </div>
                <div>
                  <p className="text-white font-medium">{speaker.speaker}</p>
                  <p className="text-white/60 text-sm">
                    {speaker.turnCount} turns · {formatDuration(speaker.totalDuration)}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-white font-medium">{speaker.speakingPercentage.toFixed(1)}%</p>
                {speaker.interruptions > 0 && (
                  <p className="text-orange-400 text-xs">
                    {speaker.interruptions} interruption{speaker.interruptions > 1 ? "s" : ""}
                  </p>
                )}
              </div>
            </div>

            <div className="relative h-2 bg-white/[0.05] rounded-full overflow-hidden">
              <div
                className={cn(
                  "absolute top-0 left-0 h-full rounded-full transition-all duration-500",
                  index === 0 && "bg-purple-500",
                  index === 1 && "bg-blue-500",
                  index === 2 && "bg-green-500",
                  index > 2 && "bg-white/40"
                )}
                style={{ width: `${(speaker.totalDuration / maxDuration) * 100}%` }}
              />
            </div>

            <div className="grid grid-cols-3 gap-2 mt-2">
              <div className="bg-white/[0.02] rounded-lg p-2">
                <p className="text-white/40 text-xs">Avg Turn</p>
                <p className="text-white text-sm font-medium">{formatDuration(speaker.averageTurnDuration)}</p>
              </div>
              <div className="bg-white/[0.02] rounded-lg p-2">
                <p className="text-white/40 text-xs">Longest</p>
                <p className="text-white text-sm font-medium">{formatDuration(speaker.longestTurn)}</p>
              </div>
              <div className="bg-white/[0.02] rounded-lg p-2">
                <p className="text-white/40 text-xs">Interrupted</p>
                <p className="text-white text-sm font-medium">{speaker.wasInterrupted}x</p>
              </div>
            </div>
          </div>
        ))}

        <div className="mt-6 pt-4 border-t border-white/10">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-400" />
              <div>
                <p className="text-white/60 text-xs">Total Duration</p>
                <p className="text-white font-medium">
                  {formatDuration(metrics.reduce((sum, m) => sum + m.totalDuration, 0))}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-green-400" />
              <div>
                <p className="text-white/60 text-xs">Total Turns</p>
                <p className="text-white font-medium">{metrics.reduce((sum, m) => sum + m.turnCount, 0)}</p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
