"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus, Heart, MessageCircle, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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
  const [hoveredPoint, setHoveredPoint] = useState<number | null>(null);
  const [selectedPoint, setSelectedPoint] = useState<number | null>(null);

  const processedData = useMemo(() => {
    if (!data || data.length === 0) return [];

    const sortedData = [...data].sort((a, b) => a.timestamp - b.timestamp);

    const minTime = sortedData[0].timestamp;
    const maxTime = sortedData[sortedData.length - 1].timestamp;
    const timeRange = maxTime - minTime || 1;

    return sortedData.map((point, index) => ({
      ...point,
      normalizedTime: ((point.timestamp - minTime) / timeRange) * 100,
      normalizedScore: (point.score + 1) / 2,
      index,
    }));
  }, [data]);

  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-white/40">
        <Heart className="w-12 h-12 mb-2" />
        <p>No sentiment data available</p>
        <p className="text-sm mt-1">Sentiment analysis will appear here after processing</p>
      </div>
    );
  }

  const getSentimentColor = (score: number) => {
    if (score >= 0.5) return "rgb(34, 197, 94)";
    if (score >= 0.1) return "rgb(52, 211, 153)";
    if (score >= -0.1) return "rgb(156, 163, 175)";
    if (score >= -0.5) return "rgb(251, 146, 60)";
    return "rgb(239, 68, 68)";
  };

  const getSentimentEmoji = (score: number) => {
    if (score >= 0.5) return "😄";
    if (score >= 0.1) return "🙂";
    if (score >= -0.1) return "😐";
    if (score >= -0.5) return "😟";
    return "😢";
  };

  const getSentimentLabel = (score: number) => {
    if (score >= 0.5) return "Very Positive";
    if (score >= 0.1) return "Positive";
    if (score >= -0.1) return "Neutral";
    if (score >= -0.5) return "Negative";
    return "Very Negative";
  };

  const formatTimestamp = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  };

  const averageSentiment = processedData.reduce((sum, p) => sum + p.score, 0) / processedData.length || 0;
  const sentimentTrend =
    processedData.length > 1 && processedData[processedData.length - 1]?.score > processedData[0]?.score
      ? "improving"
      : processedData.length > 1 && processedData[processedData.length - 1]?.score < processedData[0]?.score
      ? "declining"
      : "stable";

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="text-center p-4 rounded-lg bg-white/[0.02] border border-white/10">
          <div className={cn("text-2xl font-bold", averageSentiment >= 0 ? "text-green-400" : "text-red-400")}>
            {averageSentiment >= 0 ? "+" : ""}
            {(averageSentiment * 100).toFixed(0)}%
          </div>
          <p className="text-sm text-white/60 mt-1">Average Sentiment</p>
        </div>
        <div className="text-center p-4 rounded-lg bg-white/[0.02] border border-white/10">
          <div className="flex items-center justify-center gap-2">
            {sentimentTrend === "improving" ? (
              <TrendingUp className="w-5 h-5 text-green-400" />
            ) : sentimentTrend === "declining" ? (
              <TrendingDown className="w-5 h-5 text-red-400" />
            ) : (
              <Minus className="w-5 h-5 text-white/60" />
            )}
            <span className="text-2xl font-bold text-white">
              {sentimentTrend.charAt(0).toUpperCase() + sentimentTrend.slice(1)}
            </span>
          </div>
          <p className="text-sm text-white/60 mt-1">Trend</p>
        </div>
        <div className="text-center p-4 rounded-lg bg-white/[0.02] border border-white/10">
          <div className="text-2xl font-bold text-white">{processedData.length}</div>
          <p className="text-sm text-white/60 mt-1">Data Points</p>
        </div>
      </div>

      {/* Timeline Chart */}
      <div className="relative h-64 bg-white/[0.02] rounded-lg p-4">
        <svg width="100%" height="100%" viewBox="0 0 800 240" preserveAspectRatio="none">
          {/* Grid lines */}
          <line x1="0" y1="120" x2="800" y2="120" stroke="white" strokeOpacity="0.1" strokeDasharray="4 4" />

          {/* Sentiment line */}
          <polyline
            points={processedData
              .map((point) => `${(point.normalizedTime / 100) * 800},${(1 - point.normalizedScore) * 240}`)
              .join(" ")}
            fill="none"
            stroke="url(#lineGradient)"
            strokeWidth="2"
          />

          {/* Data points */}
          {processedData.map((point, index) => (
            <g key={index}>
              <circle
                cx={(point.normalizedTime / 100) * 800}
                cy={(1 - point.normalizedScore) * 240}
                r={hoveredPoint === index ? "6" : "4"}
                fill={getSentimentColor(point.score)}
                className="cursor-pointer"
                onMouseEnter={() => setHoveredPoint(index)}
                onMouseLeave={() => setHoveredPoint(null)}
                onClick={() => setSelectedPoint(index)}
              />
              {/* Hover tooltip */}
              <AnimatePresence>
                {hoveredPoint === index && (
                  <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <rect
                      x={(point.normalizedTime / 100) * 800 - 60}
                      y={(1 - point.normalizedScore) * 240 - 40}
                      width="120"
                      height="30"
                      rx="4"
                      fill="black"
                      fillOpacity="0.8"
                    />
                    <text
                      x={(point.normalizedTime / 100) * 800}
                      y={(1 - point.normalizedScore) * 240 - 20}
                      textAnchor="middle"
                      fill="white"
                      fontSize="12"
                    >
                      {getSentimentLabel(point.score)}
                    </text>
                  </motion.g>
                )}
              </AnimatePresence>
            </g>
          ))}

          <defs>
            <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              {processedData.map((point, index) => (
                <stop key={index} offset={`${point.normalizedTime}%`} stopColor={getSentimentColor(point.score)} />
              ))}
            </linearGradient>
          </defs>
        </svg>

        {/* Time labels */}
        <div className="absolute bottom-0 left-0 right-0 flex justify-between text-xs text-white/40 mt-2">
          <span>Start</span>
          <span>Middle</span>
          <span>End</span>
        </div>
      </div>

      {/* Selected Point Details */}
      <AnimatePresence mode="wait">
        {selectedPoint !== null && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="mt-4 p-4 rounded-lg bg-white/[0.02] border border-white/10"
          >
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="text-sm font-medium text-white">
                  {processedData[selectedPoint].speaker} at {formatTimestamp(processedData[selectedPoint].timestamp)}
                </p>
                <p className="text-xs text-white/60 mt-1">
                  Sentiment:{" "}
                  <span style={{ color: getSentimentColor(processedData[selectedPoint].score) }}>
                    {getSentimentLabel(processedData[selectedPoint].score)}{" "}
                    {getSentimentEmoji(processedData[selectedPoint].score)}
                  </span>
                </p>
              </div>
              <button
                onClick={() => setSelectedPoint(null)}
                className="text-white/40 hover:text-white/60 transition-colors"
              >
                ×
              </button>
            </div>
            <p className="text-sm text-white/80 mt-2">{processedData[selectedPoint].text}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
