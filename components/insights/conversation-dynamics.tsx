"use client";

import { ConversationDynamics as DynamicsType, InterruptionEvent } from "@/types/meeting-insights";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ArrowRight, Zap, AlertCircle, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";

interface ConversationDynamicsProps {
  dynamics: DynamicsType;
}

export function ConversationDynamics({ dynamics }: ConversationDynamicsProps) {
  const formatDuration = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    return `${seconds}s`;
  };

  const getInterruptionSeverity = (rate: number) => {
    if (rate < 2) return { label: "Low", color: "text-green-400 bg-green-500/20" };
    if (rate < 5) return { label: "Moderate", color: "text-yellow-400 bg-yellow-500/20" };
    return { label: "High", color: "text-red-400 bg-red-500/20" };
  };

  const severity = getInterruptionSeverity(dynamics.interruptionRate);

  return (
    <Card className="bg-white/[0.02] backdrop-blur-sm border-white/10">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Zap className="w-5 h-5 text-orange-400" />
          Conversation Dynamics
        </CardTitle>
        <CardDescription className="text-white/60">Interaction patterns and conversation flow</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white/[0.02] rounded-lg p-4">
            <p className="text-white/60 text-sm mb-1">Interruption Rate</p>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-bold text-white">{dynamics.interruptionRate.toFixed(1)}</p>
              <p className="text-sm text-white/40">per minute</p>
            </div>
            <div className={cn("inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs mt-2", severity.color)}>
              {severity.label} frequency
            </div>
          </div>

          <div className="bg-white/[0.02] rounded-lg p-4">
            <p className="text-white/60 text-sm mb-1">Average Turn</p>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-bold text-white">{Math.round(dynamics.averageTurnDuration)}s</p>
              <p className="text-sm text-white/40">duration</p>
            </div>
            <p className="text-xs text-white/40 mt-2">
              {dynamics.averageTurnDuration > 60
                ? "Long, thoughtful exchanges"
                : dynamics.averageTurnDuration > 30
                ? "Balanced conversation"
                : "Quick back-and-forth"}
            </p>
          </div>
        </div>

        {/* Speaker Balance */}
        <div className="space-y-3">
          <p className="text-sm text-white/60">Conversation Leaders</p>
          <div className="flex items-center justify-between p-3 bg-white/[0.02] rounded-lg">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-green-400" />
              <span className="text-white text-sm">Most Active</span>
            </div>
            <span className="text-white font-medium">{dynamics.mostDominantSpeaker}</span>
          </div>
          <div className="flex items-center justify-between p-3 bg-white/[0.02] rounded-lg">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-yellow-400" />
              <span className="text-white text-sm">Least Active</span>
            </div>
            <span className="text-white font-medium">{dynamics.leastActiveSpeaker}</span>
          </div>
        </div>

        {/* Recent Interruptions */}
        {dynamics.interruptionEvents.length > 0 && (
          <div className="space-y-3">
            <p className="text-sm text-white/60">Recent Interruptions</p>
            <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
              {dynamics.interruptionEvents.slice(0, 5).map((event, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center gap-3 p-3 bg-white/[0.02] rounded-lg"
                >
                  <ArrowRight className="w-4 h-4 text-white/40 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm text-white">
                      <span className="font-medium">{event.interrupter}</span>
                      <span className="text-white/60"> interrupted </span>
                      <span className="font-medium">{event.interrupted}</span>
                    </p>
                    <p className="text-xs text-white/40 mt-1 truncate">{event.context}</p>
                  </div>
                  <span className="text-xs text-white/40">{formatDuration(event.duration)}</span>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Summary */}
        <div className="p-4 bg-gradient-to-r from-purple-500/10 to-blue-500/10 rounded-lg border border-white/10">
          <p className="text-sm text-white/80">
            This meeting had a{" "}
            <span className="font-semibold">
              {dynamics.speakerBalance > 0.7
                ? "well-balanced"
                : dynamics.speakerBalance > 0.4
                ? "moderately balanced"
                : "imbalanced"}
            </span>{" "}
            conversation with{" "}
            <span className="font-semibold">
              {dynamics.interruptionRate < 2 ? "minimal" : dynamics.interruptionRate < 5 ? "moderate" : "frequent"}
            </span>{" "}
            interruptions. The average speaking turn lasted{" "}
            <span className="font-semibold">{Math.round(dynamics.averageTurnDuration)} seconds</span>.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
