"use client";

import { TranscriptTabContent } from "@/components/meetings/transcript-tab-content";
import { Card, CardContent } from "@/components/ui/card";
import { FileText } from "lucide-react";

interface TranscriptSectionProps {
  meetingId: string;
  transcript: string | null;
  title: string;
}

export function TranscriptSection({ meetingId, transcript, title }: TranscriptSectionProps) {
  if (!transcript) {
    return (
      <Card className="bg-black/40 border-white/10">
        <CardContent className="p-8">
          <div className="text-center">
            <FileText className="w-12 h-12 text-white/20 mx-auto mb-4" />
            <p className="text-white/50">No transcript available yet</p>
            <p className="text-white/30 text-sm mt-2">
              Transcript will appear here once processing is complete
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-black/40 border-white/10">
      <CardContent className="p-6">
        <TranscriptTabContent
          meetingId={meetingId}
          transcript={transcript}
        />
      </CardContent>
    </Card>
  );
}