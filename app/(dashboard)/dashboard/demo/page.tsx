"use client";

import { useState } from "react";
import { ArrowLeft, Info, Users, MessageCircle } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { CollaborativeTranscript } from "@/components/collaboration/collaborative-transcript";
import { motion } from "framer-motion";

export default function DemoMeetingPage() {
  const [activeTab, setActiveTab] = useState("transcript");

  const tabs = [
    { id: "transcript", label: "Transcript" },
    { id: "summary", label: "Summary" },
    { id: "action-items", label: "Action Items" },
  ];

  const demoData = {
    title: "Product Roadmap Planning Q1 2025",
    description: "Quarterly planning session to define product priorities and timeline",
    transcript: `[00:00] Sarah Chen: Good morning everyone. Let's kick off our Q1 planning session. We have a lot to cover today regarding our product roadmap.

[00:15] Mike Johnson: Thanks Sarah. I've prepared an overview of our current metrics. We saw 40% growth in user engagement last quarter, particularly in our analytics features.

[00:35] Emily Davis: That's fantastic. Based on user feedback, I think we should prioritize the mobile experience. We're getting consistent requests for a native app.

[00:52] Alex Thompson: I agree with Emily. Our mobile web experience is decent, but a native app would significantly improve user retention. I can have the technical requirements ready by next week.

[01:15] Sarah Chen: Excellent points. Let's also discuss the AI integration timeline. Mike, where are we on that?

[01:28] Mike Johnson: We're about 70% complete with the core AI features. The transcription accuracy is at 95%, and we're now working on the sentiment analysis component.`,
    summary: {
      overview: "Q1 planning session focused on product roadmap priorities, including mobile app development and AI feature integration.",
      keyPoints: [
        "40% growth in user engagement reported for last quarter",
        "Mobile native app identified as top priority based on user feedback",
        "AI features 70% complete with 95% transcription accuracy",
        "Beta launch scheduled for February 15th"
      ],
      decisions: [
        "Develop native mobile application in Q1",
        "Launch AI features beta on February 15th",
        "Allocate 30% of Q1 budget to infrastructure"
      ],
      nextSteps: [
        "Alex to prepare technical requirements for mobile app",
        "Emily to coordinate marketing announcement",
        "Mike to complete AI sentiment analysis component"
      ]
    },
    actionItems: [
      {
        task: "Prepare technical requirements for native mobile app",
        assignee: "Alex Thompson",
        dueDate: "Next Week",
        priority: "high"
      },
      {
        task: "Draft marketing communication plan for beta launch",
        assignee: "Emily Davis",
        dueDate: "Tomorrow EOD",
        priority: "high"
      },
      {
        task: "Complete AI sentiment analysis component",
        assignee: "Mike Johnson",
        dueDate: "Feb 1st",
        priority: "medium"
      }
    ]
  };

  const demoAnnotations = [
    {
      id: "demo-annotation-1",
      meeting_id: "demo",
      share_token: "demo",
      user_info: {
        name: "Sarah Chen",
        color: "#fbbf24",
        sessionId: "demo-session-1"
      },
      type: "highlight" as const,
      content: "Great metrics! This validates our focus on analytics.",
      position: { start_line: 2, end_line: 2 },
      created_at: new Date(Date.now() - 300000).toISOString()
    },
    {
      id: "demo-annotation-2",
      meeting_id: "demo",
      share_token: "demo",
      user_info: {
        name: "David Kim",
        color: "#10b981",
        sessionId: "demo-session-2"
      },
      type: "comment" as const,
      content: "We should also consider PWA as an interim solution while developing the native app.",
      position: { line_number: 3 },
      created_at: new Date(Date.now() - 60000).toISOString()
    }
  ];

  const handleAddHighlight = () => {};
  const handleAddComment = () => {};

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 sm:px-0 space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <Link
              href="/dashboard"
              className="inline-flex items-center text-white/60 hover:text-white/90 transition-colors group mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
              Back to dashboard
            </Link>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold">{demoData.title}</h1>
              <span className="px-2 py-1 bg-purple-500/20 text-purple-400 text-xs rounded-full font-medium">
                DEMO
              </span>
            </div>
            <p className="text-white/60">{demoData.description}</p>
          </div>
        </div>

        <Card className="bg-gradient-to-r from-purple-500/10 to-cyan-500/10 border-purple-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Info className="w-5 h-5 text-purple-400" />
              <p className="text-sm text-white/80">
                This is a demo meeting showing what your processed meetings will look like. Upload your own meeting to get started!
              </p>
              <Link href="/dashboard/upload" className="ml-auto">
                <Button variant="glow" size="sm">Upload Meeting</Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center gap-6 text-sm text-white/60">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            <span>2 viewers currently active</span>
          </div>
          <div className="flex items-center gap-2">
            <MessageCircle className="w-4 h-4" />
            <span>3 comments added</span>
          </div>
          <span className="ml-auto text-xs">Try collaboration features when you upload your first meeting!</span>
        </div>

        <Card className="shadow-xl">
          <CardHeader className="pb-0">
            <div className="flex gap-2 border-b border-white/10">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "px-4 py-3 text-sm font-medium transition-all relative",
                    activeTab === tab.id
                      ? "text-white"
                      : "text-white/60 hover:text-white"
                  )}
                >
                  {tab.label}
                  {activeTab === tab.id && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-purple-500 to-cyan-500"
                    />
                  )}
                </button>
              ))}
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            {activeTab === "transcript" && (
              <div className="relative">
                <CollaborativeTranscript
                  transcript={demoData.transcript}
                  annotations={demoAnnotations}
                  onAddHighlight={handleAddHighlight}
                  onAddComment={handleAddComment}
                  currentUserColor="#3b82f6"
                  currentUserName="Demo User"
                  currentSessionId="demo-current-user"
                />
              </div>
            )}

            {activeTab === "summary" && (
              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-medium text-white/70 mb-2">Overview</h4>
                  <p className="text-white/80">{demoData.summary.overview}</p>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-white/70 mb-3">Key Points</h4>
                  <ul className="space-y-2">
                    {demoData.summary.keyPoints.map((point, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-purple-400 mt-1">•</span>
                        <span className="text-white/80">{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-white/70 mb-3">Decisions Made</h4>
                  <ul className="space-y-2">
                    {demoData.summary.decisions.map((decision, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-cyan-400 mt-1">•</span>
                        <span className="text-white/80">{decision}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-white/70 mb-3">Next Steps</h4>
                  <ul className="space-y-2">
                    {demoData.summary.nextSteps.map((step, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-green-400 mt-1">•</span>
                        <span className="text-white/80">{step}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {activeTab === "action-items" && (
              <div className="space-y-4">
                {demoData.actionItems.map((item, i) => (
                  <div key={i} className="p-4 bg-white/[0.02] rounded-lg border border-white/10">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <p className="text-white/90 mb-2">{item.task}</p>
                        <div className="flex flex-wrap gap-3 text-sm">
                          <span className="text-white/60">
                            Assigned to: <span className="text-white/80">{item.assignee}</span>
                          </span>
                          <span className="text-white/60">
                            Due: <span className="text-white/80">{item.dueDate}</span>
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            "px-2 py-1 text-xs rounded-full font-medium",
                            item.priority === "high"
                              ? "bg-red-500/20 text-red-400"
                              : item.priority === "medium"
                              ? "bg-yellow-500/20 text-yellow-400"
                              : "bg-green-500/20 text-green-400"
                          )}
                        >
                          {item.priority}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}