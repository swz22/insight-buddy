"use client";

import { useState } from "react";
import { CommentableTranscript } from "@/components/comments/commentable-transcript";
import { Button } from "@/components/ui/button";
import { MessageSquare, MessageSquareOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface TranscriptTabContentProps {
  meetingId: string;
  transcript: string;
  parsedTranscript?: Array<{
    speaker: string;
    text: string;
    timestamp?: number;
  }>;
  isDemo?: boolean;
}

export function TranscriptTabContent({
  meetingId,
  transcript,
  parsedTranscript,
  isDemo = false,
}: TranscriptTabContentProps) {
  const [commentsEnabled, setCommentsEnabled] = useState(true);

  const parseTranscript = (text: string) => {
    const lines = text.split("\n");
    const parsed: Array<{ speaker: string; text: string }> = [];
    let currentSpeaker = "";
    let currentText = "";

    lines.forEach((line) => {
      const speakerMatch = line.match(/^([^:]+):\s*(.*)$/);
      if (speakerMatch) {
        if (currentSpeaker && currentText) {
          parsed.push({ speaker: currentSpeaker, text: currentText.trim() });
        }
        currentSpeaker = speakerMatch[1];
        currentText = speakerMatch[2];
      } else if (line.trim()) {
        currentText += " " + line.trim();
      }
    });

    if (currentSpeaker && currentText) {
      parsed.push({ speaker: currentSpeaker, text: currentText.trim() });
    }

    return parsed.length > 0 ? parsed : undefined;
  };

  const processedTranscript = parsedTranscript || parseTranscript(transcript);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Transcript</h3>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCommentsEnabled(!commentsEnabled)}
          className={cn(
            "gap-2 transition-colors",
            commentsEnabled 
              ? "text-purple-400 border-purple-400/30 hover:bg-purple-400/10" 
              : "text-white/60 border-white/20 hover:bg-white/5"
          )}
        >
          {commentsEnabled ? (
            <>
              <MessageSquare className="w-4 h-4" />
              Comments On
            </>
          ) : (
            <>
              <MessageSquareOff className="w-4 h-4" />
              Comments Off
            </>
          )}
        </Button>
      </div>

      {commentsEnabled ? (
        <CommentableTranscript
          meetingId={meetingId}
          transcript={transcript}
          parsedTranscript={processedTranscript}
          enabled={!isDemo}
          className="text-white/90"
        />
      ) : (
        <div className="space-y-4 text-white/90">
          {processedTranscript ? (
            processedTranscript.map((paragraph, index) => (
              <div key={index}>
                <div className="font-semibold text-purple-400 mb-1">
                  {paragraph.speaker}:
                </div>
                <div className="leading-relaxed">{paragraph.text}</div>
              </div>
            ))
          ) : (
            <div className="whitespace-pre-wrap">{transcript}</div>
          )}
        </div>
      )}
    </div>
  );
}