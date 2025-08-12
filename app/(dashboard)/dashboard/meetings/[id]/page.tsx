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
import { SpeakerMetricsChart } from "@/components/insights/speaker-metrics-chart";
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

export default function MeetingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const meetingId = params.id as string;
  const { data: meeting, isLoading, error } = useMeeting(meetingId);
  const [activeTab, setActiveTab] = useState<"transcript" | "summary" | "actions" | "insights">("transcript");
  const [showShareDialog, setShowShareDialog] = useState(false);

  const { selectedLanguage, setSelectedLanguage, translate, isTranslating, currentTranslation, availableLanguages } =
    useTranslation({ meetingId, enabled: !!meeting });

  const {
    insights,
    isLoading: isLoadingInsights,
    isGenerating,
    generateInsights,
    hasInsights,
  } = useInsights({ meetingId, enabled: !!meeting?.transcript });

  useMeetingProcessing({ meeting, enabled: true });
  const { isTranscribing } = useTranscriptionStatus({ meeting, enabled: true });

  useEffect(() => {
    if (meeting?.language && meeting.language !== "en") {
      setSelectedLanguage(meeting.language);
    }
  }, [meeting?.language, setSelectedLanguage]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-white/40" />
      </div>
    );
  }

  if (error || !meeting) {
    return (
      <div className="text-center py-12">
        <p className="text-white/60">Meeting not found</p>
        <Button onClick={() => router.push("/dashboard")} className="mt-4">
          Go back to dashboard
        </Button>
      </div>
    );
  }

  const displayTitle = currentTranslation?.title || meeting.title;
  const displayDescription = currentTranslation?.description || meeting.description;
  const displayTranscript = currentTranslation?.transcript || meeting.transcript;
  const displaySummary = currentTranslation?.summary || meeting.summary;

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

        <div className="flex items-center gap-3">
          <LanguageSelector
            value={selectedLanguage}
            onChange={setSelectedLanguage}
            onTranslate={translate}
            availableTranslations={availableLanguages}
            isTranslating={isTranslating}
          />
          <Button
            onClick={() => setShowShareDialog(true)}
            className="bg-white/[0.05] hover:bg-white/[0.1] backdrop-blur-sm border border-white/10"
          >
            <Share2 className="w-4 h-4 mr-2" />
            Share
          </Button>
        </div>
      </div>

      <div>
        <h1 className="text-4xl font-bold font-display text-white">{displayTitle}</h1>
        {displayDescription && <p className="text-white/60 mt-2 text-lg">{displayDescription}</p>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-white/[0.02] backdrop-blur-sm border-white/10">
          <CardContent className="flex items-center gap-3 p-4">
            <Calendar className="w-5 h-5 text-purple-400" />
            <div>
              <p className="text-sm text-white/60">Recorded</p>
              <p className="text-white font-medium">
                {meeting.recorded_at ? formatDate(new Date(meeting.recorded_at)) : "Unknown"}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/[0.02] backdrop-blur-sm border-white/10">
          <CardContent className="flex items-center gap-3 p-4">
            <Clock className="w-5 h-5 text-blue-400" />
            <div>
              <p className="text-sm text-white/60">Duration</p>
              <p className="text-white font-medium">
                {meeting.duration ? formatDuration(meeting.duration) : "Unknown"}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/[0.02] backdrop-blur-sm border-white/10">
          <CardContent className="flex items-center gap-3 p-4">
            <Users className="w-5 h-5 text-green-400" />
            <div>
              <p className="text-sm text-white/60">Participants</p>
              <p className="text-white font-medium">{meeting.participants.length || 0}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {meeting.audio_url && (
        <Card className="bg-white/[0.02] backdrop-blur-sm border-white/10">
          <CardHeader>
            <CardTitle className="text-white">Audio Recording</CardTitle>
          </CardHeader>
          <CardContent>
            <AudioPlayer audioUrl={meeting.audio_url} />
          </CardContent>
        </Card>
      )}

      <div className="flex gap-2 border-b border-white/10">
        <button
          onClick={() => setActiveTab("transcript")}
          className={cn(
            "px-4 py-2 flex items-center gap-2 transition-all",
            activeTab === "transcript"
              ? "text-purple-400 border-b-2 border-purple-400"
              : "text-white/60 hover:text-white/90"
          )}
        >
          <FileText className="w-4 h-4" />
          Transcript
        </button>
        <button
          onClick={() => setActiveTab("summary")}
          className={cn(
            "px-4 py-2 flex items-center gap-2 transition-all",
            activeTab === "summary"
              ? "text-purple-400 border-b-2 border-purple-400"
              : "text-white/60 hover:text-white/90"
          )}
        >
          <Lightbulb className="w-4 h-4" />
          Summary
        </button>
        <button
          onClick={() => setActiveTab("actions")}
          className={cn(
            "px-4 py-2 flex items-center gap-2 transition-all",
            activeTab === "actions"
              ? "text-purple-400 border-b-2 border-purple-400"
              : "text-white/60 hover:text-white/90"
          )}
        >
          <ListChecks className="w-4 h-4" />
          Action Items
        </button>
        <button
          onClick={() => setActiveTab("insights")}
          className={cn(
            "px-4 py-2 flex items-center gap-2 transition-all",
            activeTab === "insights"
              ? "text-purple-400 border-b-2 border-purple-400"
              : "text-white/60 hover:text-white/90"
          )}
        >
          <BarChart3 className="w-4 h-4" />
          Insights
        </button>
      </div>

      <Card className="bg-white/[0.02] backdrop-blur-sm border-white/10">
        <CardContent className="p-6">
          {activeTab === "transcript" && (
            <div className="prose prose-invert max-w-none">
              {isTranscribing ? (
                <div className="flex flex-col items-center justify-center py-12 space-y-4">
                  <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
                  <p className="text-white/60">Transcribing audio... This may take a few minutes.</p>
                  <p className="text-white/40 text-sm">The page will update automatically when complete.</p>
                </div>
              ) : displayTranscript ? (
                <div className="whitespace-pre-wrap text-white/80 leading-relaxed">{displayTranscript}</div>
              ) : (
                <p className="text-white/40 italic">No transcript available yet.</p>
              )}
            </div>
          )}

          {activeTab === "summary" && (
            <div className="space-y-6">
              {displaySummary ? (
                <>
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-2">Overview</h3>
                    <p className="text-white/80 leading-relaxed">{displaySummary.overview}</p>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-white mb-2">Key Points</h3>
                    <ul className="list-disc list-inside space-y-1">
                      {displaySummary.key_points.map((point, index) => (
                        <li key={index} className="text-white/80">
                          {point}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {displaySummary.decisions.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-2">Decisions Made</h3>
                      <ul className="list-disc list-inside space-y-1">
                        {displaySummary.decisions.map((decision, index) => (
                          <li key={index} className="text-white/80">
                            {decision}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {displaySummary.next_steps.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-2">Next Steps</h3>
                      <ul className="list-disc list-inside space-y-1">
                        {displaySummary.next_steps.map((step, index) => (
                          <li key={index} className="text-white/80">
                            {step}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-white/40 italic">No summary available yet.</p>
              )}
            </div>
          )}

          {activeTab === "actions" && (
            <div className="space-y-4">
              {meeting.action_items && meeting.action_items.length > 0 ? (
                meeting.action_items.map((item) => (
                  <div
                    key={item.id}
                    className={cn(
                      "p-4 rounded-lg bg-white/[0.02] border",
                      item.completed ? "border-green-500/20" : "border-white/10"
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className={cn("text-white", item.completed && "line-through opacity-60")}>{item.task}</p>
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
                      <span
                        className={cn(
                          "px-2 py-1 text-xs rounded-full",
                          item.priority === "high" && "bg-red-500/20 text-red-400",
                          item.priority === "medium" && "bg-yellow-500/20 text-yellow-400",
                          item.priority === "low" && "bg-green-500/20 text-green-400"
                        )}
                      >
                        {item.priority}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-white/40 italic">No action items identified.</p>
              )}
            </div>
          )}

          {activeTab === "insights" && (
            <div>
              {!hasInsights && !isLoadingInsights && meeting.transcript && (
                <div className="text-center py-12">
                  <BarChart3 className="w-12 h-12 text-white/20 mx-auto mb-4" />
                  <p className="text-white/60 mb-4">No insights generated yet</p>
                  <Button
                    onClick={() => generateInsights()}
                    disabled={isGenerating}
                    className="bg-purple-500 hover:bg-purple-600"
                  >
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
                  <SpeakerMetricsChart metrics={insights.speakerMetrics} />
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
