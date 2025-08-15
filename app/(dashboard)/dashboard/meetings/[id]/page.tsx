"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  Clock,
  Users,
  FileText,
  Lightbulb,
  ListChecks,
  Share2,
  Loader2,
  BarChart3,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useMeeting } from "@/hooks/use-meetings";
import { AudioPlayer } from "@/components/audio/audio-player";
import { ShareDialog } from "@/components/meetings/share-dialog";
import { LanguageSelector } from "@/components/ui/language-selector";
import { useTranslation } from "@/hooks/use-translation";
import { useInsights } from "@/hooks/use-insights";
import { useMeetingProcessing } from "@/hooks/use-meeting-processing";
import { useTranscriptionStatus } from "@/hooks/use-transcription-status";
import { SpeakerMetricsChart, type SpeakerMetric } from "@/components/insights/speaker-metrics-chart";
import { SentimentTimeline } from "@/components/insights/sentiment-timeline";
import { KeyMoments } from "@/components/insights/key-moments";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import type { SpeakerMetrics } from "@/types/meeting-insights";

interface DatabaseInsights {
  id: string;
  meeting_id: string;
  speaker_metrics: any;
  sentiment: any;
  dynamics: any;
  key_moments?: any;
  engagement_score?: number;
  generated_at?: string;
  created_at: string;
  updated_at?: string;
}

interface MeetingInsightsData {
  id?: string;
  meeting_id: string;
  speakerMetrics: SpeakerMetrics[];
  sentiment: any;
  dynamics: any;
  keyMoments?: any[];
  engagementScore: number;
  generatedAt?: string;
  created_at: string;
}

