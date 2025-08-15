"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus, Heart, MessageCircle } from "lucide-react";
import { motion } from "framer-motion";

interface TimelinePoint {
  timestamp: number;
  score: number;
  text: string;
  speaker: string;
}

interface SentimentTimelineProps {
  data: TimelinePoint[];
}

export function SentimentTimeline({ data }: SentimentTimelineProps) {
  if (!data || data.length === 0) {
    return (
      <Card className="bg-white/[0.02] backdrop-blur-sm border-white/10">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Heart className="w-5 h-5 text-pink-400" />
            Sentiment Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-white/40">No sentiment data available</p>
        </CardContent>
      </Card>
    );
  }

  const getSentimentColor = (score: number) => {
    if (score >= 0.5) return "text-green-400 bg-green-500/20";
    if (score >= 0.1) return "text-emerald-400 bg-emerald-500/20";
    if (score >= -0.1) return "text-white/60 bg-white/10";
    if (score >= -0.5) return "text-orange-400 bg-orange-500/20";
    return "text-red-400 bg-red-500/20";
  };

  const formatTimestamp = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  };

  const normalizedTimeline = data.map((point) => ({
    ...point,
    normalizedScore: (point.score + 1) / 2,
  }));

  const minTime = Math.min(...data.map((p) => p.timestamp));
  const maxTime = Math.max(...data.map((p) => p.timestamp));
  const timeRange = maxTime - minTime || 1;

  return (
    <Card className="bg-white/[0.02] backdrop-blur-sm border-white/10">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Heart className="w-5 h-5 text-pink-400" />
          Sentiment Timeline
        </CardTitle>
        <CardDescription className="text-white/60">Emotional tone throughout the meeting</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="relative h-48 bg-white/[0.02] rounded-lg p-4">
          <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <defs>
              <linearGradient id="sentimentGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#22c55e" stopOpacity="0.2" />
                <stop offset="50%" stopColor="#fbbf24" stopOpacity="0.2" />
                <stop offset="100%" stopColor="#ef4444" stopOpacity="0.2" />
              </linearGradient>
            </defs>

            <rect x="0" y="0" width="100" height="100" fill="url(#sentimentGradient)" />

            <polyline
              fill="none"
              stroke="url(#lineGradient)"
              strokeWidth="2"
              points={normalizedTimeline
                .map((point, index) => {
                  const x = ((point.timestamp - minTime) / timeRange) * 100;
                  const y = (1 - point.normalizedScore) * 100;
                  return `${x},${y}`;
                })
                .join(" ")}
            />

            {normalizedTimeline.map((point, index) => {
              const x = ((point.timestamp - minTime) / timeRange) * 100;
              const y = (1 - point.normalizedScore) * 100;

              return (
                <g key={index}>
                  <circle cx={x} cy={y} r="3" fill="white" className="cursor-pointer hover:r-4 transition-all">
                    <title>
                      {formatTimestamp(point.timestamp)} - {point.speaker}: {point.text.slice(0, 50)}...
                    </title>
                  </circle>
                </g>
              );
            })}

            <defs>
              <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#ef4444" />
                <stop offset="25%" stopColor="#f59e0b" />
                <stop offset="50%" stopColor="#fbbf24" />
                <stop offset="75%" stopColor="#84cc16" />
                <stop offset="100%" stopColor="#22c55e" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-x-4 bottom-2 flex justify-between text-xs text-white/40">
            <span>Start</span>
            <span>End</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {data.slice(0, 4).map((point, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={cn("p-3 rounded-lg border border-white/10", getSentimentColor(point.score))}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium">{formatTimestamp(point.timestamp)}</span>
                <span className="text-xs opacity-80">{point.speaker}</span>
              </div>
              <p className="text-xs line-clamp-2">{point.text}</p>
            </motion.div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
