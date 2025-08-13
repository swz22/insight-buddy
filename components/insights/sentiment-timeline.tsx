"use client";

import { SentimentAnalysis } from "@/types/meeting-insights";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus, Heart, MessageCircle } from "lucide-react";
import { motion } from "framer-motion";

interface SentimentTimelineProps {
  sentiment: SentimentAnalysis;
}

export function SentimentTimeline({ sentiment }: SentimentTimelineProps) {
  const getSentimentIcon = (label: string) => {
    switch (label) {
      case "very_positive":
      case "positive":
        return <TrendingUp className="w-4 h-4" />;
      case "negative":
      case "very_negative":
        return <TrendingDown className="w-4 h-4" />;
      default:
        return <Minus className="w-4 h-4" />;
    }
  };

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

  const normalizedTimeline = sentiment.timeline.map((point) => ({
    ...point,
    normalizedScore: (point.score + 1) / 2,
  }));

  return (
    <Card className="bg-white/[0.02] backdrop-blur-sm border-white/10">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Heart className="w-5 h-5 text-pink-400" />
          Sentiment Analysis
        </CardTitle>
        <CardDescription className="text-white/60">Emotional tone throughout the meeting</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="flex items-center justify-between p-4 bg-white/[0.02] rounded-lg">
            <div>
              <p className="text-sm text-white/60">Overall Sentiment</p>
              <p className="text-2xl font-bold text-white">{sentiment.overall.label.replace("_", " ")}</p>
            </div>
            <div
              className={cn(
                "w-16 h-16 rounded-full flex items-center justify-center",
                getSentimentColor(sentiment.overall.score)
              )}
            >
              {getSentimentIcon(sentiment.overall.label)}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm text-white/60 mb-3">Sentiment Timeline</p>
            <div className="relative h-32 bg-white/[0.02] rounded-lg p-4">
              <svg className="w-full h-full" viewBox={`0 0 ${normalizedTimeline.length * 20} 100`}>
                <motion.path
                  d={`M ${normalizedTimeline
                    .map((point, i) => `${i * 20} ${100 - point.normalizedScore * 100}`)
                    .join(" L ")}`}
                  fill="none"
                  stroke="url(#sentiment-gradient)"
                  strokeWidth="2"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 1.5, ease: "easeInOut" }}
                />
                <defs>
                  <linearGradient id="sentiment-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
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
          </div>

          <div className="space-y-3">
            <p className="text-sm text-white/60">Speaker Sentiments</p>
            {Object.entries(sentiment.bySpeaker).map(([speaker, score]) => (
              <div key={speaker} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageCircle className="w-4 h-4 text-white/40" />
                  <span className="text-white">{speaker}</span>
                </div>
                <div className={cn("px-2 py-1 rounded-full text-xs", getSentimentColor(score.score))}>
                  {score.label.replace("_", " ")}
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
