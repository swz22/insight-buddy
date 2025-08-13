"use client";

import { useMemo } from "react";
import { BarChart3, TrendingUp, MessageSquare, Clock } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SpeakerMetricsChart, type SpeakerMetric } from "@/components/insights/speaker-metrics-chart";
import { Database } from "@/types/supabase";

type Meeting = Database["public"]["Tables"]["meetings"]["Row"];

interface MeetingInsightsProps {
  meeting: Meeting;
}

export function MeetingInsights({ meeting }: MeetingInsightsProps) {
  const speakerMetrics = useMemo<SpeakerMetric[]>(() => {
    if (!meeting.transcript || !meeting.duration) return [];
    const duration = meeting.duration;
    const speakerData = new Map<string, { wordCount: number; duration: number }>();
    const lines = meeting.transcript.split("\n");
    let currentSpeaker = "";
    let totalWords = 0;

    lines.forEach((line) => {
      const speakerMatch = line.match(/^(Speaker \w+):/);
      if (speakerMatch) {
        currentSpeaker = speakerMatch[1];
        const text = line.substring(speakerMatch[0].length).trim();
        const wordCount = text.split(/\s+/).filter((word) => word.length > 0).length;

        if (!speakerData.has(currentSpeaker)) {
          speakerData.set(currentSpeaker, { wordCount: 0, duration: 0 });
        }

        const data = speakerData.get(currentSpeaker)!;
        data.wordCount += wordCount;
        totalWords += wordCount;
      }
    });

    const metrics: SpeakerMetric[] = [];
    speakerData.forEach((data, speaker) => {
      const percentage = totalWords > 0 ? Math.round((data.wordCount / totalWords) * 100) : 0;
      const estimatedDuration = Math.round((percentage / 100) * duration);

      metrics.push({
        speaker,
        duration: estimatedDuration,
        wordCount: data.wordCount,
        percentage,
      });
    });

    return metrics.sort((a, b) => b.duration - a.duration);
  }, [meeting.transcript, meeting.duration]);

  const insights = useMemo(() => {
    const hasTranscript = !!meeting.transcript;
    const wordCount = hasTranscript && meeting.transcript ? meeting.transcript.split(/\s+/).length : 0;
    const avgWordsPerMinute = meeting.duration && wordCount > 0 ? Math.round(wordCount / (meeting.duration / 60)) : 0;

    const dominantSpeaker = speakerMetrics.length > 0 ? speakerMetrics[0] : null;
    const speakingBalance = speakerMetrics.length > 1 ? Math.abs(50 - (dominantSpeaker?.percentage || 50)) : 0;

    return {
      hasTranscript,
      wordCount,
      avgWordsPerMinute,
      dominantSpeaker,
      speakingBalance,
      participantCount: meeting.participants?.length || speakerMetrics.length || 0,
    };
  }, [meeting, speakerMetrics]);

  if (!meeting.transcript) {
    return (
      <div className="text-center py-12">
        <BarChart3 className="w-12 h-12 text-white/20 mx-auto mb-4" />
        <p className="text-white/50 italic mb-4">Insights will be available after transcript is generated.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-white/[0.02] border-white/10">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Duration
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold gradient-text">
              {meeting.duration ? Math.round(meeting.duration / 60) : 0}m
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white/[0.02] border-white/10">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Total Words
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-cyan-400">{insights.wordCount.toLocaleString()}</p>
          </CardContent>
        </Card>

        <Card className="bg-white/[0.02] border-white/10">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Speaking Pace
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-purple-400">{insights.avgWordsPerMinute} wpm</p>
          </CardContent>
        </Card>

        <Card className="bg-white/[0.02] border-white/10">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Balance Score
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-400">{100 - insights.speakingBalance}%</p>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-white/[0.02] border-white/10">
        <CardHeader>
          <CardTitle className="text-lg font-display">Speaker Distribution</CardTitle>
          <CardDescription>Speaking time breakdown by participant</CardDescription>
        </CardHeader>
        <CardContent>
          <SpeakerMetricsChart metrics={speakerMetrics} />
        </CardContent>
      </Card>

      {insights.dominantSpeaker && insights.speakingBalance > 30 && (
        <Card className="bg-yellow-500/5 border-yellow-500/20">
          <CardHeader>
            <CardTitle className="text-sm text-yellow-400">Meeting Balance Alert</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-white/70">
              {insights.dominantSpeaker.speaker} dominated the conversation with {insights.dominantSpeaker.percentage}%
              of speaking time. Consider encouraging more balanced participation in future meetings.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
