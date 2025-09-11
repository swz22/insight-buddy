"use client";

import { ArrowLeft, Upload, FileText, Target, Sparkles } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function HelpPage() {
  const features = [
    {
      icon: Upload,
      title: "Upload & Transcribe",
      description: "Drop any audio/video file up to 500MB. AI automatically transcribes with speaker detection.",
    },
    {
      icon: FileText,
      title: "Smart Summaries",
      description: "Get instant overviews, key points, decisions, and action items extracted from your meetings.",
    },
    {
      icon: Target,
      title: "Track Action Items",
      description: "Automatically detect tasks, assign priorities, and track completion across all meetings.",
    },
    {
      icon: Sparkles,
      title: "Meeting Insights",
      description: "Analyze speaker participation, sentiment trends, and conversation dynamics.",
    },
  ];

  return (
    <div className="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      <div className="space-y-6 animate-fade-in">
        <div>
          <Link
            href="/dashboard"
            className="inline-flex items-center text-white/60 hover:text-white/90 transition-colors group mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
            Back to dashboard
          </Link>
          <h1 className="text-4xl font-bold font-display text-white">
            Getting Started with <span className="gradient-text">Insight Buddy</span>
          </h1>
          <p className="text-white/60 mt-2">Everything you need to know to get the most out of your meetings</p>
        </div>

        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle>How It Works</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div key={index} className="flex gap-4">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500/20 to-cyan-500/20 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <h4 className="font-medium mb-1">{feature.title}</h4>
                    <p className="text-sm text-white/60">{feature.description}</p>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle>Quick Start Guide</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-3">
              <li className="flex gap-3">
                <span className="w-6 h-6 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center flex-shrink-0 text-xs font-bold">
                  1
                </span>
                <span>Click "Upload" or drag a file to the dashboard</span>
              </li>
              <li className="flex gap-3">
                <span className="w-6 h-6 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center flex-shrink-0 text-xs font-bold">
                  2
                </span>
                <span>Wait 2-5 minutes for AI processing</span>
              </li>
              <li className="flex gap-3">
                <span className="w-6 h-6 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center flex-shrink-0 text-xs font-bold">
                  3
                </span>
                <span>Review transcript, summary, and action items</span>
              </li>
              <li className="flex gap-3">
                <span className="w-6 h-6 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center flex-shrink-0 text-xs font-bold">
                  4
                </span>
                <span>Share with team or export as PDF/DOCX</span>
              </li>
            </ol>
          </CardContent>
        </Card>

        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle>Tips & Tricks</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-white/80">• Use keyboard shortcuts: Space to play/pause, arrows to seek</p>
            <p className="text-sm text-white/80">• Filter meetings by date, participants, or keywords</p>
            <p className="text-sm text-white/80">• Export meetings as PDF for easy sharing</p>
            <p className="text-sm text-white/80">• Track action item completion across all meetings</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}