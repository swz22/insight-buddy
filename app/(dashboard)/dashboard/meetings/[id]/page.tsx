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
  Download,
  Edit2,
  FileDown,
  Bot,
  Sparkles,
  CheckCircle2,
  Circle,
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
import { AIGenerateButton } from "@/components/ui/ai-generate-button";
import { GenerationStatus } from "@/components/ui/generation-status";
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
import { motion } from "framer-motion";

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
  const [isRegeneratingInsights, setIsRegeneratingInsights] = useState(false);
  const [isBatchGenerating, setIsBatchGenerating] = useState(false);
  const [batchGenerationStep, setBatchGenerationStep] = useState<"summary" | "insights" | null>(null);

  const { selectedLanguage, translate, availableLanguages, isTranslating } = useTranslation({
    meetingId,
    enabled: !!meeting && !!meeting.transcript,
  });

  const getGenerationSteps = () => {
    const steps = [];

    if (meeting) {
      steps.push({
        id: "upload",
        label: "Audio/Video uploaded",
        status: "completed" as const,
        timestamp: format(new Date(meeting.created_at), "h:mm a"),
      });

      if (meeting.transcript_id || meeting.transcript) {
        steps.push({
          id: "transcript",
          label: "Transcript",
          status: meeting.transcript ? ("completed" as const) : ("processing" as const),
          timestamp: meeting.transcript ? format(new Date(meeting.updated_at), "h:mm a") : undefined,
        });
      }

      if (meeting.summary) {
        steps.push({
          id: "summary",
          label: "Summary & Action Items",
          status: "completed" as const,
          timestamp: format(new Date(meeting.updated_at), "h:mm a"),
        });
      } else if (meeting.transcript && isRegeneratingSummary) {
        steps.push({
          id: "summary",
          label: "Summary & Action Items",
          status: "processing" as const,
        });
      }

      if (dbInsights) {
        steps.push({
          id: "insights",
          label: "Analytics & Insights",
          status: "completed" as const,
          timestamp: format(new Date(dbInsights.created_at), "h:mm a"),
        });
      } else if (meeting.transcript && (isGeneratingInsights || isRegeneratingInsights)) {
        steps.push({
          id: "insights",
          label: "Analytics & Insights",
          status: "processing" as const,
        });
      }
    }

    return steps;
  };

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

  const handleGenerateAll = async () => {
    if (!meeting.transcript) {
      toast.error("Transcript required for batch generation");
      return;
    }

    setIsBatchGenerating(true);
    let summarySuccess = false;

    try {
      if (!meeting.summary) {
        setBatchGenerationStep("summary");
        const summaryResponse = await fetch(`/api/meetings/${meetingId}/summarize`, {
          method: "POST",
        });

        if (!summaryResponse.ok) {
          throw new Error("Failed to generate summary");
        }
        summarySuccess = true;
        toast.success("Summary and action items generated!");
      }

      if (!dbInsights) {
        setBatchGenerationStep("insights");
        const insightsResponse = await fetch(`/api/meetings/${meetingId}/insights`, {
          method: "POST",
        });

        if (!insightsResponse.ok) {
          throw new Error("Failed to generate insights");
        }
        toast.success("Insights generated!");
      }

      toast.success("All content generated successfully!");
      window.location.reload();
    } catch (error) {
      console.error("Batch generation error:", error);
      if (!summarySuccess) {
        toast.error("Failed to generate summary. Please try again.");
      } else {
        toast.error("Summary generated, but insights generation failed.");
      }
    } finally {
      setIsBatchGenerating(false);
      setBatchGenerationStep(null);
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

  const handleGenerateSummary = async () => {
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
        throw new Error("Failed to generate summary");
      }

      toast.success("Summary and action items generated successfully!");
      window.location.reload();
    } catch (error) {
      console.error("Summary generation error:", error);
      toast.error("Failed to generate summary");
    } finally {
      setIsRegeneratingSummary(false);
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

      toast.success("Summary and action items regenerated successfully!");
      window.location.reload();
    } catch (error) {
      console.error("Summary regeneration error:", error);
      toast.error("Failed to regenerate summary");
    } finally {
      setIsRegeneratingSummary(false);
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

  const generationSteps = getGenerationSteps();

  return (
    <div className="container mx-auto px-4 py-6 animate-fade-in">
      {isBatchGenerating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-black/90 border border-white/10 rounded-xl p-8 max-w-md w-full mx-4"
          >
            <h3 className="text-xl font-semibold mb-6 text-white">Generating Meeting Content</h3>

            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Loader2 className="w-5 h-5 animate-spin text-purple-400" />
                <span className="text-white/80">
                  {batchGenerationStep === "summary"
                    ? "Analyzing meeting and extracting action items..."
                    : "Generating detailed analytics and insights..."}
                </span>
              </div>

              <div className="space-y-3 mt-6">
                <div className="flex items-center gap-3">
                  {!meeting.summary ? (
                    batchGenerationStep === "summary" ? (
                      <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
                    ) : (
                      <Circle className="w-4 h-4 text-white/20" />
                    )
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-green-400" />
                  )}
                  <span
                    className={cn(
                      "text-sm",
                      meeting.summary
                        ? "text-green-400"
                        : batchGenerationStep === "summary"
                        ? "text-cyan-400"
                        : "text-white/40"
                    )}
                  >
                    Summary & Action Items
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  {!dbInsights ? (
                    batchGenerationStep === "insights" ? (
                      <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
                    ) : (
                      <Circle className="w-4 h-4 text-white/20" />
                    )
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-green-400" />
                  )}
                  <span
                    className={cn(
                      "text-sm",
                      dbInsights
                        ? "text-green-400"
                        : batchGenerationStep === "insights"
                        ? "text-cyan-400"
                        : "text-white/40"
                    )}
                  >
                    Analytics & Insights
                  </span>
                </div>
              </div>

              <p className="text-xs text-white/50 mt-6">This may take a minute...</p>
            </div>
          </motion.div>
        </div>
      )}

      <Link
        href="/dashboard"
        className="inline-flex items-center text-white/60 hover:text-white/90 transition-colors group mb-6"
      >
        <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
        Back to meetings
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3">
          <Card className="bg-white/[0.02] border-white/10">
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div className="flex-1">
                  <CardTitle className="text-2xl sm:text-3xl gradient-text mb-2">{displayedContent.title}</CardTitle>
                  {displayedContent.description && (
                    <CardDescription className="text-base text-white/60">
                      {displayedContent.description}
                    </CardDescription>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {meeting.transcript && (!meeting.summary || !dbInsights) && (
                    <Button
                      variant="glow"
                      size="sm"
                      onClick={handleGenerateAll}
                      disabled={
                        isBatchGenerating || isRegeneratingSummary || isGeneratingInsights || isRegeneratingInsights
                      }
                      className="shadow-lg"
                    >
                      <Sparkles className="w-4 h-4 mr-2" />
                      Generate All
                    </Button>
                  )}
                  <Button variant="glass" size="sm" onClick={() => setShowShareDialog(true)}>
                    <Share2 className="w-4 h-4" />
                  </Button>
                  <Button variant="glass" size="sm" onClick={() => setShowEditDialog(true)}>
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button variant="glass" size="sm" onClick={() => setShowExportDialog(true)}>
                    <FileDown className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="flex flex-wrap gap-4 text-sm text-white/60 mt-4">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>{formatDate(meeting.recorded_at)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span>{formatDuration(meeting.duration)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  <span>{meeting.participants?.length || 0}</span>
                </div>
              </div>
            </CardHeader>

            <CardContent>
              {meeting.audio_url && (
                <div className="mb-6">
                  <AudioPlayer audioUrl={meeting.audio_url} />
                </div>
              )}

              {meeting.transcript && availableLanguages.length > 0 && (
                <div className="flex justify-end mb-4">
                  <LanguageSelector
                    selectedLanguage={selectedLanguage}
                    availableLanguages={availableLanguages}
                    onLanguageChange={handleTranslate}
                    isLoading={isTranslating}
                  />
                </div>
              )}

              <div className="flex flex-wrap gap-2 mb-6 border-b border-white/10">
                {[
                  { id: "transcript" as const, label: "Transcript", icon: FileText },
                  { id: "summary" as const, label: "Summary", icon: Lightbulb },
                  { id: "actions" as const, label: "Action Items", icon: ListChecks },
                  { id: "insights" as const, label: "Insights", icon: BarChart3 },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 text-sm font-medium transition-all",
                      "border-b-2 -mb-[2px]",
                      activeTab === tab.id
                        ? "text-white border-purple-400"
                        : "text-white/60 border-transparent hover:text-white/80"
                    )}
                  >
                    <tab.icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                ))}
              </div>

              {activeTab === "transcript" && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold">Transcript</h3>
                    {meeting.transcript && !isRegeneratingTranscript && (
                      <AIGenerateButton
                        hasData={true}
                        isLoading={isRegeneratingTranscript}
                        onGenerate={() => {}}
                        onRegenerate={handleRegenerateTranscript}
                        feature="transcript"
                        disabled={isRegeneratingTranscript}
                      />
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
                      <AIGenerateButton
                        hasData={!!meeting.summary}
                        isLoading={isRegeneratingSummary}
                        onGenerate={handleGenerateSummary}
                        onRegenerate={handleRegenerateSummary}
                        feature="summary"
                        disabled={isRegeneratingSummary}
                      />
                    )}
                  </div>

                  {meeting.summary ? (
                    <div className="space-y-6">
                      <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                        <p className="text-sm text-purple-300 flex items-center gap-2">
                          <Sparkles className="w-4 h-4" />
                          Action items are automatically extracted with the summary
                        </p>
                      </div>

                      <div>
                        <h4 className="text-sm font-medium text-white/70 mb-2">Overview</h4>
                        <p className="text-white/80">
                          {displayedContent.summary?.overview || meeting.summary.overview}
                        </p>
                      </div>

                      {(displayedContent.summary?.key_points?.length ?? meeting.summary.key_points?.length) > 0 && (
                        <div>
                          <h4 className="text-sm font-medium text-white/70 mb-2">Key Points</h4>
                          <ul className="space-y-2">
                            {(displayedContent.summary?.key_points || meeting.summary.key_points).map(
                              (point: string, i: number) => (
                                <li key={i} className="flex items-start gap-2">
                                  <span className="text-purple-400 mt-1">•</span>
                                  <span className="text-white/80">{point}</span>
                                </li>
                              )
                            )}
                          </ul>
                        </div>
                      )}

                      {(displayedContent.summary?.decisions?.length ?? meeting.summary.decisions?.length) > 0 && (
                        <div>
                          <h4 className="text-sm font-medium text-white/70 mb-2">Decisions</h4>
                          <ul className="space-y-2">
                            {(displayedContent.summary?.decisions || meeting.summary.decisions).map(
                              (decision: string, i: number) => (
                                <li key={i} className="flex items-start gap-2">
                                  <span className="text-green-400 mt-1">✓</span>
                                  <span className="text-white/80">{decision}</span>
                                </li>
                              )
                            )}
                          </ul>
                        </div>
                      )}

                      {(displayedContent.summary?.next_steps?.length ?? meeting.summary.next_steps?.length) > 0 && (
                        <div>
                          <h4 className="text-sm font-medium text-white/70 mb-2">Next Steps</h4>
                          <ul className="space-y-2">
                            {(displayedContent.summary?.next_steps || meeting.summary.next_steps).map(
                              (step: string, i: number) => (
                                <li key={i} className="flex items-start gap-2">
                                  <span className="text-blue-400 mt-1">→</span>
                                  <span className="text-white/80">{step}</span>
                                </li>
                              )
                            )}
                          </ul>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <Lightbulb className="w-12 h-12 text-white/20 mx-auto mb-4" />
                      <p className="text-white/50 italic">Generate a summary to see key takeaways from this meeting</p>
                      {meeting.transcript && !isRegeneratingSummary && (
                        <Button
                          variant="glow"
                          onClick={handleGenerateSummary}
                          disabled={isRegeneratingSummary}
                          className="mt-4 shadow-lg"
                        >
                          <Bot className="w-4 h-4 mr-2" />
                          Generate Summary
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {activeTab === "actions" && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold">Action Items</h3>
                  </div>

                  {meeting.action_items && meeting.action_items.length > 0 ? (
                    meeting.action_items.map((item: any, i: number) => (
                      <div
                        key={item.id || i}
                        className={cn(
                          "p-4 rounded-lg border transition-all",
                          item.completed
                            ? "bg-green-500/5 border-green-500/20"
                            : "bg-white/[0.02] border-white/10 hover:bg-white/[0.04]"
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={cn(
                              "w-5 h-5 rounded-full border-2 mt-0.5 flex-shrink-0",
                              item.completed ? "bg-green-500 border-green-500" : "border-white/30"
                            )}
                          />
                          <div className="flex-1">
                            <p className={cn("font-medium", item.completed && "line-through opacity-60")}>
                              {item.task}
                            </p>
                            <div className="flex flex-wrap gap-4 text-sm text-white/60 mt-2">
                              {item.assignee && (
                                <span className="flex items-center gap-1">
                                  <Users className="w-3 h-3" />
                                  {item.assignee}
                                </span>
                              )}
                              {item.due_date && (
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {formatDate(item.due_date)}
                                </span>
                              )}
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
                                {item.priority || "low"} priority
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-12">
                      <ListChecks className="w-12 h-12 text-white/20 mx-auto mb-4" />
                      <p className="text-white/50 italic">
                        {meeting.summary
                          ? "No action items found in this meeting"
                          : "Action items are automatically extracted when you generate the summary"}
                      </p>
                      {meeting.transcript && !meeting.summary && (
                        <Button variant="glow" onClick={handleGenerateSummary} className="mt-4 shadow-lg">
                          <Bot className="w-4 h-4 mr-2" />
                          Generate Summary & Actions
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {activeTab === "insights" && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold">Meeting Insights</h3>
                    {meeting.transcript && !isGeneratingInsights && !isRegeneratingInsights && (
                      <AIGenerateButton
                        hasData={!!dbInsights}
                        isLoading={isGeneratingInsights || isRegeneratingInsights}
                        onGenerate={handleGenerateInsights}
                        onRegenerate={handleRegenerateInsights}
                        feature="insights"
                        disabled={isGeneratingInsights || isRegeneratingInsights}
                      />
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
                      <p className="text-white/50 italic mb-4">
                        Generate insights to see detailed analytics and metrics
                      </p>
                      {meeting.transcript && !isGeneratingInsights && (
                        <Button
                          variant="glow"
                          onClick={handleGenerateInsights}
                          disabled={isGeneratingInsights}
                          className="shadow-lg"
                        >
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
        </div>

        <div className="lg:col-span-1">
          {generationSteps.length > 0 && <GenerationStatus steps={generationSteps} className="sticky top-4" />}
        </div>
      </div>

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
