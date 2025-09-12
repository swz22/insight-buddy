"use client";

import { useState } from "react";
import { CommentableTranscript } from "@/components/comments/commentable-transcript";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageSquare, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface DemoTranscriptViewerProps {
  transcript: string;
  className?: string;
}

const DEMO_PARSED_TRANSCRIPT = [
  {
    speaker: "Sarah Chen",
    text: "Welcome everyone to today's quarterly review. We've seen remarkable growth in Q3, exceeding our targets by 23%. This is largely due to our new product launch and improved customer retention strategies.",
  },
  {
    speaker: "Michael Torres",
    text: "That's fantastic news, Sarah. Can we dive deeper into which regions showed the most growth? I'm particularly interested in the APAC numbers.",
  },
  {
    speaker: "Sarah Chen",
    text: "Absolutely. APAC led with 45% growth, primarily driven by Japan and Singapore. North America followed with 28%, and Europe came in at 22%. The localization efforts really paid off in Japan.",
  },
  {
    speaker: "Emily Rodriguez",
    text: "Those are impressive numbers. What about customer acquisition costs? Have they remained stable with this growth?",
  },
  {
    speaker: "Sarah Chen",
    text: "Good question, Emily. CAC has actually decreased by 15% due to improved targeting and higher organic referrals. Our NPS score jumped from 42 to 58, which is driving word-of-mouth growth.",
  },
];

export function DemoTranscriptViewer({ transcript, className }: DemoTranscriptViewerProps) {
  const [showCommentDemo, setShowCommentDemo] = useState(false);
  const [demoComments, setDemoComments] = useState<any[]>([]);

  const handleAddDemoComment = (text: string, selection: any) => {
    const newComment = {
      id: `demo-${Date.now()}`,
      text,
      selection,
      userId: "demo-user",
      userName: "Demo User",
      userColor: "#a855f7",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      meetingId: "demo-meeting",
    };
    setDemoComments([...demoComments, newComment]);
  };

  return (
    <Card className={cn("bg-black/40 border-white/10", className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-bold text-white">
            Interactive Transcript Demo
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowCommentDemo(!showCommentDemo)}
            className={cn(
              "gap-2 transition-all",
              showCommentDemo
                ? "text-purple-400 border-purple-400/30 bg-purple-400/10"
                : "text-white/60 border-white/20 hover:bg-white/5"
            )}
          >
            <MessageSquare className="w-4 h-4" />
            {showCommentDemo ? "Comments Active" : "Try Comments"}
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {showCommentDemo && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 p-3 bg-gradient-to-r from-purple-500/10 to-cyan-500/10 border border-purple-500/20 rounded-lg"
          >
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 text-purple-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm text-purple-300 font-medium">
                  Demo Mode - Try the comment system!
                </p>
                <p className="text-xs text-purple-400/80 mt-0.5">
                  Select any text below to add a comment. Your comments are temporary and only visible to you.
                </p>
              </div>
            </div>
          </motion.div>
        )}

        <div className="max-h-[600px] overflow-y-auto custom-scrollbar pr-2">
          {showCommentDemo ? (
            <CommentableTranscript
              meetingId="demo-meeting"
              transcript={transcript}
              parsedTranscript={DEMO_PARSED_TRANSCRIPT}
              enabled={true}
              className="text-white/90"
            />
          ) : (
            <div className="space-y-4">
              {DEMO_PARSED_TRANSCRIPT.map((paragraph, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <div className="font-semibold text-purple-400 mb-1">
                    {paragraph.speaker}:
                  </div>
                  <div className="text-white/90 leading-relaxed">
                    {paragraph.text}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {!showCommentDemo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-6 p-4 bg-gradient-to-r from-purple-500/5 to-cyan-500/5 rounded-lg border border-white/10"
          >
            <p className="text-sm text-white/70 text-center">
              👆 Click "Try Comments" above to experience the interactive comment system
            </p>
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
}