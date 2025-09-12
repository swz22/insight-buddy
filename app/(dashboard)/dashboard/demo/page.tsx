"use client";

import { useState } from "react";
import { ArrowLeft, Info, Users, MessageCircle } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { CommentableTranscript } from "@/components/comments/commentable-transcript";
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
    parsedTranscript: [
      {
        speaker: "Sarah Chen",
        text: "Good morning everyone. Let's kick off our Q1 planning session. We have a lot to cover today regarding our product roadmap."
      },
      {
        speaker: "Mike Johnson",
        text: "Thanks Sarah. I've prepared an overview of our current metrics. We saw 40% growth in user engagement last quarter, particularly in our analytics features."
      },
      {
        speaker: "Emily Davis",
        text: "That's fantastic. Based on user feedback, I think we should prioritize the mobile experience. We're getting consistent requests for a native app."
      },
      {
        speaker: "Alex Thompson",
        text: "I agree with Emily. Our mobile web experience is decent, but a native app would significantly improve user retention. I can have the technical requirements ready by next week."
      },
      {
        speaker: "Sarah Chen",
        text: "Excellent points. Let's also discuss the AI integration timeline. Mike, where are we on that?"
      },
      {
        speaker: "Mike Johnson",
        text: "We're about 70% complete with the core AI features. The transcription accuracy is at 95%, and we're now working on the sentiment analysis component."
      }
    ],
    transcript: `Sarah Chen: Good morning everyone. Let's kick off our Q1 planning session. We have a lot to cover today regarding our product roadmap.

Mike Johnson: Thanks Sarah. I've prepared an overview of our current metrics. We saw 40% growth in user engagement last quarter, particularly in our analytics features.

Emily Davis: That's fantastic. Based on user feedback, I think we should prioritize the mobile experience. We're getting consistent requests for a native app.

Alex Thompson: I agree with Emily. Our mobile web experience is decent, but a native app would significantly improve user retention. I can have the technical requirements ready by next week.

Sarah Chen: Excellent points. Let's also discuss the AI integration timeline. Mike, where are we on that?

Mike Johnson: We're about 70% complete with the core AI features. The transcription accuracy is at 95%, and we're now working on the sentiment analysis component.`,
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

  return (
    <div className="container mx-auto px-4 py-6 max-w-6xl">
      <Link
        href="/dashboard"
        className="inline-flex items-center text-white/60 hover:text-white/90 transition-colors mb-6 group"
      >
        <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
        Back to dashboard
      </Link>

      <div className="mb-6">
        <h1 className="text-3xl font-bold font-display mb-2">{demoData.title}</h1>
        <p className="text-white/60">{demoData.description}</p>
      </div>

      <Card className="shadow-xl mb-6">
        <CardHeader>
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-r from-purple-500/10 to-cyan-500/10 p-4 rounded-lg border border-purple-500/20"
          >
            <div className="flex items-center gap-2 mb-2">
              <Info className="w-5 h-5 text-purple-400" />
              <h3 className="font-semibold text-purple-300">Interactive Demo</h3>
            </div>
            <p className="text-sm text-white/70">
              This is a sample meeting to showcase collaboration features. Try selecting text to add comments or highlights!
            </p>
          </motion.div>
        </CardHeader>
      </Card>

      <div>
        <div className="flex gap-2 border-b border-white/10 pb-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "px-4 py-2 text-sm font-medium rounded-t-lg transition-all",
                activeTab === tab.id
                  ? "bg-white/10 text-white border-b-2 border-purple-500"
                  : "text-white/60 hover:text-white/80"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <Card className="shadow-xl">
          <CardContent className="p-6">
            {activeTab === "transcript" && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm text-white/60 mb-4">
                  <Users className="w-4 h-4" />
                  <span>4 participants</span>
                </div>

                <CommentableTranscript
                  meetingId="demo-meeting"
                  transcript={demoData.transcript}
                  parsedTranscript={demoData.parsedTranscript}
                  isDemo={true}
                  enabled={true}
                  className="text-white/90"
                />
              </div>
            )}

            {activeTab === "summary" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-3 text-white">Overview</h3>
                  <p className="text-white/80">{demoData.summary.overview}</p>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-3 text-white">Key Points</h3>
                  <ul className="space-y-2">
                    {demoData.summary.keyPoints.map((point, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="text-purple-400 mt-1">•</span>
                        <span className="text-white/80">{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-3 text-white">Decisions Made</h3>
                  <ul className="space-y-2">
                    {demoData.summary.decisions.map((decision, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="text-cyan-400 mt-1">✓</span>
                        <span className="text-white/80">{decision}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-3 text-white">Next Steps</h3>
                  <ul className="space-y-2">
                    {demoData.summary.nextSteps.map((step, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="text-green-400 mt-1">→</span>
                        <span className="text-white/80">{step}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {activeTab === "action-items" && (
              <div className="space-y-4">
                {demoData.actionItems.map((item, index) => (
                  <div
                    key={index}
                    className="p-4 bg-white/[0.03] rounded-lg border border-white/10"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-medium text-white">{item.task}</h4>
                      <span
                        className={cn(
                          "px-2 py-1 text-xs rounded-full",
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
                    <div className="flex items-center gap-4 text-sm text-white/60">
                      <span>👤 {item.assignee}</span>
                      <span>📅 {item.dueDate}</span>
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