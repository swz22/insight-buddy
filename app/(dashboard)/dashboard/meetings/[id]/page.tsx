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
import { EngagementScore } from "@/components/insights/engagement-score";
import { ConversationDynamics } from "@/components/insights/conversation-dynamics";
import { cn } from "@/lib/utils";

const formatDate = (date: Date): string => {
  const options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  };
  return new Intl.DateTimeFormat("en-US", options).format(date);
};

const formatDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  } else {
    return `${secs}s`;
  }
};

const transformSpeakerMetrics = (speakerMetrics: any[]): SpeakerMetric[] => {
  return speakerMetrics.map((metric) => ({
    speaker: metric.speaker,
    duration: Math.round(metric.totalDuration),
    wordCount: Math.round((metric.totalDuration / 60) * 150),
    percentage: Math.round(metric.speakingPercentage),
  }));
};

export default function MeetingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const meetingId = params.id as string;
  const { data: meeting, isLoading, error } = useMeeting(meetingId);
  const [activeTab, setActiveTab] = useState<"transcript" | "summary" | "actions" | "insights">("transcript");
  const [showShareDialog, setShowShareDialog] = useState(false);

  const { selectedLanguage, setSelectedLanguage, translate, isTranslating, currentTranslation, availableLanguages } =
    useTranslation({
      meetingId,
      enabled: !!meeting,
    });

  const {
    insights,
    isLoading: isLoadingInsights,
    isGenerating,
    generateInsights,
    hasInsights,
  } = useInsights({ meetingId, enabled: !!meeting && activeTab === "insights" });

  const { isProcessing } = useMeetingProcessing({ meeting, enabled: !!meeting });
  const { isTranscribing } = useTranscriptionStatus({ meeting, enabled: !!meeting });

  useEffect(() => {
    if (error) {
      console.error("Error loading meeting:", error);
    }
  }, [error]);

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-400 mb-4">Failed to load meeting</p>
          <Button onClick={() => router.push("/dashboard")} variant="outline">
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  if (isLoading || !meeting) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-white/40" />
      </div>
    );
  }

  const recordedDate = meeting.recorded_at ? new Date(meeting.recorded_at) : new Date(meeting.created_at);

  const tabs = [
    { id: "transcript" as const, label: "Transcript", icon: FileText },
    { id: "summary" as const, label: "Summary", icon: Lightbulb },
    { id: "actions" as const, label: "Action Items", icon: ListChecks },
    { id: "insights" as const, label: "Insights", icon: BarChart3 },
  ];

  const displayedTranscript = currentTranslation?.transcript || meeting.transcript;
  const displayedSummary = currentTranslation?.summary || meeting.summary;
  const displayedActionItems = meeting.action_items; // Action items are not translated

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <Link
          href="/dashboard"
          className="inline-flex items-center text-white/60 hover:text-white/90 transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
          Back to meetings
        </Link>
        <Button
          variant="outline"
          onClick={() => setShowShareDialog(true)}
          className="gap-2 bg-white/5 border-white/10 hover:bg-white/10"
        >
          <Share2 className="w-4 h-4" />
          Share
        </Button>
      </div>

      <div className="space-y-4">
        <div>
          <h1 className="text-3xl font-bold text-white font-display">{meeting.title}</h1>
          {meeting.description && <p className="text-white/60 mt-2">{meeting.description}</p>}
        </div>

        <div className="flex flex-wrap gap-4 text-sm text-white/60">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            {formatDate(recordedDate)}
          </div>
          {meeting.duration && (
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              {formatDuration(meeting.duration)}
            </div>
          )}
          {meeting.participants && meeting.participants.length > 0 && (
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              {meeting.participants.join(", ")}
            </div>
          )}
        </div>

        {meeting.audio_url && (
          <Card className="bg-white/[0.02] backdrop-blur-sm border-white/10">
            <CardContent className="p-6">
              <AudioPlayer url={meeting.audio_url} />
            </CardContent>
          </Card>
        )}
      </div>

      <Card className="bg-white/[0.02] backdrop-blur-sm border-white/10">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg transition-all",
                    activeTab === tab.id
                      ? "bg-white/10 text-white"
                      : "text-white/60 hover:text-white/90 hover:bg-white/5"
                  )}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
            </div>
            {(activeTab === "transcript" || activeTab === "summary" || activeTab === "actions") &&
              meeting.transcript &&
              availableLanguages.length > 0 && (
                <LanguageSelector
                  value={selectedLanguage}
                  onChange={setSelectedLanguage}
                  availableTranslations={availableLanguages}
                  onTranslate={() => translate(selectedLanguage)}
                  isTranslating={isTranslating}
                />
              )}
          </div>
        </CardHeader>
        <CardContent>
          {(isProcessing || isTranscribing) && (
            <div className="mb-4 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                <p className="text-sm text-blue-400">
                  {isTranscribing ? "Transcribing audio..." : "Processing meeting data..."}
                </p>
              </div>
            </div>
          )}

          {activeTab === "transcript" && (
            <div className="prose prose-invert max-w-none">
              {displayedTranscript ? (
                <div className="whitespace-pre-wrap text-white/80 leading-relaxed">{displayedTranscript}</div>
              ) : (
                <p className="text-white/40 italic">
                  {meeting.audio_url
                    ? "Transcript will be available after processing is complete."
                    : "No audio file uploaded for this meeting."}
                </p>
              )}
            </div>
          )}

          {activeTab === "summary" && (
            <div className="space-y-6">
              {displayedSummary ? (
                <>
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-3">Overview</h3>
                    <p className="text-white/80 leading-relaxed">{displayedSummary.overview}</p>
                  </div>
                  {displayedSummary.key_points && displayedSummary.key_points.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-3">Key Points</h3>
                      <ul className="space-y-2">
                        {displayedSummary.key_points.map((point: string, index: number) => (
                          <li key={index} className="flex items-start gap-2">
                            <span className="text-purple-400 mt-1">•</span>
                            <span className="text-white/80">{point}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {displayedSummary.decisions && displayedSummary.decisions.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-3">Decisions Made</h3>
                      <ul className="space-y-2">
                        {displayedSummary.decisions.map((decision: string, index: number) => (
                          <li key={index} className="flex items-start gap-2">
                            <span className="text-green-400 mt-1">✓</span>
                            <span className="text-white/80">{decision}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {displayedSummary.next_steps && displayedSummary.next_steps.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-3">Next Steps</h3>
                      <ul className="space-y-2">
                        {displayedSummary.next_steps.map((step: string, index: number) => (
                          <li key={index} className="flex items-start gap-2">
                            <span className="text-blue-400 mt-1">→</span>
                            <span className="text-white/80">{step}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-white/40 italic">
                  {meeting.transcript
                    ? "Summary will be generated after transcript is complete."
                    : "Summary requires a transcript. Please wait for transcription to complete."}
                </p>
              )}
            </div>
          )}

          {activeTab === "actions" && (
            <div className="space-y-4">
              {displayedActionItems && displayedActionItems.length > 0 ? (
                displayedActionItems.map((item: any) => (
                  <div
                    key={item.id}
                    className="p-4 rounded-lg bg-white/[0.02] border border-white/10 hover:bg-white/[0.04] transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <p className="text-white/90">{item.task}</p>
                        <div className="flex items-center gap-4 mt-2 text-sm text-white/60">
                          {item.assignee && (
                            <span className="flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              {item.assignee}
                            </span>
                          )}
                          {item.due_date && (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {new Date(item.due_date).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                      <div
                        className={cn(
                          "px-2 py-1 rounded text-xs font-medium",
                          item.priority === "high" && "bg-red-500/20 text-red-400",
                          item.priority === "medium" && "bg-yellow-500/20 text-yellow-400",
                          item.priority === "low" && "bg-green-500/20 text-green-400"
                        )}
                      >
                        {item.priority}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-white/40 italic">
                  {meeting.summary
                    ? "No action items identified in this meeting."
                    : "Action items will be extracted after summary is generated."}
                </p>
              )}
            </div>
          )}

          {activeTab === "insights" && (
            <div className="space-y-6">
              {!hasInsights && !isLoadingInsights && meeting.transcript && (
                <div className="text-center py-8">
                  <BarChart3 className="w-12 h-12 text-white/20 mx-auto mb-4" />
                  <p className="text-white/50 mb-4">Advanced meeting insights are available</p>
                  <Button onClick={() => generateInsights()} disabled={isGenerating} variant="default">
                    {isGenerating ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      "Generate Insights"
                    )}
                  </Button>
                </div>
              )}

              {isLoadingInsights && (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-white/40" />
                </div>
              )}

              {hasInsights && insights && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <EngagementScore score={insights.engagementScore} dynamics={insights.dynamics} />
                  <SpeakerMetricsChart metrics={transformSpeakerMetrics(insights.speakerMetrics)} />
                  <SentimentTimeline sentiment={insights.sentiment} />
                  <ConversationDynamics dynamics={insights.dynamics} />
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
