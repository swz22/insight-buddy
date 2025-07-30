"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Lock, Calendar, Clock, Users, Loader2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AudioPlayer } from "@/components/audio/audio-player";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useCollaboration } from "@/hooks/use-collaboration";
import { PresenceAvatars } from "@/components/collaboration/presence-avatars";
import { CollaborativeTranscript } from "@/components/collaboration/collaborative-transcript";
import { CollaborativeNotes } from "@/components/collaboration/collaborative-notes";

interface SharedMeeting {
  id: string;
  title: string;
  description: string | null;
  recorded_at: string | null;
  duration: number | null;
  participants: string[];
  transcript: string | null;
  summary: any;
  action_items: any[] | null;
  audio_url: string | null;
}

interface ShareInfo {
  created_at: string;
  expires_at: string | null;
  access_count: number;
}

export default function SharePage() {
  const params = useParams();
  const token = params.token as string;

  const [isLoading, setIsLoading] = useState(true);
  const [requiresPassword, setRequiresPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [meeting, setMeeting] = useState<SharedMeeting | null>(null);
  const [shareInfo, setShareInfo] = useState<ShareInfo | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [activeTab, setActiveTab] = useState<"transcript" | "summary" | "actions">("transcript");
  const [userName, setUserName] = useState("");
  const [hasJoined, setHasJoined] = useState(false);

  const getUserColor = (name: string) => {
    const colors = ["#8B5CF6", "#06B6D4", "#10B981", "#F59E0B", "#EF4444", "#EC4899", "#6366F1", "#84CC16"];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  const userInfo = {
    name: userName || "Anonymous",
    email: undefined,
    avatar_url: undefined,
    color: getUserColor(userName || "Anonymous"),
  };

  const {
    presence,
    annotations,
    notes,
    isConnected,
    activeUsers,
    addHighlight,
    addComment,
    updateNotes,
    updateStatus,
  } = useCollaboration(meeting?.id || "", token, hasJoined && userName ? userInfo : { name: "", color: "" });

  const handleNotesChange = (newNotes: string) => {
    updateStatus("typing");
    updateNotes(newNotes);
    setTimeout(() => updateStatus("active"), 2000);
  };

  useEffect(() => {
    fetchSharedMeeting();
  }, [token]);

  const fetchSharedMeeting = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/public/shares/${token}`);
      const data = await response.json();

      if (!response.ok) {
        if (response.status === 404) {
          setError("This share link does not exist or has been removed.");
        } else if (response.status === 410) {
          setError("This share link has expired.");
        } else {
          setError(data.error || "Failed to access shared meeting");
        }
        return;
      }

      if (data.requiresPassword) {
        setRequiresPassword(true);
      } else {
        setMeeting(data.meeting);
        setShareInfo(data.share);
      }
    } catch (error) {
      console.error("Fetch error:", error);
      setError("Failed to load shared meeting. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const verifyPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsVerifying(true);
    setError(null);

    try {
      const response = await fetch(`/api/public/shares/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          setError("Incorrect password");
        } else {
          setError(data.error || "Failed to verify password");
        }
        return;
      }

      setMeeting(data.meeting);
      setShareInfo(data.share);
      setRequiresPassword(false);
    } catch (error) {
      console.error("Verify error:", error);
      setError("Failed to verify password. Please try again.");
    } finally {
      setIsVerifying(false);
    }
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return "N/A";
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-white/40" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="text-red-400">Access Denied</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-white/70">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (requiresPassword) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="w-16 h-16 rounded-full bg-gradient-to-r from-purple-500/20 to-cyan-500/20 flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-white/60" />
            </div>
            <CardTitle className="text-2xl font-display">
              Password <span className="gradient-text">Required</span>
            </CardTitle>
            <CardDescription>This meeting is password protected</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={verifyPassword} className="space-y-4">
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                required
                className="bg-white/[0.03] border-white/20"
                autoFocus
              />
              <Button type="submit" variant="glow" className="w-full" disabled={isVerifying || !password}>
                {isVerifying ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  "Access Meeting"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!meeting || !hasJoined) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-display">
              Join <span className="gradient-text">Meeting</span>
            </CardTitle>
            <CardDescription>Enter your name to join the collaborative session</CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (userName.trim()) {
                  setHasJoined(true);
                }
              }}
              className="space-y-4"
            >
              <Input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="Your name"
                required
                className="bg-white/[0.03] border-white/20"
                autoFocus
              />
              <Button type="submit" variant="glow" className="w-full" disabled={!userName.trim()}>
                Join Meeting
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  const tabs = [
    { id: "transcript" as const, label: "Transcript", icon: FileText },
    { id: "summary" as const, label: "Summary", icon: FileText },
    { id: "actions" as const, label: "Action Items", icon: FileText },
  ];

  return (
    <div className="min-h-screen bg-black">
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="space-y-6 animate-fade-in">
          {/* Header with presence */}
          <div className="flex items-center justify-between mb-8">
            <div className="text-center flex-1">
              <h1 className="text-3xl font-bold font-display text-white mb-2">
                Shared <span className="gradient-text">Meeting</span>
              </h1>
              {shareInfo && (
                <p className="text-sm text-white/50">
                  Shared {format(new Date(shareInfo.created_at), "PPP")} · Viewed {shareInfo.access_count} times
                  {shareInfo.expires_at && <> · Expires {format(new Date(shareInfo.expires_at), "PPP")}</>}
                </p>
              )}
            </div>

            {/* Presence avatars */}
            {isConnected && (
              <div className="absolute top-6 right-6">
                <PresenceAvatars presence={presence} />
              </div>
            )}
          </div>

          {/* Meeting Info */}
          <Card className="shadow-2xl">
            <CardHeader>
              <CardTitle className="text-2xl font-display">{meeting.title}</CardTitle>
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

          {/* Audio Player */}
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

          {/* Content Tabs */}
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
                    <CollaborativeTranscript
                      transcript={meeting.transcript}
                      annotations={annotations}
                      onAddHighlight={addHighlight}
                      onAddComment={addComment}
                      currentUserColor={userInfo.color}
                    />
                  ) : (
                    <div className="text-center py-12 text-white/50 italic">No transcript available</div>
                  )}
                </div>
              )}

              {activeTab === "summary" && (
                <div className="space-y-6">
                  {meeting.summary ? (
                    <>
                      <div className="space-y-3">
                        <h3 className="font-semibold text-white/90">Overview</h3>
                        <p className="text-white/70 leading-relaxed">{meeting.summary.overview}</p>
                      </div>

                      {meeting.summary.key_points?.length > 0 && (
                        <div className="space-y-3">
                          <h3 className="font-semibold text-white/90">Key Points</h3>
                          <ul className="space-y-2">
                            {meeting.summary.key_points.map((point: string, index: number) => (
                              <li key={index} className="text-white/70 flex items-start gap-2">
                                <span className="text-purple-400 mt-1">•</span>
                                <span>{point}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-12 text-white/50 italic">No summary available</div>
                  )}
                </div>
              )}

              {activeTab === "actions" && (
                <div className="space-y-3">
                  {meeting.action_items && meeting.action_items.length > 0 ? (
                    meeting.action_items.map((item: any) => (
                      <div key={item.id} className="p-4 rounded-lg bg-white/[0.03] border border-white/20">
                        <p className="font-medium text-white/90">{item.task}</p>
                        {item.assignee && <p className="text-sm text-white/50 mt-1">Assigned to: {item.assignee}</p>}
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-12 text-white/50 italic">No action items available</div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Collaborative Notes */}
          <Card className="shadow-xl">
            <CardContent className="p-0">
              <CollaborativeNotes
                notes={notes}
                onNotesChange={handleNotesChange}
                isTyping={activeUsers.some((u) => u.status === "typing" && u.user_info.name !== userInfo.name)}
                lastEditedBy={
                  activeUsers.length > 0
                    ? {
                        name: activeUsers[0].user_info.name,
                        color: activeUsers[0].user_info.color,
                      }
                    : undefined
                }
              />
            </CardContent>
          </Card>

          {/* Footer */}
          <div className="text-center py-8">
            <p className="text-sm text-white/40">
              Powered by{" "}
              <span className="font-display">
                <span className="text-white/60">Insight</span> <span className="gradient-text">Buddy</span>
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
