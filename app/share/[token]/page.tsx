"use client";

import { useState } from "react";
import { ArrowLeft, Info, Users, MessageCircle } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { CollaborativeTranscript } from "@/components/collaboration/collaborative-transcript";
import { CommentFAB } from "@/components/collaboration/comment-fab";
import { InlineCommentBox } from "@/components/collaboration/inline-comment-box";
import { motion, AnimatePresence } from "framer-motion";

export default function DemoMeetingPage() {
  const [activeTab, setActiveTab] = useState("transcript");
  const [showCommentBox, setShowCommentBox] = useState(false);
  const [commentPosition, setCommentPosition] = useState<{ x: number; y: number } | null>(null);

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

  const [demoAnnotations, setDemoAnnotations] = useState([
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
      created_at: new Date(Date.now() - 120000).toISOString()
    }
  ]);

  const handleAddComment = (position?: { x: number; y: number }) => {
    if (position) {
      setCommentPosition(position);
    } else {
      const centerX = window.innerWidth / 2;
      const centerY = window.scrollY + window.innerHeight / 3;
      setCommentPosition({ x: centerX, y: centerY });
    }
    setShowCommentBox(true);
  };

  const handleSubmitComment = (comment: string, position: { x: number; y: number }) => {
    const newAnnotation = {
      id: `demo-annotation-${Date.now()}`,
      meeting_id: "demo",
      share_token: "demo",
      user_info: {
        name: "Demo User",
        color: "#8b5cf6",
        sessionId: "demo-current"
      },
      type: "comment" as const,
      content: comment,
      position: { line_number: Math.floor(Math.random() * 6) + 1 },
      created_at: new Date().toISOString()
    };
    
    setDemoAnnotations([...demoAnnotations, newAnnotation]);
    setShowCommentBox(false);
    setCommentPosition(null);
  };

  const handleAddHighlight = (startLine: number, endLine: number, text: string) => {
    const newAnnotation = {
      id: `demo-annotation-${Date.now()}`,
      meeting_id: "demo",
      share_token: "demo",
      user_info: {
        name: "Demo User",
        color: "#8b5cf6",
        sessionId: "demo-current"
      },
      type: "highlight" as const,
      content: text,
      position: { start_line: startLine, end_line: endLine },
      created_at: new Date().toISOString()
    };
    
    setDemoAnnotations([...demoAnnotations, newAnnotation]);
  };

  const handleAddCommentToTranscript = (lineNumber: number, text: string) => {
    const newAnnotation = {
      id: `demo-annotation-${Date.now()}`,
      meeting_id: "demo",
      share_token: "demo",
      user_info: {
        name: "Demo User",
        color: "#8b5cf6",
        sessionId: "demo-current"
      },
      type: "comment" as const,
      content: text,
      position: { line_number: lineNumber },
      created_at: new Date().toISOString()
    };
    
    setDemoAnnotations([...demoAnnotations, newAnnotation]);
  };

  const handleDeleteAnnotation = (annotationId: string) => {
    setDemoAnnotations(demoAnnotations.filter(a => a.id !== annotationId));
  };

  const handleEditAnnotation = (annotationId: string, newContent: string) => {
    setDemoAnnotations(demoAnnotations.map(a => 
      a.id === annotationId ? { ...a, content: newContent } : a
    ));
  };

  const commentCount = demoAnnotations.filter(a => a.type === "comment").length;

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      <div className="space-y-6 animate-fade-in">
        <div>
          <Link
            href="/dashboard"
            className="inline-flex items-center text-white/60 hover:text-white/90 transition-colors group mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
            Back to dashboard
          </Link>
          <h1 className="text-3xl font-bold text-white">{demoData.title}</h1>
          <p className="text-white/60 mt-2">{demoData.description}</p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-purple-500/10 to-cyan-500/10 rounded-lg p-4 border border-purple-500/20"
        >
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-purple-400 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-white/80">
                <span className="font-semibold text-purple-400">Interactive Demo:</span> This is a sample meeting to showcase collaboration features. 
                Try clicking the floating comment button, highlighting text, or adding comments to experience real-time collaboration!
              </p>
            </div>
          </div>
        </motion.div>

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
                  <span className="mx-2">•</span>
                  <MessageCircle className="w-4 h-4" />
                  <span>{commentCount} comments</span>
                </div>

                <CollaborativeTranscript
                  transcript={demoData.transcript}
                  annotations={demoAnnotations}
                  onAddHighlight={handleAddHighlight}
                  onAddComment={handleAddCommentToTranscript}
                  onDeleteAnnotation={handleDeleteAnnotation}
                  onEditAnnotation={handleEditAnnotation}
                  currentUserColor="#8b5cf6"
                  currentUserName="Demo User"
                  currentSessionId="demo-current"
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

      {activeTab === "transcript" && (
        <>
          <CommentFAB
            onAddComment={handleAddComment}
            commentCount={commentCount}
          />
          
          <AnimatePresence>
            {showCommentBox && commentPosition && (
              <InlineCommentBox
                position={commentPosition}
                onSubmit={handleSubmitComment}
                onCancel={() => {
                  setShowCommentBox(false);
                  setCommentPosition(null);
                }}
                userName="Demo User"
                userColor="#8b5cf6"
              />
            )}
          </AnimatePresence>
        </>
      )}
    </div>
  );
}