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
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

// Define the database structure based on the schema
interface DatabaseInsights {
  id: string;
  meeting_id: string;
  speaker_metrics: any; // JSONB
  sentiment: any; // JSONB
  dynamics: any; // JSONB
  key_moments?: any; // JSONB
  engagement_score: number;
  generated_at: string;
  created_at: string;
  updated_at: string;
}

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

const transformSpeakerMetrics = (speakerMetrics: any): SpeakerMetric[] => {
  if (!speakerMetrics || !Array.isArray(speakerMetrics)) return [];

  return speakerMetrics.map((metric: any) => ({
    speaker: metric.speaker || "Unknown",
    duration: Math.round(metric.totalDuration || 0),
    wordCount: Math.round(((metric.totalDuration || 0) / 60) * 150),
    percentage: Math.round(metric.speakingPercentage || 0),
  }));
};

export default function MeetingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const toast = useToast();
  const meetingId = params.id as string;
  const { data: meeting, isLoading, error, refetch } = useMeeting(meetingId);
  const [activeTab, setActiveTab] = useState<"transcript" | "summary" | "actions" | "insights">("transcript");
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [isGeneratingActions, setIsGeneratingActions] = useState(false);

  const { selectedLanguage, setSelectedLanguage, translate, isTranslating, currentTranslation, availableLanguages } =
    useTranslation({
      meetingId,
      enabled: !!meeting && !!meeting.transcript,
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

  // Cast insights to the database format
  const dbInsights = insights as DatabaseInsights | null;

  useEffect(() => {
    if (error) {
      console.error("Error loading meeting:", error);
    }
  }, [error]);

  const handleGenerateSummary = async () => {
    if (!meeting?.transcript) {
      toast.error("Transcript required for summarization");
      return;
    }

    setIsGeneratingSummary(true);
    try {
      const response = await fetch(`/api/meetings/${meetingId}/summarize`, {
        method: "POST",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to generate summary");
      }

      const result = await response.json();
      await refetch();
      toast.success(result.fallback ? "Basic summary generated!" : "AI summary generated!");
    } catch (error) {
      console.error("Summarization error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to generate summary");
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  const handleGenerateActionItems = async () => {
    if (!meeting?.summary) {
      toast.error("Summary required for action items");
      return;
    }

    setIsGeneratingActions(true);
    try {
      const response = await fetch(`/api/meetings/${meetingId}/summarize`, {
        method: "POST",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to generate action items");
      }

      await refetch();
      toast.success("Action items generated!");
    } catch (error) {
      console.error("Action items generation error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to generate action items");
    } finally {
      setIsGeneratingActions(false);
    }
  };

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
  const displayedActionItems = meeting.action_items;

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
          onClick={() => setShowShareDialog(true)}
          variant="outline"
          size="sm"
          className="group border-white/20 hover:border-white/40"
        >
          <Share2 className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform" />
          Share
        </Button>
      </div>

      <div className="space-y-4">
        <div>
          <h1 className="text-3xl font-bold font-display text-white">{meeting.title}</h1>
          {meeting.description && <p className="text-white/60 mt-2">{meeting.description}</p>}
        </div>

        <div className="flex flex-wrap gap-4 text-sm text-white/60">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            <span>{formatDate(recordedDate)}</span>
          </div>
          {meeting.duration && (
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span>{formatDuration(meeting.duration)}</span>
            </div>
          )}
          {meeting.participants && meeting.participants.length > 0 && (
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              <span>{meeting.participants.join(", ")}</span>
            </div>
          )}
        </div>
      </div>

      {meeting.audio_url && (
        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle className="text-xl font-display">Audio Recording</CardTitle>
          </CardHeader>
          <CardContent>
            <AudioPlayer url={meeting.audio_url} className="w-full" />
          </CardContent>
        </Card>
      )}

      <Card className="shadow-xl">
        <CardHeader className="border-b border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex gap-1 p-1 bg-white/[0.03] rounded-lg">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "px-4 py-2 rounded-md flex items-center gap-2 transition-all duration-200",
                      activeTab === tab.id
                        ? "bg-white/10 text-white shadow-lg"
                        : "text-white/60 hover:text-white/80 hover:bg-white/[0.05]"
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-sm font-medium">{tab.label}</span>
                  </button>
                );
              })}
            </div>
            {meeting.transcript && meeting.language && availableLanguages.length > 0 && (
              <LanguageSelector
                selectedLanguage={selectedLanguage}
                onLanguageChange={setSelectedLanguage}
                availableLanguages={availableLanguages}
                isLoading={isTranslating}
              />
            )}
          </div>
        </CardHeader>

        <CardContent className="pt-6">
          {activeTab === "transcript" && (
            <div className="prose prose-invert max-w-none">
              {displayedTranscript ? (
                <div className="whitespace-pre-wrap text-white/80 leading-relaxed">{displayedTranscript}</div>
              ) : (
                <div className="text-center py-12">
                  <FileText className="w-12 h-12 text-white/20 mx-auto mb-4" />
                  <p className="text-white/50 italic mb-4">
                    {isTranscribing
                      ? "Transcription in progress..."
                      : "No transcript available. Upload audio to generate transcript."}
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === "summary" && (
            <div className="space-y-6">
              {displayedSummary ? (
                <>
                  <div className="space-y-3">
                    <h3 className="font-semibold text-white/90 flex items-center gap-2">
                      <div className="w-1 h-4 bg-gradient-to-b from-purple-500 to-cyan-500 rounded-full" />
                      Overview
                    </h3>
                    <p className="text-white/70 leading-relaxed">{displayedSummary.overview}</p>
                  </div>

                  {displayedSummary.key_points && displayedSummary.key_points.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="font-semibold text-white/90 flex items-center gap-2">
                        <div className="w-1 h-4 bg-gradient-to-b from-purple-500 to-cyan-500 rounded-full" />
                        Key Points
                      </h3>
                      <ul className="space-y-2 pl-6">
                        {displayedSummary.key_points.map((point, index) => (
                          <li key={index} className="text-white/70 flex items-start gap-2">
                            <span className="text-cyan-400 mt-1">•</span>
                            <span className="leading-relaxed">{point}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {displayedSummary.decisions && displayedSummary.decisions.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="font-semibold text-white/90 flex items-center gap-2">
                        <div className="w-1 h-4 bg-gradient-to-b from-purple-500 to-cyan-500 rounded-full" />
                        Decisions Made
                      </h3>
                      <ul className="space-y-2 pl-6">
                        {displayedSummary.decisions.map((decision, index) => (
                          <li key={index} className="text-white/70 flex items-start gap-2">
                            <span className="text-purple-400 mt-1">✓</span>
                            <span className="leading-relaxed">{decision}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {displayedSummary.next_steps && displayedSummary.next_steps.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="font-semibold text-white/90 flex items-center gap-2">
                        <div className="w-1 h-4 bg-gradient-to-b from-purple-500 to-cyan-500 rounded-full" />
                        Next Steps
                      </h3>
                      <ul className="space-y-2 pl-6">
                        {displayedSummary.next_steps.map((step, index) => (
                          <li key={index} className="text-white/70 flex items-start gap-2">
                            <span className="text-green-400 mt-1">→</span>
                            <span className="leading-relaxed">{step}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="mt-6 pt-6 border-t border-white/10">
                    <Button
                      onClick={handleGenerateSummary}
                      disabled={isGeneratingSummary || !meeting.transcript}
                      variant="outline"
                      size="sm"
                      className="group"
                    >
                      {isGeneratingSummary ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Regenerating...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform" />
                          Regenerate Summary
                        </>
                      )}
                    </Button>
                  </div>
                </>
              ) : (
                <div className="text-center py-12">
                  <Lightbulb className="w-12 h-12 text-white/20 mx-auto mb-4" />
                  <p className="text-white/50 italic mb-4">
                    {meeting.transcript
                      ? "Summary not yet generated."
                      : "Summary requires a transcript. Please wait for transcription to complete."}
                  </p>
                  {meeting.transcript && (
                    <Button
                      onClick={handleGenerateSummary}
                      disabled={isGeneratingSummary}
                      variant="glow"
                      className="shadow-lg"
                    >
                      {isGeneratingSummary ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 mr-2" />
                          Generate Summary
                        </>
                      )}
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === "actions" && (
            <div className="space-y-4">
              {displayedActionItems && displayedActionItems.length > 0 ? (
                <>
                  {displayedActionItems.map((item: any) => (
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
                  ))}
                  <div className="mt-6 pt-6 border-t border-white/10">
                    <Button
                      onClick={handleGenerateActionItems}
                      disabled={isGeneratingActions || !meeting.summary}
                      variant="outline"
                      size="sm"
                      className="group"
                    >
                      {isGeneratingActions ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Regenerating...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform" />
                          Regenerate Action Items
                        </>
                      )}
                    </Button>
                  </div>
                </>
              ) : (
                <div className="text-center py-12">
                  <ListChecks className="w-12 h-12 text-white/20 mx-auto mb-4" />
                  <p className="text-white/50 italic mb-4">
                    {meeting.summary
                      ? "No action items identified."
                      : "Action items require a summary. Please generate summary first."}
                  </p>
                  {meeting.summary && (
                    <Button
                      onClick={handleGenerateActionItems}
                      disabled={isGeneratingActions}
                      variant="glow"
                      className="shadow-lg"
                    >
                      {isGeneratingActions ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 mr-2" />
                          Generate Action Items
                        </>
                      )}
                    </Button>
                  )}
                </div>
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

              {hasInsights && dbInsights && (
                <div className="space-y-6">
                  {/* Engagement Score */}
                  {typeof dbInsights.engagement_score === "number" && (
                    <Card className="bg-white/[0.02] backdrop-blur-sm border-white/10">
                      <CardHeader>
                        <CardTitle className="text-white flex items-center gap-2">
                          <BarChart3 className="w-5 h-5 text-yellow-400" />
                          Engagement Score
                        </CardTitle>
                        <CardDescription className="text-white/60">Overall meeting effectiveness</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="text-center">
                          <div className="text-4xl font-bold text-white mb-2">
                            {Math.round(dbInsights.engagement_score)}%
                          </div>
                          <p className="text-sm text-white/60">
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

                  {/* Speaker Metrics */}
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

                  {/* Sentiment Timeline */}
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

                  {/* Conversation Dynamics */}
                  {dbInsights.dynamics && typeof dbInsights.dynamics === "object" && (
                    <Card className="bg-white/[0.02] backdrop-blur-sm border-white/10">
                      <CardHeader>
                        <CardTitle className="text-white">Conversation Dynamics</CardTitle>
                        <CardDescription className="text-white/60">Interaction patterns</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          {typeof dbInsights.dynamics.totalInterruptions === "number" && (
                            <div className="bg-white/[0.02] rounded-lg p-4">
                              <p className="text-white/60 text-sm mb-1">Interruptions</p>
                              <p className="text-2xl font-bold text-white">{dbInsights.dynamics.totalInterruptions}</p>
                            </div>
                          )}
                          {typeof dbInsights.dynamics.speakerBalance === "number" && (
                            <div className="bg-white/[0.02] rounded-lg p-4">
                              <p className="text-white/60 text-sm mb-1">Speaker Balance</p>
                              <p className="text-2xl font-bold text-white">
                                {Math.round(dbInsights.dynamics.speakerBalance * 100)}%
                              </p>
                            </div>
                          )}
                        </div>
                        {typeof dbInsights.dynamics.averageTurnDuration === "number" && (
                          <div className="bg-white/[0.02] rounded-lg p-4">
                            <p className="text-white/60 text-sm mb-1">Average Turn Duration</p>
                            <p className="text-xl font-bold text-white">
                              {Math.round(dbInsights.dynamics.averageTurnDuration)}s
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {/* Key Themes - checking for key_moments as JSONB array */}
                  {dbInsights.key_moments &&
                    Array.isArray(dbInsights.key_moments) &&
                    dbInsights.key_moments.length > 0 && (
                      <Card className="bg-white/[0.02] backdrop-blur-sm border-white/10">
                        <CardHeader>
                          <CardTitle className="text-white">Key Moments</CardTitle>
                          <CardDescription className="text-white/60">Important points in the meeting</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            {dbInsights.key_moments.map((moment: any, index: number) => (
                              <div key={index} className="p-3 bg-white/[0.02] rounded-lg">
                                <p className="text-sm text-white/80">{moment.description || moment}</p>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}
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
