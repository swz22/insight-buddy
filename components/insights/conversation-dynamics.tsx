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
            <p className="text-xs text-white/40 mt-2">Time per speaking turn</p>
          </div>
        </div>

        {/* Dominance Analysis */}
        <div className="bg-white/[0.02] rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-white/80 font-medium">Speaker Dominance</p>
            <TrendingUp className="w-4 h-4 text-purple-400" />
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-white/60 text-sm">Most Active</span>
              <span className="text-white font-medium">{dynamics.mostDominantSpeaker}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-white/60 text-sm">Least Active</span>
              <span className="text-white font-medium">{dynamics.leastActiveSpeaker}</span>
            </div>
            <div className="mt-2 p-2 rounded bg-white/[0.02]">
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    "w-2 h-2 rounded-full",
                    dynamics.speakerBalance > 0.7
                      ? "bg-green-400"
                      : dynamics.speakerBalance > 0.4
                      ? "bg-yellow-400"
                      : "bg-red-400"
                  )}
                />
                <p className="text-xs text-white/60">
                  {dynamics.speakerBalance > 0.7
                    ? "Well-balanced participation"
                    : dynamics.speakerBalance > 0.4
                    ? "Moderate imbalance in participation"
                    : "Significant imbalance - consider encouraging quieter participants"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Interruptions */}
        {dynamics.interruptionEvents.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-white/80 font-medium">Recent Interruptions</p>
              <span className="text-xs text-white/40">{dynamics.totalInterruptions} total</span>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
              {dynamics.interruptionEvents.slice(0, 5).map((event, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.02]"
                >
                  <AlertCircle className="w-4 h-4 text-orange-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-white font-medium">{event.interrupter}</span>
                      <ArrowRight className="w-3 h-3 text-white/40" />
                      <span className="text-white/60">{event.interrupted}</span>
                    </div>
                    <p className="text-xs text-white/40 truncate mt-1">"{event.context}"</p>
                  </div>
                  <span className="text-xs text-white/40 whitespace-nowrap">{formatDuration(event.duration)}</span>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Insights */}
        <div className="bg-gradient-to-br from-purple-500/10 to-blue-500/10 rounded-lg p-4 border border-purple-500/20">
          <p className="text-white/80 text-sm leading-relaxed">
            This meeting shows{" "}
            {dynamics.speakerBalance > 0.7 ? "excellent" : dynamics.speakerBalance > 0.4 ? "moderate" : "poor"} balance
            in participation with{" "}
            {dynamics.interruptionRate < 2 ? "minimal" : dynamics.interruptionRate < 5 ? "some" : "frequent"}{" "}
            interruptions.
            {dynamics.averageTurnDuration > 30
              ? " Speakers are taking extended turns, which may indicate thorough discussion or monologuing."
              : " Quick exchanges suggest an active, dynamic conversation."}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
