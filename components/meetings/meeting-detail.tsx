"use client";

import { useState, useEffect, useRef } from "react";
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
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Database } from "@/types/supabase";
import { EditMeetingDialog } from "./edit-meeting-dialog";
import { AudioPlayer } from "@/components/audio/audio-player";
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
  const [activeTab, setActiveTab] = useState<"transcript" | "summary" | "actions">("transcript");
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (meeting.transcript_id && !meeting.transcript) {
      setIsTranscribing(true);
      startPolling(meeting.transcript_id);
    }
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return "N/A";
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  const startPolling = (transcriptId: string) => {
    console.log("Starting transcript polling for ID:", transcriptId);

    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }

    pollIntervalRef.current = setInterval(async () => {
      try {
        const checkResponse = await fetch(`/api/meetings/${meeting.id}/check-transcript?transcriptId=${transcriptId}`);
        const checkResult = await checkResponse.json();

        console.log("Poll result:", checkResult.status);

        if (checkResult.hasTranscript || checkResult.status === "completed") {
          const meetingResponse = await fetch(`/api/meetings/${meeting.id}`);
          const updatedMeeting = await meetingResponse.json();

          if (updatedMeeting?.transcript) {
            setMeeting(updatedMeeting);
            if (pollIntervalRef.current) {
              clearInterval(pollIntervalRef.current);
              pollIntervalRef.current = null;
            }
            setIsTranscribing(false);
            toast.success("Transcription complete!");

            if (!updatedMeeting.summary) {
              setTimeout(() => {
                handleSummarize(updatedMeeting);
              }, 100);
            }
          }
        } else if (checkResult.status === "error") {
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }
          setIsTranscribing(false);
          toast.error("Transcription failed: " + (checkResult.error || "Unknown error"));
        }
      } catch (error) {
        console.error("Poll error:", error);
      }
    }, 5000);

    setTimeout(() => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
        if (isTranscribing) {
          setIsTranscribing(false);
          toast.error("Transcription timed out. Please try again.");
        }
      }
    }, 600000);
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
      toast.success("Transcription started! This may take a few minutes.");
      setMeeting((prev) => ({ ...prev, transcript_id: result.transcriptId }));
      startPolling(result.transcriptId);
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

      // Refresh meeting data
      const meetingResponse = await fetch(`/api/meetings/${meetingToUse.id}`);
      const updatedMeeting = await meetingResponse.json();
      if (updatedMeeting) {
        setMeeting(updatedMeeting);
        toast.success(result.fallback ? "Basic summary generated" : "AI summary generated!");
      }
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

      <Card className="shadow-2xl">
        <CardHeader>
          <CardTitle className="text-3xl font-display gradient-text">{meeting.title}</CardTitle>
          {meeting.description && (
            <CardDescription className="text-white/70 text-base mt-2">{meeting.description}</CardDescription>
          )}
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-6 text-sm">
            {meeting.recorded_at && (
              <div className="flex items-center gap-2 text-white/60">
                <Calendar className="w-4 h-4" />
                <span>{format(new Date(meeting.recorded_at), "PPP 'at' p")}</span>
              </div>
            )}
            {meeting.duration && (
              <div className="flex items-center gap-2 text-white/60">
                <Clock className="w-4 h-4" />
                <span>{formatDuration(meeting.duration)}</span>
              </div>
            )}
            {meeting.participants && meeting.participants.length > 0 && (
              <div className="flex items-center gap-2 text-white/60">
                <Users className="w-4 h-4" />
                <span>{meeting.participants.join(", ")}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {meeting.audio_url && (
        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle className="text-xl font-display">Recording</CardTitle>
          </CardHeader>
          <CardContent>
            <AudioPlayer url={meeting.audio_url} />
          </CardContent>
        </Card>
      )}

      <Card className="shadow-xl">
        <CardHeader className="pb-0">
          <div className="flex gap-1 p-1 bg-white/[0.03] rounded-lg backdrop-blur-sm">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2.5 rounded-md transition-all duration-200 flex-1",
                    activeTab === tab.id
                      ? "bg-gradient-to-r from-purple-500 to-cyan-500 text-white shadow-lg"
                      : "text-white/60 hover:text-white/90 hover:bg-white/[0.05]"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-sm font-medium">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {activeTab === "transcript" && (
            <div className="prose prose-invert max-w-none">
              {meeting.transcript ? (
                <div className="whitespace-pre-wrap text-white/80 leading-relaxed">{meeting.transcript}</div>
              ) : (
                <div className="text-center py-12">
                  <FileText className="w-12 h-12 text-white/20 mx-auto mb-4" />
                  <p className="text-white/50 italic mb-4">
                    Transcript will be available after AI processing is complete.
                  </p>
                  {meeting.audio_url && !isTranscribing && !meeting.transcript_id && (
                    <Button variant="glow" onClick={handleTranscribe} className="shadow-lg">
                      <Bot className="w-4 h-4 mr-2" />
                      Generate Transcript
                    </Button>
                  )}
                  {isTranscribing && (
                    <div className="flex items-center justify-center gap-2 text-white/60">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Processing audio... This may take a few minutes.</span>
                      {meeting.transcript_id && (
                        <span className="text-xs text-white/40">(ID: {meeting.transcript_id.substring(0, 8)}...)</span>
                      )}
                    </div>
                  )}
                  {!isTranscribing && meeting.transcript_id && (
                    <div className="text-center">
                      <p className="text-sm text-white/50 mb-4">Transcription in progress. Please wait...</p>
                      <Button variant="outline" size="sm" onClick={() => window.location.reload()} className="mr-2">
                        Refresh Page
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === "summary" && (
            <div className="space-y-6">
              {meeting.summary ? (
                <>
                  <div className="space-y-3">
                    <h3 className="font-semibold text-white/90 flex items-center gap-2">
                      <div className="w-1 h-4 bg-gradient-to-b from-purple-500 to-cyan-500 rounded-full" />
                      Overview
                    </h3>
                    <p className="text-white/70 leading-relaxed pl-6">{meeting.summary.overview}</p>
                  </div>

                  {meeting.summary.key_points.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="font-semibold text-white/90 flex items-center gap-2">
                        <div className="w-1 h-4 bg-gradient-to-b from-purple-500 to-cyan-500 rounded-full" />
                        Key Points
                      </h3>
                      <ul className="space-y-2 pl-6">
                        {meeting.summary.key_points.map((point, index) => (
                          <li key={index} className="text-white/70 flex items-start gap-2">
                            <span className="text-purple-400 mt-1">•</span>
                            <span className="leading-relaxed">{point}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {meeting.summary.decisions.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="font-semibold text-white/90 flex items-center gap-2">
                        <div className="w-1 h-4 bg-gradient-to-b from-purple-500 to-cyan-500 rounded-full" />
                        Decisions Made
                      </h3>
                      <ul className="space-y-2 pl-6">
                        {meeting.summary.decisions.map((decision, index) => (
                          <li key={index} className="text-white/70 flex items-start gap-2">
                            <span className="text-cyan-400 mt-1">•</span>
                            <span className="leading-relaxed">{decision}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {meeting.summary.next_steps.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="font-semibold text-white/90 flex items-center gap-2">
                        <div className="w-1 h-4 bg-gradient-to-b from-purple-500 to-cyan-500 rounded-full" />
                        Next Steps
                      </h3>
                      <ul className="space-y-2 pl-6">
                        {meeting.summary.next_steps.map((step, index) => (
                          <li key={index} className="text-white/70 flex items-start gap-2">
                            <span className="text-green-400 mt-1">→</span>
                            <span className="leading-relaxed">{step}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-12">
                  <Lightbulb className="w-12 h-12 text-white/20 mx-auto mb-4" />
                  <p className="text-white/50 italic mb-4">
                    Summary will be available after AI processing is complete.
                  </p>
                  {meeting.transcript && !isSummarizing && (
                    <Button variant="glow" onClick={() => handleSummarize()} className="shadow-lg">
                      <Bot className="w-4 h-4 mr-2" />
                      Generate Summary
                    </Button>
                  )}
                  {isSummarizing && (
                    <div className="flex items-center justify-center gap-2 text-white/60">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Generating AI summary...</span>
                    </div>
                  )}
                  {!meeting.transcript && <p className="text-white/40 text-sm mt-2">Transcript required first</p>}
                </div>
              )}
            </div>
          )}

          {activeTab === "actions" && (
            <div className="space-y-3">
              {meeting.action_items && meeting.action_items.length > 0 ? (
                meeting.action_items.map((item) => (
                  <div
                    key={item.id}
                    className={cn(
                      "p-4 rounded-lg border transition-all duration-200",
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
        </CardContent>
      </Card>

      <EditMeetingDialog
        meeting={meeting}
        isOpen={isEditDialogOpen}
        onClose={() => setIsEditDialogOpen(false)}
        onUpdate={(updatedMeeting) => setMeeting(updatedMeeting)}
      />
    </div>
  );
}
