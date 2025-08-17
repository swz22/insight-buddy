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
  Bot,
  Download,
  Edit2,
  FileDown,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useMeeting } from "@/hooks/use-meetings";
import { AudioPlayer } from "@/components/audio/audio-player";
import { ShareDialog } from "@/components/meetings/share-dialog";
import { EditMeetingDialog } from "@/components/meetings/edit-meeting-dialog";
import { ExportDialog } from "@/components/meetings/export-dialog";
import { LanguageSelector } from "@/components/ui/language-selector";
import { useTranslation } from "@/hooks/use-translation";
import { useInsights } from "@/hooks/use-insights";
import { useMeetingProcessing } from "@/hooks/use-meeting-processing";
import { useTranscriptionStatus } from "@/hooks/use-transcription-status";
import { useMeetingRealtime } from "@/hooks/use-meeting-realtime";
import { SpeakerMetricsChart, type SpeakerMetric } from "@/components/insights/speaker-metrics-chart";
import { SentimentTimeline } from "@/components/insights/sentiment-timeline";
import { KeyMoments } from "@/components/insights/key-moments";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import type { SpeakerMetrics } from "@/types/meeting-insights";
import { useAuth } from "@/hooks/use-auth";

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
  const { user } = useAuth();
  const meetingId = params.id as string;

  const {
    data: meeting,
    isLoading: meetingLoading,
    error: meetingError,
    refetch: refetchMeeting,
  } = useMeeting(meetingId);
  const { isProcessing } = useMeetingProcessing({ meeting, enabled: !!meeting });
  const { insights, isLoading: insightsLoading } = useInsights({ meetingId, enabled: !!meeting });
  const { isTranscribing } = useTranscriptionStatus({
    meeting,
    enabled: !!meeting && !meeting.transcript && !!meeting.transcript_id,
    pollingInterval: 30000,
    onTranscriptionComplete: () => {
      refetchMeeting();
    },
  });

  useMeetingRealtime({
    meetingId,
    enabled: !!meeting,
    onUpdate: (updatedMeeting) => {
      refetchMeeting();
    },
  });

  const dbInsights = insights as DatabaseInsights | null;

  const [activeTab, setActiveTab] = useState<"transcript" | "summary" | "actions" | "insights">("transcript");
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false);
  const [isRegeneratingTranscript, setIsRegeneratingTranscript] = useState(false);
  const [isRegeneratingSummary, setIsRegeneratingSummary] = useState(false);
  const [isRegeneratingActions, setIsRegeneratingActions] = useState(false);
  const [isRegeneratingInsights, setIsRegeneratingInsights] = useState(false);

  const { selectedLanguage, translate, availableLanguages, isTranslating } = useTranslation({
    meetingId,
    enabled: !!meeting && !!meeting.transcript,
  });

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
    try {
      await translate(targetLanguage);
      toast.success("Translation completed!");
    } catch (error) {
      console.error("Translation error:", error);
      toast.error("Failed to translate meeting");
    }
  };

  const handleRegenerateTranscript = async () => {
    if (!meeting.audio_url) {
      toast.error("Audio file required for transcription");
      return;
    }

    setIsRegeneratingTranscript(true);
    try {
      const response = await fetch(`/api/meetings/${meetingId}/transcribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ regenerate: true }),
      });

      if (!response.ok) {
        throw new Error("Failed to regenerate transcript");
      }

      toast.success("Transcript regeneration started!");
      window.location.reload();
    } catch (error) {
      console.error("Transcript regeneration error:", error);
      toast.error("Failed to regenerate transcript");
    } finally {
      setIsRegeneratingTranscript(false);
    }
  };

  const handleRegenerateSummary = async () => {
    if (!meeting.transcript) {
      toast.error("Transcript required for summary generation");
      return;
    }

    setIsRegeneratingSummary(true);
    try {
      const response = await fetch(`/api/meetings/${meetingId}/summarize`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to regenerate summary");
      }

      toast.success("Summary regenerated successfully!");
      window.location.reload();
    } catch (error) {
      console.error("Summary regeneration error:", error);
      toast.error("Failed to regenerate summary");
    } finally {
      setIsRegeneratingSummary(false);
    }
  };

  const handleRegenerateActions = async () => {
    if (!meeting.summary) {
      toast.error("Summary required for action items generation");
      return;
    }

    setIsRegeneratingActions(true);
    try {
      const response = await fetch(`/api/meetings/${meetingId}/action-items`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to regenerate action items");
      }

      toast.success("Action items regenerated successfully!");
      window.location.reload();
    } catch (error) {
      console.error("Action items regeneration error:", error);
      toast.error("Failed to regenerate action items");
    } finally {
      setIsRegeneratingActions(false);
    }
  };

  const handleRegenerateInsights = async () => {
    if (!meeting.transcript) {
      toast.error("Transcript required for insights generation");
      return;
    }

    setIsRegeneratingInsights(true);
    try {
      const response = await fetch(`/api/meetings/${meetingId}/insights`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to regenerate insights");
      }

      toast.success("Insights regenerated successfully!");
      window.location.reload();
    } catch (error) {
      console.error("Insights regeneration error:", error);
      toast.error("Failed to regenerate insights");
    } finally {
      setIsRegeneratingInsights(false);
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

  const displayedContent = meeting.translations?.[selectedLanguage] || {
    title: meeting.title,
    description: meeting.description,
    transcript: meeting.transcript,
    summary: meeting.summary,
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="mb-8">
        <Link
          href="/dashboard"
          className="inline-flex items-center text-white/60 hover:text-white/90 transition-colors group mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
          Back to meetings
        </Link>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold font-display mb-2">{displayedContent.title}</h1>
            {displayedContent.description && <p className="text-white/60">{displayedContent.description}</p>}
          </div>
          <div className="flex gap-2">
            <Button
              variant="glass"
              size="sm"
              onClick={() => setShowShareDialog(true)}
              className="hover:border-cyan-400/60"
            >
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </Button>
            <Button
              variant="glass"
              size="sm"
              onClick={() => setShowEditDialog(true)}
              className="hover:border-purple-400/60"
            >
              <Edit2 className="w-4 h-4 mr-2" />
              Edit
            </Button>
            <Button
              variant="glass"
              size="sm"
              onClick={() => setShowExportDialog(true)}
              className="hover:border-green-400/60"
            >
              <FileDown className="w-4 h-4 mr-2" />
              Export
            </Button>
            {meeting.audio_url && (
              <Button variant="glass" size="sm" asChild className="hover:border-cyan-400/60">
                <a href={meeting.audio_url} download>
                  <Download className="w-4 h-4 mr-2" />
                  Audio
                </a>
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card className="bg-white/[0.02] backdrop-blur-sm border-white/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-purple-400" />
              <div>
                <p className="text-sm text-white/60">Recorded</p>
                <p className="font-medium">{formatDate(meeting.recorded_at)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/[0.02] backdrop-blur-sm border-white/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-cyan-400" />
              <div>
                <p className="text-sm text-white/60">Duration</p>
                <p className="font-medium">{formatDuration(meeting.duration)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/[0.02] backdrop-blur-sm border-white/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-blue-400" />
              <div>
                <p className="text-sm text-white/60">Status</p>
                <p className="font-medium">
                  {isTranscribing ? "Transcribing..." : meeting.transcript ? "Complete" : "Pending"}
                </p>
              </div>
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
              variant={activeTab === "transcript" ? "glow" : "glass"}
              size="sm"
              onClick={() => setActiveTab("transcript")}
              className={cn("transition-all", activeTab === "transcript" ? "shadow-lg" : "hover:border-white/30")}
            >
              <FileText className="w-4 h-4 mr-2" />
              Transcript
            </Button>
            <Button
              variant={activeTab === "summary" ? "glow" : "glass"}
              size="sm"
              onClick={() => setActiveTab("summary")}
              className={cn("transition-all", activeTab === "summary" ? "shadow-lg" : "hover:border-white/30")}
            >
              <Lightbulb className="w-4 h-4 mr-2" />
              Summary
            </Button>
            <Button
              variant={activeTab === "actions" ? "glow" : "glass"}
              size="sm"
              onClick={() => setActiveTab("actions")}
              className={cn("transition-all", activeTab === "actions" ? "shadow-lg" : "hover:border-white/30")}
            >
              <ListChecks className="w-4 h-4 mr-2" />
              Action Items
            </Button>
            <Button
              variant={activeTab === "insights" ? "glow" : "glass"}
              size="sm"
              onClick={() => setActiveTab("insights")}
              className={cn("transition-all", activeTab === "insights" ? "shadow-lg" : "hover:border-white/30")}
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              Insights
            </Button>

            {meeting.transcript && availableLanguages.length > 0 && (
              <div className="ml-auto">
                <LanguageSelector
                  selectedLanguage={selectedLanguage}
                  availableLanguages={availableLanguages}
                  onLanguageChange={handleTranslate}
                  isLoading={isTranslating}
                />
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {activeTab === "transcript" && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Transcript</h3>
                {meeting.transcript && !isRegeneratingTranscript && !isTranscribing && (
                  <Button
                    variant="glass"
                    size="sm"
                    onClick={handleRegenerateTranscript}
                    disabled={isRegeneratingTranscript}
                    className="hover:border-green-400/60"
                  >
                    {isRegeneratingTranscript ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Regenerating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Regenerate
                      </>
                    )}
                  </Button>
                )}
              </div>

              {isTranscribing ? (
                <div className="text-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-purple-400" />
                  <p className="text-white/60">Transcription in progress...</p>
                  <p className="text-sm text-white/40 mt-2">This may take a few minutes</p>
                </div>
              ) : meeting.transcript ? (
                <div className="prose prose-invert max-w-none">
                  <p className="whitespace-pre-wrap text-white/80">{displayedContent.transcript}</p>
                </div>
              ) : (
                <div className="text-center py-12">
                  <FileText className="w-12 h-12 text-white/20 mx-auto mb-4" />
                  <p className="text-white/50 italic">
                    {meeting.audio_url
                      ? "Transcript will be generated automatically"
                      : "No audio file available for transcription"}
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === "summary" && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Summary</h3>
                {meeting.transcript && !isRegeneratingSummary && (
                  <Button
                    variant="glass"
                    size="sm"
                    onClick={handleRegenerateSummary}
                    disabled={isRegeneratingSummary}
                    className="hover:border-green-400/60"
                  >
                    {isRegeneratingSummary ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Regenerating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Regenerate
                      </>
                    )}
                  </Button>
                )}
              </div>

              {meeting.summary ? (
                <div className="space-y-6">
                  <div>
                    <h4 className="text-sm font-medium text-white/70 mb-2">Overview</h4>
                    <p className="text-white/80">{displayedContent.summary?.overview || meeting.summary.overview}</p>
                  </div>

                  {(displayedContent.summary?.key_points?.length ?? 0) > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-white/70 mb-2">Key Points</h4>
                      <ul className="space-y-2">
                        {(displayedContent.summary?.key_points || []).map((point: string, i: number) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-purple-400 mt-0.5">•</span>
                            <span className="text-white/80">{point}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {(displayedContent.summary?.decisions?.length ?? 0) > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-white/70 mb-2">Decisions</h4>
                      <ul className="space-y-2">
                        {(displayedContent.summary?.decisions || []).map((decision: string, i: number) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-cyan-400 mt-0.5">→</span>
                            <span className="text-white/80">{decision}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {(displayedContent.summary?.next_steps?.length ?? 0) > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-white/70 mb-2">Next Steps</h4>
                      <ul className="space-y-2">
                        {(displayedContent.summary?.next_steps || []).map((step: string, i: number) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-green-400 mt-0.5">✓</span>
                            <span className="text-white/80">{step}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Lightbulb className="w-12 h-12 text-white/20 mx-auto mb-4" />
                  <p className="text-white/50 italic">
                    {meeting.transcript
                      ? "Summary will be generated after transcription"
                      : "Summary requires a transcript"}
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === "actions" && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Action Items</h3>
                {meeting.summary && !isRegeneratingActions && (
                  <Button
                    variant="glass"
                    size="sm"
                    onClick={handleRegenerateActions}
                    disabled={isRegeneratingActions}
                    className="hover:border-green-400/60"
                  >
                    {isRegeneratingActions ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Regenerating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Regenerate
                      </>
                    )}
                  </Button>
                )}
              </div>

              {meeting.action_items && meeting.action_items.length > 0 ? (
                meeting.action_items.map((item: any, i: number) => (
                  <div
                    key={item.id || i}
                    className={cn(
                      "p-4 rounded-lg border transition-all",
                      item.completed
                        ? "bg-white/[0.02] border-white/10 opacity-60"
                        : "bg-white/[0.03] border-white/20 hover:border-white/30"
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-2">
                        <p
                          className={cn("font-medium", item.completed ? "text-white/50 line-through" : "text-white/90")}
                        >
                          {item.task}
                        </p>
                        <div className="flex gap-4 text-sm">
                          {item.assignee && (
                            <div className="flex items-center gap-1.5 text-white/50">
                              <Users className="w-3.5 h-3.5" />
                              <span>{item.assignee}</span>
                            </div>
                          )}
                          {item.due_date && (
                            <div className="flex items-center gap-1.5 text-white/50">
                              <Calendar className="w-3.5 h-3.5" />
                              <span>{format(new Date(item.due_date), "PPP")}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <span
                        className={cn(
                          "px-2.5 py-1 text-xs rounded-full font-medium",
                          item.priority === "high"
                            ? "bg-red-500/20 text-red-400 border border-red-500/30"
                            : item.priority === "medium"
                            ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"
                            : "bg-green-500/20 text-green-400 border border-green-500/30"
                        )}
                      >
                        {item.priority}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12">
                  <ListChecks className="w-12 h-12 text-white/20 mx-auto mb-4" />
                  <p className="text-white/50 italic">
                    Action items will be extracted after AI processing is complete.
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === "insights" && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Meeting Insights</h3>
                {meeting.transcript && !isGeneratingInsights && (
                  <Button
                    variant="glass"
                    size="sm"
                    onClick={dbInsights ? handleRegenerateInsights : handleGenerateInsights}
                    disabled={isGeneratingInsights || isRegeneratingInsights}
                    className="hover:border-green-400/60"
                  >
                    {isGeneratingInsights || isRegeneratingInsights ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Regenerating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Regenerate Insights
                      </>
                    )}
                  </Button>
                )}
              </div>

              {dbInsights ? (
                <>
                  {dbInsights.speaker_metrics && (
                    <SpeakerMetricsChart metrics={transformSpeakerMetrics(dbInsights.speaker_metrics)} />
                  )}
                  {dbInsights.sentiment && dbInsights.sentiment.timeline && (
                    <SentimentTimeline data={dbInsights.sentiment.timeline} />
                  )}
                  {dbInsights.key_moments && <KeyMoments moments={dbInsights.key_moments} />}
                </>
              ) : (
                <div className="text-center py-12">
                  <BarChart3 className="w-12 h-12 text-white/20 mx-auto mb-4" />
                  <p className="text-white/50 italic mb-4">Generate insights to see detailed analytics</p>
                  {meeting.transcript && !isGeneratingInsights && (
                    <Button variant="glow" onClick={handleGenerateInsights} className="shadow-lg">
                      <Bot className="w-4 h-4 mr-2" />
                      Generate Insights
                    </Button>
                  )}
                </div>
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

      <EditMeetingDialog
        meeting={meeting}
        isOpen={showEditDialog}
        onClose={() => setShowEditDialog(false)}
        onUpdate={(updatedMeeting) => window.location.reload()}
      />

      <ExportDialog
        meeting={meeting}
        userEmail={user?.email || "user@example.com"}
        insights={dbInsights}
        isOpen={showExportDialog}
        onClose={() => setShowExportDialog(false)}
      />
    </div>
  );
}
