"use client";

import { Upload, Sparkles, FileText, Target, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import Link from "next/link";
import { motion } from "framer-motion";

export function EmptyStateGuide() {
  const steps = [
    {
      icon: Upload,
      title: "Upload Meeting",
      description: "Drop your audio or video file",
      color: "from-purple-500 to-purple-600",
    },
    {
      icon: Sparkles,
      title: "AI Transcribes",
      description: "Automatic speech-to-text with speakers",
      color: "from-cyan-500 to-cyan-600",
    },
    {
      icon: FileText,
      title: "Get Summary",
      description: "Key points, decisions & action items",
      color: "from-blue-500 to-blue-600",
    },
    {
      icon: Target,
      title: "Track Progress",
      description: "Analytics & insights across meetings",
      color: "from-green-500 to-green-600",
    },
  ];

  return (
    <div className="max-w-4xl mx-auto py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center mb-12"
      >
        <h2 className="text-3xl font-bold mb-4">
          Welcome to <span className="gradient-text">Insight Buddy</span>
        </h2>
        <p className="text-white/60 text-lg">
          Transform your meetings into actionable insights in minutes
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-12">
        {steps.map((step, index) => {
          const Icon = step.icon;
          return (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <Card className="relative h-full p-6 text-center hover:bg-white/[0.03] transition-all">
                <div
                  className={`w-16 h-16 mx-auto mb-4 rounded-xl bg-gradient-to-br ${step.color} flex items-center justify-center`}
                >
                  <Icon className="w-8 h-8 text-white" />
                </div>
                <h3 className="font-semibold mb-2">{step.title}</h3>
                <p className="text-sm text-white/60">{step.description}</p>
                {index < steps.length - 1 && (
                  <ArrowRight className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 hidden md:block" />
                )}
              </Card>
            </motion.div>
          );
        })}
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        className="text-center space-y-4"
      >
        <div className="flex gap-4 justify-center">
          <Link href="/dashboard/upload">
            <Button variant="glow" size="lg" className="gap-2">
              <Upload className="w-5 h-5" />
              Upload Your First Meeting
            </Button>
          </Link>
          <Button variant="outline" size="lg" className="gap-2" disabled>
            <Sparkles className="w-5 h-5" />
            Try Demo (Coming Soon)
          </Button>
        </div>
        <p className="text-sm text-white/40">
          Supports MP3, WAV, MP4, and more • Files up to 500MB
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.6 }}
        className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6"
      >
        <div className="text-center">
          <div className="text-3xl font-bold gradient-text mb-2">100%</div>
          <p className="text-sm text-white/60">Accurate Transcription</p>
        </div>
        <div className="text-center">
          <div className="text-3xl font-bold gradient-text mb-2">2-5 min</div>
          <p className="text-sm text-white/60">Processing Time</p>
        </div>
        <div className="text-center">
          <div className="text-3xl font-bold gradient-text mb-2">Secure</div>
          <p className="text-sm text-white/60">Your Data Protected</p>
        </div>
      </motion.div>
    </div>
  );
}