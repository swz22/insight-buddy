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
      <CardContent className="space-y-6">
        {/* Overall Sentiment */}
        <div className="flex items-center justify-between p-4 rounded-lg bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className={cn("p-3 rounded-lg", getSentimentColor(sentiment.overall.score))}>
              {getSentimentIcon(sentiment.overall.label)}
            </div>
            <div>
              <p className="text-white font-medium">Overall Sentiment</p>
              <p className="text-white/60 text-sm capitalize">{sentiment.overall.label.replace("_", " ")}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-white">{(sentiment.overall.score * 100).toFixed(0)}</p>
            <p className="text-xs text-white/40">Score</p>
          </div>
        </div>

        {/* Timeline Visualization */}
        <div className="space-y-2">
          <p className="text-sm text-white/60 mb-3">Sentiment Over Time</p>
          <div className="relative h-32 bg-white/[0.02] rounded-lg p-4">
            <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
              {/* Grid lines */}
              <line x1="0" y1="50" x2="100" y2="50" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />
              <line x1="0" y1="25" x2="100" y2="25" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />
              <line x1="0" y1="75" x2="100" y2="75" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />

              {/* Sentiment line */}
              <polyline
                fill="none"
                stroke="url(#sentimentGradient)"
                strokeWidth="2"
                points={normalizedTimeline
                  .map((point, index) => {
                    const x = (index / (normalizedTimeline.length - 1)) * 100;
                    const y = (1 - point.normalizedScore) * 100;
                    return `${x},${y}`;
                  })
                  .join(" ")}
              />

              {/* Gradient definition */}
              <defs>
                <linearGradient id="sentimentGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#10b981" />
                  <stop offset="50%" stopColor="#a855f7" />
                  <stop offset="100%" stopColor="#3b82f6" />
                </linearGradient>
              </defs>
            </svg>

            <div className="absolute bottom-0 left-0 right-0 flex justify-between text-xs text-white/40 px-4">
              <span>Start</span>
              <span>End</span>
            </div>
          </div>
        </div>

        {/* Speaker Sentiments */}
        <div className="space-y-2">
          <p className="text-sm text-white/60 mb-3">By Speaker</p>
          {Object.entries(sentiment.bySpeaker).map(([speaker, score]) => (
            <div key={speaker} className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02]">
              <span className="text-white">{speaker}</span>
              <div className="flex items-center gap-2">
                <div className={cn("px-2 py-1 rounded-full text-xs", getSentimentColor(score.score))}>
                  {score.label.replace("_", " ")}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Key Moments */}
        {sentiment.topPositiveSegments.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm text-white/60 mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-green-400" />
              Most Positive Moments
            </p>
            {sentiment.topPositiveSegments.slice(0, 3).map((segment, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="p-3 rounded-lg bg-green-500/10 border border-green-500/20"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-white/80 text-sm line-clamp-2">{segment.text}</p>
                  <span className="text-xs text-green-400 whitespace-nowrap">{formatTimestamp(segment.startTime)}</span>
                </div>
                <p className="text-xs text-white/40 mt-1">{segment.speaker}</p>
              </motion.div>
            ))}
          </div>
        )}

        {sentiment.topNegativeSegments.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm text-white/60 mb-3 flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-red-400" />
              Areas of Concern
            </p>
            {sentiment.topNegativeSegments.slice(0, 2).map((segment, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="p-3 rounded-lg bg-red-500/10 border border-red-500/20"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-white/80 text-sm line-clamp-2">{segment.text}</p>
                  <span className="text-xs text-red-400 whitespace-nowrap">{formatTimestamp(segment.startTime)}</span>
                </div>
                <p className="text-xs text-white/40 mt-1">{segment.speaker}</p>
              </motion.div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
