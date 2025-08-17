"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import {
  ArrowLeft,
  Clock,
  Users,
  Download,
  FileText,
  ListChecks,
  Lightbulb,
  Edit2,
  Calendar,
  User,
  Bot,
  Loader2,
  Share2,
  BarChart3,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Database } from "@/types/supabase";
import { EditMeetingDialog } from "./edit-meeting-dialog";
import { ShareDialog } from "./share-dialog";
import { AudioPlayer } from "@/components/audio/audio-player";
import { MeetingInsights } from "./meeting-insights";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";

type Meeting = Database["public"]["Tables"]["meetings"]["Row"];

interface MeetingDetailProps {
  meeting: Meeting;
}

export function MeetingDetail({ meeting: initialMeeting }: MeetingDetailProps) {
  const router = useRouter();
  const toast = useToast();
  const [meeting, setMeeting] = useState(initialMeeting);
  const [activeTab, setActiveTab] = useState<"transcript" | "summary" | "actions" | "insights">("transcript");
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);

  useEffect(() => {
    setMeeting(initialMeeting);
  }, [initialMeeting]);

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return "N/A";
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  const handleTranscribe = async () => {
    if (!meeting.audio_url) {
      toast.error("No audio file available");
      return;
    }

    setIsTranscribing(true);
    try {
      const response = await fetch(`/api/meetings/${meeting.id}/transcribe`, {
        method: "POST",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to start transcription");
      }

      const result = await response.json();
      toast.info("Transcription started. This may take a few minutes.");
      setMeeting((prev) => ({ ...prev, transcript_id: result.transcriptId }));
      setIsTranscribing(true);
    } catch (error) {
      console.error("Transcription error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to start transcription");
      setIsTranscribing(false);
    }
  };

  const handleSummarize = async (meetingData?: Meeting) => {
    const meetingToUse = meetingData || meeting;

    if (!meetingToUse.transcript) {
      toast.error("Transcript required for summarization");
      return;
    }

    setIsSummarizing(true);
    try {
      const response = await fetch(`/api/meetings/${meetingToUse.id}/summarize`, {
        method: "POST",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to generate summary");
      }

      const result = await response.json();
      toast.success("AI summary generated!");
      window.location.reload();
    } catch (error) {
      console.error("Summarization error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to generate summary");
    } finally {
      setIsSummarizing(false);
    }
  };

  const tabs = [
    { id: "transcript" as const, label: "Transcript", icon: FileText },
    { id: "summary" as const, label: "Summary", icon: Lightbulb },
    { id: "actions" as const, label: "Action Items", icon: ListChecks },
    { id: "insights" as const, label: "Insights", icon: BarChart3 },
  ];

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
        <div className="flex gap-2">
          {!meeting.transcript && meeting.audio_url && (
            <Button variant="glow" size="sm" onClick={handleTranscribe} disabled={isTranscribing} className="shadow-lg">
              {isTranscribing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Transcribing...
                </>
              ) : (
                <>
                  <Bot className="w-4 h-4 mr-2" />
                  Transcribe
                </>
              )}
            </Button>
          )}
          {meeting.transcript && !meeting.summary && (
            <Button
              variant="glow"
              size="sm"
              onClick={() => handleSummarize()}
              disabled={isSummarizing}
              className="shadow-lg"
            >
              {isSummarizing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Summarizing...
                </>
              ) : (
                <>
                  <Bot className="w-4 h-4 mr-2" />
                  Generate Summary
                </>
              )}
            </Button>
          )}
          <Button
            variant="glass"
            size="sm"
            onClick={() => setIsShareDialogOpen(true)}
            className="hover:border-cyan-400/60"
          >
            <Share2 className="w-4 h-4 mr-2" />
            Share
          </Button>
          <Button
            variant="glass"
            size="sm"
            onClick={() => setIsEditDialogOpen(true)}
            className="hover:border-purple-400/60"
          >
            <Edit2 className="w-4 h-4 mr-2" />
            Edit
          </Button>
          {meeting.audio_url && (
            <Button variant="glass" size="sm" asChild className="hover:border-cyan-400/60">
              <a href={meeting.audio_url} download>
                <Download className="w-4 h-4 mr-2" />
                Download
              </a>
            </Button>
          )}
        </div>
      </div>

      {/* Meeting Header */}
      <Card className="bg-white/[0.02] backdrop-blur-sm border-white/10">
        <CardHeader>
          <CardTitle className="text-2xl font-display">{meeting.title}</CardTitle>
          {meeting.description && <CardDescription className="text-white/60">{meeting.description}</CardDescription>}
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-purple-400" />
              <div>
                <p className="text-sm text-white/60">Recorded</p>
                <p className="font-medium">
                  {meeting.recorded_at ? format(new Date(meeting.recorded_at), "PPP") : "N/A"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-cyan-400" />
              <div>
                <p className="text-sm text-white/60">Duration</p>
                <p className="font-medium">{formatDuration(meeting.duration)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-blue-400" />
              <div>
                <p className="text-sm text-white/60">Participants</p>
                <p className="font-medium">{meeting.participants?.length || 0}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Audio Player */}
      {meeting.audio_url && (
        <Card className="bg-white/[0.02] backdrop-blur-sm border-white/10">
          <CardContent className="p-6">
            <AudioPlayer audioUrl={meeting.audio_url} />
          </CardContent>
        </Card>
      )}

      {/* Content Tabs */}
      <Card className="bg-white/[0.02] backdrop-blur-sm border-white/10">
        <CardHeader>
          <div className="flex gap-2 flex-wrap">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <Button
                  key={tab.id}
                  variant={activeTab === tab.id ? "glow" : "glass"}
                  size="sm"
                  onClick={() => setActiveTab(tab.id)}
                  className={cn("transition-all", activeTab === tab.id ? "shadow-lg" : "hover:border-white/30")}
                >
                  <Icon className="w-4 h-4 mr-2" />
                  {tab.label}
                </Button>
              );
            })}
          </div>
        </CardHeader>
        <CardContent>
          {activeTab === "transcript" && (
            <div className="space-y-4">
              {isTranscribing ? (
                <div className="text-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-purple-400" />
                  <p className="text-white/60">Transcription in progress...</p>
                  <p className="text-sm text-white/40 mt-2">This may take a few minutes</p>
                </div>
              ) : meeting.transcript ? (
                <div className="prose prose-invert max-w-none">
                  <div className="bg-white/[0.02] rounded-lg p-6 whitespace-pre-wrap text-white/80 leading-relaxed">
                    {meeting.transcript}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <FileText className="w-12 h-12 text-white/20 mx-auto mb-4" />
                  <p className="text-white/50 italic">No transcript available yet.</p>
                  {meeting.audio_url && (
                    <Button variant="glow" onClick={handleTranscribe} className="mt-4 shadow-lg">
                      <Bot className="w-4 h-4 mr-2" />
                      Generate Transcript
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === "summary" && (
            <div className="space-y-4">
              {meeting.summary ? (
                <div className="space-y-6">
                  <div>
                    <h4 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-3">Overview</h4>
                    <p className="text-white/80 leading-relaxed">{meeting.summary.overview}</p>
                  </div>

                  {meeting.summary.key_points && meeting.summary.key_points.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-3">Key Points</h4>
                      <ul className="space-y-2">
                        {meeting.summary.key_points.map((point: string, index: number) => (
                          <li key={index} className="flex items-start gap-2">
                            <span className="text-cyan-400 mt-1">•</span>
                            <span className="text-white/80">{point}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {meeting.summary.decisions && meeting.summary.decisions.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-3">Decisions</h4>
                      <ul className="space-y-2">
                        {meeting.summary.decisions.map((decision: string, index: number) => (
                          <li key={index} className="flex items-start gap-2">
                            <span className="text-purple-400 mt-1">✓</span>
                            <span className="text-white/80">{decision}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {meeting.summary.next_steps && meeting.summary.next_steps.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-3">Next Steps</h4>
                      <ul className="space-y-2">
                        {meeting.summary.next_steps.map((step: string, index: number) => (
                          <li key={index} className="flex items-start gap-2">
                            <span className="text-blue-400 mt-1">→</span>
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
                  <p className="text-white/50 italic">AI summary will be generated after transcription is complete.</p>
                  {meeting.transcript && (
                    <Button variant="glow" onClick={() => handleSummarize()} className="mt-4 shadow-lg">
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
              {meeting.action_items && meeting.action_items.length > 0 ? (
                meeting.action_items.map((item, index) => (
                  <div
                    key={item.id || index}
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
                              <User className="w-3.5 h-3.5" />
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

          {activeTab === "insights" && <MeetingInsights meeting={meeting} />}
        </CardContent>
      </Card>

      <EditMeetingDialog
        meeting={meeting}
        isOpen={isEditDialogOpen}
        onClose={() => setIsEditDialogOpen(false)}
        onUpdate={(updatedMeeting) => setMeeting(updatedMeeting)}
      />

      <ShareDialog
        meetingId={meeting.id}
        meetingTitle={meeting.title}
        isOpen={isShareDialogOpen}
        onClose={() => setIsShareDialogOpen(false)}
      />
    </div>
  );
}