export default function MeetingPage() {
  const params = useParams();
  const router = useRouter();
  const toast = useToast();
  const meetingId = params.id as string;

  const { data: meeting, isLoading: meetingLoading, error: meetingError } = useMeeting(meetingId);
  const { isProcessing } = useMeetingProcessing({ meeting, enabled: !!meeting });
  const { insights, isLoading: insightsLoading } = useInsights({ meetingId, enabled: !!meeting });
  const { isTranscribing } = useTranscriptionStatus({ meeting, enabled: !!meeting });

  // Cast insights to the database format
  const dbInsights = insights as DatabaseInsights | null;

  const [activeTab, setActiveTab] = useState<"transcript" | "summary" | "actions" | "insights">("transcript");
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState("en");
  const [isTranslating, setIsTranslating] = useState(false);

  const { selectedLanguage, translate, availableLanguages } = useTranslation({
    meetingId,
    enabled: !!meeting && !!meeting.transcript,
  });

  useEffect(() => {
    if (meeting?.language) {
      setCurrentLanguage(meeting.language);
    }
  }, [meeting]);

  useEffect(() => {
    if (selectedLanguage) {
      setCurrentLanguage(selectedLanguage);
    }
  }, [selectedLanguage]);

  if (meetingLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (meetingError || !meeting) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="bg-red-500/10 border-red-500/20">
          <CardContent className="p-6">
            <p className="text-red-400">Failed to load meeting details</p>
            <Button onClick={() => router.push("/dashboard")} className="mt-4" variant="outline">
              Return to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleGenerateInsights = async () => {
    if (!meeting.transcript) {
      toast.error("Transcript required for insights generation");
      return;
    }

    setIsGeneratingInsights(true);
    try {
      const response = await fetch(`/api/meetings/${meetingId}/insights`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to generate insights");
      }

      toast.success("Insights generated successfully!");
      window.location.reload();
    } catch (error) {
      console.error("Insights generation error:", error);
      toast.error("Failed to generate insights");
    } finally {
      setIsGeneratingInsights(false);
    }
  };

  const handleTranslate = async (targetLanguage: string) => {
    setIsTranslating(true);
    try {
      await translate(targetLanguage);
      setCurrentLanguage(targetLanguage);
      toast.success(`Meeting translated to ${targetLanguage}`);
    } catch (error) {
      console.error("Translation error:", error);
      toast.error("Failed to translate meeting");
    } finally {
      setIsTranslating(false);
    }
  };

  const formatDate = (date: string | null) => {
    if (!date) return "N/A";
    return format(new Date(date), "PPP");
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return "N/A";
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  const transformSpeakerMetrics = (metrics: any[]): SpeakerMetric[] => {
    if (!Array.isArray(metrics)) return [];

    return metrics.map((metric: any) => ({
      speaker: metric.speaker || "Unknown",
      duration: metric.totalDuration || metric.duration || 0,
      wordCount: metric.turnCount || metric.wordCount || 0,
      percentage: metric.speakingPercentage || metric.percentage || 0,
    }));
  };

  const displayedContent = meeting.translations?.[currentLanguage] || {
    title: meeting.title,
    description: meeting.description,
    transcript: meeting.transcript,
    summary: meeting.summary,
  };

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{displayedContent.title}</h1>
            {displayedContent.description && <p className="text-white/60 mt-1">{displayedContent.description}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <LanguageSelector
            selectedLanguage={currentLanguage}
            onLanguageChange={handleTranslate}
            availableLanguages={availableLanguages}
            isLoading={isTranslating}
          />
          <Button variant="outline" onClick={() => setShowShareDialog(true)}>
            <Share2 className="w-4 h-4 mr-2" />
            Share
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-white/[0.02] backdrop-blur-sm border-white/10">
          <CardContent className="p-4 flex items-center gap-3">
            <Calendar className="w-5 h-5 text-white/40" />
            <div>
              <p className="text-sm text-white/60">Date</p>
              <p className="font-medium">{formatDate(meeting.recorded_at)}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/[0.02] backdrop-blur-sm border-white/10">
          <CardContent className="p-4 flex items-center gap-3">
            <Clock className="w-5 h-5 text-white/40" />
            <div>
              <p className="text-sm text-white/60">Duration</p>
              <p className="font-medium">{formatDuration(meeting.duration)}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/[0.02] backdrop-blur-sm border-white/10">
          <CardContent className="p-4 flex items-center gap-3">
            <Users className="w-5 h-5 text-white/40" />
            <div>
              <p className="text-sm text-white/60">Participants</p>
              <p className="font-medium">{meeting.participants?.length || 0}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/[0.02] backdrop-blur-sm border-white/10">
          <CardContent className="p-4 flex items-center gap-3">
            <FileText className="w-5 h-5 text-white/40" />
            <div>
              <p className="text-sm text-white/60">Status</p>
              <p className="font-medium">
                {isTranscribing ? "Transcribing..." : meeting.transcript ? "Complete" : "Pending"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {meeting.audio_url && (
        <Card className="bg-white/[0.02] backdrop-blur-sm border-white/10">
          <CardContent className="p-6">
            <AudioPlayer audioUrl={meeting.audio_url} />
          </CardContent>
        </Card>
      )}

      <Card className="bg-white/[0.02] backdrop-blur-sm border-white/10">
        <CardHeader>
          <div className="flex gap-2">
            <Button
              variant={activeTab === "transcript" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveTab("transcript")}
            >
              <FileText className="w-4 h-4 mr-2" />
              Transcript
            </Button>
            <Button
              variant={activeTab === "summary" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveTab("summary")}
              disabled={!meeting.summary}
            >
              <Lightbulb className="w-4 h-4 mr-2" />
              Summary
            </Button>
            <Button
              variant={activeTab === "actions" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveTab("actions")}
              disabled={!meeting.action_items}
            >
              <ListChecks className="w-4 h-4 mr-2" />
              Actions
            </Button>
            <Button
              variant={activeTab === "insights" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveTab("insights")}
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              Insights
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {activeTab === "transcript" && (
            <div className="prose prose-invert max-w-none">
              {displayedContent.transcript ? (
                <pre className="whitespace-pre-wrap font-sans text-sm text-white/80">{displayedContent.transcript}</pre>
              ) : (
                <p className="text-white/40 italic">
                  {isTranscribing ? "Transcription in progress..." : "No transcript available"}
                </p>
              )}
            </div>
          )}

          {activeTab === "summary" && (
            <div className="space-y-6">
              {displayedContent.summary ? (
                <>
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Overview</h3>
                    <p className="text-white/80">{displayedContent.summary.overview}</p>
                  </div>

                  {displayedContent.summary.key_points?.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold mb-2">Key Points</h3>
                      <ul className="list-disc list-inside space-y-1">
                        {displayedContent.summary.key_points.map((point: string, index: number) => (
                          <li key={index} className="text-white/80">
                            {point}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {displayedContent.summary.decisions?.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold mb-2">Decisions</h3>
                      <ul className="list-disc list-inside space-y-1">
                        {displayedContent.summary.decisions.map((decision: string, index: number) => (
                          <li key={index} className="text-white/80">
                            {decision}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {displayedContent.summary.next_steps?.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold mb-2">Next Steps</h3>
                      <ul className="list-disc list-inside space-y-1">
                        {displayedContent.summary.next_steps.map((step: string, index: number) => (
                          <li key={index} className="text-white/80">
                            {step}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-white/40 italic">Summary not available</p>
              )}
            </div>
          )}

          {activeTab === "actions" && (
            <div className="space-y-4">
              {meeting.action_items && meeting.action_items.length > 0 ? (
                meeting.action_items.map((item: any) => (
                  <Card key={item.id} className="bg-white/[0.02] border-white/10">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-medium">{item.task}</p>
                          {item.assignee && <p className="text-sm text-white/60 mt-1">Assigned to: {item.assignee}</p>}
                        </div>
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
                    </CardContent>
                  </Card>
                ))
              ) : (
                <p className="text-white/40 italic">No action items available</p>
              )}
            </div>
          )}

          {activeTab === "insights" && (
            <div className="space-y-6">
              {!dbInsights && !insightsLoading && meeting.transcript && (
                <Card className="bg-blue-500/10 border-blue-500/20">
                  <CardContent className="p-6 flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-blue-400">Generate Meeting Insights</h3>
                      <p className="text-sm text-white/60 mt-1">
                        Analyze speaker participation, sentiment, and conversation dynamics
                      </p>
                    </div>
                    <Button
                      onClick={handleGenerateInsights}
                      disabled={isGeneratingInsights}
                      className="bg-blue-500 hover:bg-blue-600"
                    >
                      {isGeneratingInsights ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 mr-2" />
                          Generate Insights
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              )}

              {insightsLoading && (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin" />
                </div>
              )}

              {dbInsights && (
                <div className="space-y-6">
                  {dbInsights.engagement_score !== undefined && (
                    <Card className="bg-white/[0.02] backdrop-blur-sm border-white/10">
                      <CardHeader>
                        <CardTitle className="text-white">Engagement Score</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center gap-4">
                          <div className="text-4xl font-bold text-white">
                            {Math.round(dbInsights.engagement_score)}%
                          </div>
                          <p className="text-white/60">
                            {dbInsights.engagement_score >= 80
                              ? "Excellent"
                              : dbInsights.engagement_score >= 60
                              ? "Good"
                              : dbInsights.engagement_score >= 40
                              ? "Fair"
                              : "Needs Improvement"}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {dbInsights.speaker_metrics &&
                    Array.isArray(dbInsights.speaker_metrics) &&
                    dbInsights.speaker_metrics.length > 0 && (
                      <Card className="bg-white/[0.02] backdrop-blur-sm border-white/10">
                        <CardHeader>
                          <CardTitle className="text-white">Speaker Participation</CardTitle>
                          <CardDescription className="text-white/60">Speaking time distribution</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <SpeakerMetricsChart data={transformSpeakerMetrics(dbInsights.speaker_metrics)} />
                        </CardContent>
                      </Card>
                    )}

                  {dbInsights.sentiment?.timeline &&
                    Array.isArray(dbInsights.sentiment.timeline) &&
                    dbInsights.sentiment.timeline.length > 0 && (
                      <Card className="bg-white/[0.02] backdrop-blur-sm border-white/10">
                        <CardHeader>
                          <CardTitle className="text-white">Sentiment Timeline</CardTitle>
                          <CardDescription className="text-white/60">Emotional tone over time</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <SentimentTimeline data={dbInsights.sentiment.timeline} />
                        </CardContent>
                      </Card>
                    )}

                  {dbInsights.dynamics && (
                    <Card className="bg-white/[0.02] backdrop-blur-sm border-white/10">
                      <CardHeader>
                        <CardTitle className="text-white">Conversation Dynamics</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-white/60 text-sm mb-1">Speaker Balance</p>
                            <p className="text-xl font-bold text-white">
                              {Math.round((dbInsights.dynamics.speakerBalance || 0) * 100)}%
                            </p>
                          </div>
                          <div>
                            <p className="text-white/60 text-sm mb-1">Interruption Rate</p>
                            <p className="text-xl font-bold text-white">
                              {dbInsights.dynamics.interruptionRate || 0}/min
                            </p>
                          </div>
                        </div>
                        {dbInsights.dynamics.averageTurnDuration && (
                          <div className="mt-4">
                            <p className="text-white/60 text-sm mb-1">Average Turn Duration</p>
                            <p className="text-xl font-bold text-white">
                              {Math.round(dbInsights.dynamics.averageTurnDuration)}s
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {dbInsights.key_moments &&
                    Array.isArray(dbInsights.key_moments) &&
                    dbInsights.key_moments.length > 0 && <KeyMoments moments={dbInsights.key_moments} />}
                </div>
              )}

              {!meeting.transcript && (
                <p className="text-white/40 italic text-center py-12">
                  Insights require a transcript. Please wait for transcription to complete.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <ShareDialog
        meetingId={meeting.id}
        meetingTitle={meeting.title}
        isOpen={showShareDialog}
        onClose={() => setShowShareDialog(false)}
      />
    </div>
  );
}
