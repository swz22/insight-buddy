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

  const averageSentiment = processedData.reduce((sum, p) => sum + p.score, 0) / processedData.length;
  const sentimentTrend =
    processedData[processedData.length - 1]?.score > processedData[0]?.score ? "improving" : "declining";

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-white/[0.02] border-white/10">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-white/60">Average Sentiment</p>
                <p className="text-lg font-bold" style={{ color: getSentimentColor(averageSentiment) }}>
                  {getSentimentLabel(averageSentiment)}
                </p>
              </div>
              <span className="text-2xl">{getSentimentEmoji(averageSentiment)}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/[0.02] border-white/10">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-white/60">Trend</p>
                <p className="text-lg font-bold capitalize text-white">{sentimentTrend}</p>
              </div>
              {sentimentTrend === "improving" ? (
                <TrendingUp className="w-6 h-6 text-green-400" />
              ) : (
                <TrendingDown className="w-6 h-6 text-red-400" />
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/[0.02] border-white/10">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-white/60">Variations</p>
                <p className="text-lg font-bold text-white">{processedData.length} points</p>
              </div>
              <Sparkles className="w-6 h-6 text-purple-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Interactive Timeline Chart */}
      <Card className="bg-white/[0.02] border-white/10 overflow-hidden">
        <CardContent className="p-6">
          <div className="relative h-64 mb-6">
            {/* Grid lines */}
            <div className="absolute inset-0">
              {[0, 25, 50, 75, 100].map((y) => (
                <div key={y} className="absolute w-full border-t border-white/5" style={{ top: `${y}%` }}>
                  <span className="absolute -left-12 -top-2 text-xs text-white/30">
                    {y === 0 ? "+1" : y === 50 ? "0" : y === 100 ? "-1" : ""}
                  </span>
                </div>
              ))}
            </div>

            {/* SVG Chart */}
            <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
              {/* Gradient Background */}
              <defs>
                <linearGradient id="sentimentGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="rgb(34, 197, 94)" stopOpacity="0.2" />
                  <stop offset="50%" stopColor="rgb(156, 163, 175)" stopOpacity="0.1" />
                  <stop offset="100%" stopColor="rgb(239, 68, 68)" stopOpacity="0.2" />
                </linearGradient>

                <filter id="glow">
                  <feGaussianBlur stdDeviation="4" result="coloredBlur" />
                  <feMerge>
                    <feMergeNode in="coloredBlur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              <rect width="100%" height="100%" fill="url(#sentimentGradient)" opacity="0.5" />

              {/* Line Path */}
              {processedData.length > 1 && (
                <motion.path
                  d={`M ${processedData
                    .map((p) => `${p.normalizedTime}%,${(1 - p.normalizedScore) * 100}%`)
                    .join(" L ")}`}
                  fill="none"
                  stroke="url(#lineGradient)"
                  strokeWidth="3"
                  filter="url(#glow)"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 2, ease: "easeInOut" }}
                />
              )}

              {/* Data Points */}
              {processedData.map((point, index) => (
                <g key={index}>
                  <motion.circle
                    cx={`${point.normalizedTime}%`}
                    cy={`${(1 - point.normalizedScore) * 100}%`}
                    r={hoveredPoint === index ? "8" : "5"}
                    fill={getSentimentColor(point.score)}
                    stroke="white"
                    strokeWidth="2"
                    filter="url(#glow)"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: index * 0.1, duration: 0.3 }}
                    onMouseEnter={() => setHoveredPoint(index)}
                    onMouseLeave={() => setHoveredPoint(null)}
                    onClick={() => setSelectedPoint(index)}
                    className="cursor-pointer"
                  />

                  {/* Hover Label */}
                  <AnimatePresence>
                    {hoveredPoint === index && (
                      <motion.g
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                      >
                        <rect
                          x={`${point.normalizedTime}%`}
                          y={`${(1 - point.normalizedScore) * 100 - 40}%`}
                          width="120"
                          height="30"
                          rx="4"
                          fill="black"
                          fillOpacity="0.9"
                          transform="translate(-60, 0)"
                        />
                        <text
                          x={`${point.normalizedTime}%`}
                          y={`${(1 - point.normalizedScore) * 100 - 20}%`}
                          textAnchor="middle"
                          fill="white"
                          fontSize="12"
                        >
                          {formatTimestamp(point.timestamp)} • {point.speaker}
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
                      {processedData[selectedPoint].speaker} at{" "}
                      {formatTimestamp(processedData[selectedPoint].timestamp)}
                    </p>
                    <p className="text-xs text-white/60 mt-1">
                      Sentiment:{" "}
                      <span style={{ color: getSentimentColor(processedData[selectedPoint].score) }}>
                        {getSentimentLabel(processedData[selectedPoint].score)}{" "}
                        {getSentimentEmoji(processedData[selectedPoint].score)}
                      </span>
                    </p>
                  </div>
                  <button onClick={() => setSelectedPoint(null)} className="text-white/40 hover:text-white/60">
                    ×
                  </button>
                </div>
                <p className="text-sm text-white/80 italic">"{processedData[selectedPoint].text}"</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Key Moments */}
          <div className="mt-6 space-y-2">
            <h4 className="text-sm font-medium text-white/80 mb-3">Key Sentiment Moments</h4>
            {processedData
              .filter((p, i) => {
                if (i === 0) return true;
                const prev = processedData[i - 1];
                return Math.abs(p.score - prev.score) > 0.3;
              })
              .slice(0, 3)
              .map((point, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={cn(
                    "p-3 rounded-lg border border-white/10",
                    "hover:border-white/20 transition-colors cursor-pointer"
                  )}
                  onClick={() => setSelectedPoint(point.index)}
                  style={{ backgroundColor: `${getSentimentColor(point.score)}10` }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium">{formatTimestamp(point.timestamp)}</span>
                    <span className="text-xs opacity-80">{point.speaker}</span>
                  </div>
                  <p className="text-xs line-clamp-2 text-white/70">{point.text}</p>
                </motion.div>
              ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
