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

interface SentimentScore {
  score: number;
  magnitude: number;
  label: string;
}

interface SentimentData {
  overall: SentimentScore;
  timeline: TimelinePoint[];
  bySpeaker: Record<string, SentimentScore>;
  topPositiveSegments?: any[];
  topNegativeSegments?: any[];
}

interface SentimentTimelineProps {
  sentiment: Partial<SentimentData> | any;
}

export function SentimentTimeline({ sentiment }: SentimentTimelineProps) {
  // Safety checks
  if (!sentiment || typeof sentiment !== "object") {
    return (
      <Card className="bg-white/[0.02] backdrop-blur-sm border-white/10">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Heart className="w-5 h-5 text-pink-400" />
            Sentiment Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-white/40">No sentiment data available</p>
        </CardContent>
      </Card>
    );
  }

  const getSentimentIcon = (label: string) => {
    if (!label) return <Minus className="w-4 h-4" />;

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
    if (typeof score !== "number") return "text-white/60 bg-white/10";

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

  // Handle the overall sentiment safely
  const overall = sentiment.overall || {};
  const overallLabel = overall.label || "neutral";
  const overallScore = typeof overall.score === "number" ? overall.score : 0;
  const displayLabel = overallLabel.replace(/_/g, " ");

  // Handle timeline safely
  const timeline = Array.isArray(sentiment.timeline) ? sentiment.timeline : [];
  const normalizedTimeline = timeline.map((point: TimelinePoint) => ({
    ...point,
    normalizedScore: typeof point.score === "number" ? (point.score + 1) / 2 : 0.5,
  }));

  // Handle bySpeaker safely
  const bySpeaker = sentiment.bySpeaker && typeof sentiment.bySpeaker === "object" ? sentiment.bySpeaker : {};

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
              <p className="text-2xl font-bold text-white capitalize">{displayLabel}</p>
            </div>
            <div
              className={cn("w-16 h-16 rounded-full flex items-center justify-center", getSentimentColor(overallScore))}
            >
              {getSentimentIcon(overallLabel)}
            </div>
          </div>

          {normalizedTimeline.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm text-white/60 mb-3">Sentiment Timeline</p>
              <div className="relative h-32 bg-white/[0.02] rounded-lg p-4">
                <svg className="w-full h-full" viewBox={`0 0 ${Math.max(normalizedTimeline.length * 20, 100)} 100`}>
                  <motion.path
                    d={`M ${normalizedTimeline
                      .map((point: any, i: number) => `${i * 20} ${100 - point.normalizedScore * 100}`)
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
          )}

          {Object.keys(bySpeaker).length > 0 && (
            <div className="space-y-3">
              <p className="text-sm text-white/60">Speaker Sentiments</p>
              {Object.entries(bySpeaker).map(([speaker, scoreData]) => {
                const score = scoreData as any;
                const label = score?.label || "neutral";
                const scoreValue = typeof score?.score === "number" ? score.score : 0;

                return (
                  <div key={speaker} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MessageCircle className="w-4 h-4 text-white/40" />
                      <span className="text-white">{speaker}</span>
                    </div>
                    <div className={cn("px-2 py-1 rounded-full text-xs capitalize", getSentimentColor(scoreValue))}>
                      {label.replace(/_/g, " ")}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
