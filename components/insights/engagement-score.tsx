"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Activity, Zap, Users, MessageSquare } from "lucide-react";
import { motion } from "framer-motion";

interface EngagementScoreProps {
  score: number;
  dynamics: {
    speakerBalance: number;
    interruptionRate: number;
    totalInterruptions: number;
  };
}

export function EngagementScore({ score, dynamics }: EngagementScoreProps) {
  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-400";
    if (score >= 60) return "text-emerald-400";
    if (score >= 40) return "text-yellow-400";
    if (score >= 20) return "text-orange-400";
    return "text-red-400";
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return "Excellent";
    if (score >= 60) return "Good";
    if (score >= 40) return "Fair";
    if (score >= 20) return "Poor";
    return "Very Poor";
  };

  const circumference = 2 * Math.PI * 40;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <Card className="bg-white/[0.02] backdrop-blur-sm border-white/10">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Activity className="w-5 h-5 text-yellow-400" />
          Engagement Score
        </CardTitle>
        <CardDescription className="text-white/60">Overall meeting effectiveness and participation</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-center mb-6">
          <div className="relative w-40 h-40">
            <svg className="w-full h-full transform -rotate-90">
              <circle cx="80" cy="80" r="40" stroke="rgba(255,255,255,0.1)" strokeWidth="8" fill="none" />
              <motion.circle
                cx="80"
                cy="80"
                r="40"
                stroke="url(#scoreGradient)"
                strokeWidth="8"
                fill="none"
                strokeLinecap="round"
                strokeDasharray={circumference}
                initial={{ strokeDashoffset: circumference }}
                animate={{ strokeDashoffset }}
                transition={{ duration: 1, ease: "easeOut" }}
              />
              <defs>
                <linearGradient id="scoreGradient">
                  <stop offset="0%" stopColor="#10b981" />
                  <stop offset="50%" stopColor="#a855f7" />
                  <stop offset="100%" stopColor="#3b82f6" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.5, type: "spring" }}
                className={cn("text-4xl font-bold", getScoreColor(score))}
              >
                {score}
              </motion.div>
              <p className="text-white/60 text-sm">{getScoreLabel(score)}</p>
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
