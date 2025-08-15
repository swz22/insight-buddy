"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";
import {
  Zap,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  MessageSquare,
  Users,
  Clock,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface KeyMoment {
  type: "high_engagement" | "topic_shift" | "decision_point" | "action_item" | "concern_raised";
  timestamp: number;
  description: string;
  participants: string[];
  sentiment: {
    score: number;
    magnitude: number;
    label: "very_positive" | "positive" | "neutral" | "negative" | "very_negative";
  };
}

interface KeyMomentsProps {
  moments?: KeyMoment[];
}

export function KeyMoments({ moments = [] }: KeyMomentsProps) {
  const [expandedMoment, setExpandedMoment] = useState<number | null>(null);

  if (!moments || moments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-white/40">
        <Sparkles className="w-12 h-12 mb-2" />
        <p>No key moments detected</p>
        <p className="text-sm mt-1">Key moments will appear after analysis</p>
      </div>
    );
  }

  const getMomentIcon = (type: KeyMoment["type"]) => {
    switch (type) {
      case "high_engagement":
        return <Zap className="w-5 h-5" />;
      case "topic_shift":
        return <TrendingUp className="w-5 h-5" />;
      case "decision_point":
        return <CheckCircle className="w-5 h-5" />;
      case "action_item":
        return <MessageSquare className="w-5 h-5" />;
      case "concern_raised":
        return <AlertCircle className="w-5 h-5" />;
    }
  };

  const getMomentColor = (type: KeyMoment["type"]) => {
    switch (type) {
      case "high_engagement":
        return "text-yellow-400 bg-yellow-500/10 border-yellow-500/20";
      case "topic_shift":
        return "text-blue-400 bg-blue-500/10 border-blue-500/20";
      case "decision_point":
        return "text-green-400 bg-green-500/10 border-green-500/20";
      case "action_item":
        return "text-purple-400 bg-purple-500/10 border-purple-500/20";
      case "concern_raised":
        return "text-red-400 bg-red-500/10 border-red-500/20";
    }
  };

  const getMomentLabel = (type: KeyMoment["type"]) => {
    switch (type) {
      case "high_engagement":
        return "High Engagement";
      case "topic_shift":
        return "Topic Shift";
      case "decision_point":
        return "Decision";
      case "action_item":
        return "Action Item";
      case "concern_raised":
        return "Concern";
    }
  };

  const formatTimestamp = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  };

  const groupedMoments = moments.reduce((acc, moment, index) => {
    const type = moment.type;
    if (!acc[type]) acc[type] = [];
    acc[type].push({ ...moment, index });
    return acc;
  }, {} as Record<string, (KeyMoment & { index: number })[]>);

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {Object.entries(groupedMoments).map(([type, items]) => (
          <Card key={type} className="bg-white/[0.02] border-white/10">
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <div className={cn("p-2 rounded-lg", getMomentColor(type as KeyMoment["type"]))}>
                  {getMomentIcon(type as KeyMoment["type"])}
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{items.length}</p>
                  <p className="text-xs text-white/60">{getMomentLabel(type as KeyMoment["type"])}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Timeline View */}
      <Card className="bg-white/[0.02] border-white/10">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Meeting Timeline
          </CardTitle>
          <CardDescription className="text-white/60">Click on moments to see more details</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-white/10" />

            {/* Moments */}
            <div className="space-y-4">
              {moments.map((moment, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="relative"
                >
                  {/* Timeline dot */}
                  <div
                    className={cn(
                      "absolute left-6 w-4 h-4 rounded-full border-2 border-black",
                      getMomentColor(moment.type)
                    )}
                  />

                  {/* Content */}
                  <div
                    className={cn(
                      "ml-16 p-4 rounded-lg border cursor-pointer transition-all",
                      "hover:border-white/30",
                      getMomentColor(moment.type),
                      expandedMoment === index && "ring-2 ring-white/20"
                    )}
                    onClick={() => setExpandedMoment(expandedMoment === index ? null : index)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {getMomentIcon(moment.type)}
                          <span className="text-sm font-medium">{getMomentLabel(moment.type)}</span>
                          <span className="text-xs text-white/60">{formatTimestamp(moment.timestamp)}</span>
                        </div>

                        <p className="text-sm text-white/80">{moment.description}</p>

                        {moment.participants.length > 0 && (
                          <div className="flex items-center gap-2 mt-2">
                            <Users className="w-3 h-3 text-white/40" />
                            <span className="text-xs text-white/60">{moment.participants.join(", ")}</span>
                          </div>
                        )}
                      </div>

                      <ChevronRight
                        className={cn("w-4 h-4 transition-transform", expandedMoment === index && "rotate-90")}
                      />
                    </div>

                    <AnimatePresence>
                      {expandedMoment === index && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="mt-3 pt-3 border-t border-white/10"
                        >
                          <div className="space-y-2">
                            <div className="flex items-center gap-4 text-xs">
                              <span className="text-white/60">
                                Sentiment:
                                <span
                                  className={cn(
                                    "ml-1 font-medium",
                                    moment.sentiment.score > 0.2
                                      ? "text-green-400"
                                      : moment.sentiment.score < -0.2
                                      ? "text-red-400"
                                      : "text-white/80"
                                  )}
                                >
                                  {moment.sentiment.label}
                                </span>
                              </span>
                              <span className="text-white/60">
                                Impact:
                                <span className="ml-1 font-medium text-white/80">
                                  {Math.round(moment.sentiment.magnitude * 100)}%
                                </span>
                              </span>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Insights Summary */}
      <Card className="bg-gradient-to-br from-purple-500/10 to-blue-500/10 border-white/10">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-lg bg-white/10">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-white mb-2">Meeting Insights</h3>
              <div className="space-y-1 text-sm text-white/80">
                {groupedMoments.high_engagement && (
                  <p>• {groupedMoments.high_engagement.length} moments of high engagement show active participation</p>
                )}
                {groupedMoments.decision_point && (
                  <p>• {groupedMoments.decision_point.length} decisions were made during the meeting</p>
                )}
                {groupedMoments.concern_raised && (
                  <p>• {groupedMoments.concern_raised.length} concerns need to be addressed</p>
                )}
                {groupedMoments.topic_shift && (
                  <p>• Discussion shifted topics {groupedMoments.topic_shift.length} times</p>
                )}
                {groupedMoments.action_item && (
                  <p>• {groupedMoments.action_item.length} action items were identified</p>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
