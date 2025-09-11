"use client";

import { useState } from "react";
import { ArrowLeft, Info } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

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
                <Button size="sm" variant="glow">
                  Upload Meeting
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-xl">
          <CardHeader>
            <div className="flex gap-2">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "px-4 py-2 rounded-lg transition-all text-sm font-medium",
                    activeTab === tab.id
                      ? "bg-white/10 text-white"
                      : "text-white/60 hover:text-white hover:bg-white/5"
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </CardHeader>
          <CardContent>
            {activeTab === "transcript" && (
              <div className="prose prose-invert max-w-none">
                <div className="whitespace-pre-wrap text-white/80">{demoData.transcript}</div>
              </div>
            )}

            {activeTab === "summary" && (
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">Overview</h3>
                  <p className="text-white/80">{demoData.summary.overview}</p>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Key Points</h3>
                  <ul className="list-disc list-inside space-y-1">
                    {demoData.summary.keyPoints.map((point, i) => (
                      <li key={i} className="text-white/80">
                        {point}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Decisions</h3>
                  <ul className="list-disc list-inside space-y-1">
                    {demoData.summary.decisions.map((decision, i) => (
                      <li key={i} className="text-white/80">
                        {decision}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Next Steps</h3>
                  <ul className="list-disc list-inside space-y-1">
                    {demoData.summary.nextSteps.map((step, i) => (
                      <li key={i} className="text-white/80">
                        {step}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {activeTab === "action-items" && (
              <div className="space-y-3">
                {demoData.actionItems.map((item, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-white/[0.02]">
                    <div className="flex-1">
                      <p className="font-medium">{item.task}</p>
                      <div className="flex items-center gap-4 mt-1 text-sm text-white/60">
                        <span>Assigned to: {item.assignee}</span>
                        <span>Due: {item.dueDate}</span>
                        <span
                          className={cn(
                            "px-2 py-0.5 rounded text-xs",
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