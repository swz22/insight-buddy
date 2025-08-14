"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { motion } from "framer-motion";
import { Zap, Users, MessageSquare, Timer } from "lucide-react";
import { cn } from "@/lib/utils";

interface EngagementScoreProps {
  score: number;
  dynamics: {
    totalInterruptions: number;
    interruptionRate: number;
    averageTurnDuration: number;
    speakerBalance: number;
    mostDominantSpeaker: string;
    leastActiveSpeaker: string;
  };
}

export function EngagementScore({ score, dynamics }: EngagementScoreProps) {
  const getScoreColor = (score: number) => {
    if (score >= 80) return "from-green-500 to-emerald-400";
    if (score >= 60) return "from-blue-500 to-cyan-400";
    if (score >= 40) return "from-yellow-500 to-orange-400";
    return "from-red-500 to-pink-400";
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return "Excellent";
    if (score >= 60) return "Good";
    if (score >= 40) return "Fair";
    return "Needs Improvement";
  };

  const radius = 80;
  const strokeWidth = 12;
  const normalizedRadius = radius - strokeWidth * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <Card className="bg-white/[0.02] backdrop-blur-sm border-white/10">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Zap className="w-5 h-5 text-yellow-400" />
          Engagement Score
        </CardTitle>
        <CardDescription className="text-white/60">Overall meeting effectiveness and participation</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-center">
          <div className="relative">
            <svg height={radius * 2} width={radius * 2} className="transform -rotate-90">
              <circle
                stroke="rgba(255, 255, 255, 0.1)"
                fill="transparent"
                strokeWidth={strokeWidth}
                r={normalizedRadius}
                cx={radius}
                cy={radius}
              />
              <motion.circle
                stroke="url(#gradient)"
                fill="transparent"
                strokeWidth={strokeWidth}
                strokeDasharray={circumference + " " + circumference}
                initial={{ strokeDashoffset: circumference }}
                animate={{ strokeDashoffset }}
                transition={{ duration: 1.5, ease: "easeOut" }}
                strokeLinecap="round"
                r={normalizedRadius}
                cx={radius}
                cy={radius}
              />
              <defs>
                <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop
                    offset="0%"
                    className={cn("transition-colors", getScoreColor(score).split(" ")[0].replace("from-", "text-"))}
                  />
                  <stop
                    offset="100%"
                    className={cn("transition-colors", getScoreColor(score).split(" ")[1].replace("to-", "text-"))}
                  />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5, duration: 0.5 }}
              >
                <p className="text-4xl font-bold text-white">{Math.round(score)}</p>
                <p className="text-sm text-white/60">{getScoreLabel(score)}</p>
              </motion.div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white/[0.02] rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-4 h-4 text-blue-400" />
              <p className="text-white/60 text-sm">Balance</p>
            </div>
            <p className="text-white text-xl font-semibold">{(dynamics.speakerBalance * 100).toFixed(0)}%</p>
            <p className="text-white/40 text-xs mt-1">Speaker participation equality</p>
          </div>

          <div className="bg-white/[0.02] rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <MessageSquare className="w-4 h-4 text-purple-400" />
              <p className="text-white/60 text-sm">Flow</p>
            </div>
            <p className="text-white text-xl font-semibold">{dynamics.totalInterruptions}</p>
            <p className="text-white/40 text-xs mt-1">Total interruptions</p>
          </div>
        </div>

        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-white/60">Participation Balance</span>
            <span className="text-white">{(dynamics.speakerBalance * 100).toFixed(0)}%</span>
          </div>
          <div className="h-2 bg-white/[0.05] rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${dynamics.speakerBalance * 100}%` }}
              transition={{ duration: 1, delay: 0.2 }}
              className="h-full bg-gradient-to-r from-purple-500 to-blue-500"
            />
          </div>
        </div>

        <div className="mt-4 p-3 rounded-lg bg-white/[0.02] border border-white/10">
          <div className="flex items-center gap-2">
            <Timer className="w-4 h-4 text-cyan-400" />
            <p className="text-white/80 text-sm">
              Average turn duration: <span className="font-semibold">{Math.round(dynamics.averageTurnDuration)}s</span>
            </p>
          </div>
        </div>

        <div className="mt-4 p-3 rounded-lg bg-white/[0.02] border border-white/10">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-yellow-400" />
            <p className="text-white/80 text-sm">
              {dynamics.interruptionRate < 2
                ? "Excellent conversation flow with minimal interruptions"
                : dynamics.interruptionRate < 5
                ? "Good conversation dynamics with some natural overlap"
                : "High interruption rate may indicate heated discussion"}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
