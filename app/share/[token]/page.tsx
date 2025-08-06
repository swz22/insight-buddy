"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Lock, Calendar, Clock, Users, Loader2, FileText, X, Lightbulb, ListChecks } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AudioPlayer } from "@/components/audio/audio-player";
import { cn } from "@/lib/utils";
import { useCollaboration } from "@/hooks/use-collaboration";
import { PresenceAvatars } from "@/components/collaboration/presence-avatars";
import { CollaborativeTranscript } from "@/components/collaboration/collaborative-transcript";
import { CollaborativeNotes } from "@/components/collaboration/collaborative-notes";

const formatDate = (date: Date): string => {
  const options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  };
  return new Intl.DateTimeFormat("en-US", options).format(date);
};

const formatDateShort = (date: Date): string => {
  const options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "short",
    day: "numeric",
  };
  return new Intl.DateTimeFormat("en-US", options).format(date);
};

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

  const getSessionId = () => {
    if (typeof window === "undefined") return "";

    const hash = window.location.hash.slice(1);
    if (hash) {
      const params = new URLSearchParams(hash);
      const sessionId = params.get("session");
      if (sessionId) return sessionId;
    }

    const newSessionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newHash = `session=${newSessionId}`;
    window.location.hash = newHash;
    return newSessionId;
  };

  const sessionId = typeof window !== "undefined" ? getSessionId() : "";

  const userInfo = {
    name: userName || "Anonymous",
    color: `#${Math.floor(Math.random() * 16777215).toString(16)}`,
    sessionId,
  };

  const { annotations, notes, presence, addHighlight, addComment, deleteAnnotation, editAnnotation, updateNotes } =
    useCollaboration({
      meetingId: meeting?.id || "",
      shareToken: token,
      userInfo,
      enabled: hasJoined && !!meeting,
    });

  const onlineUsers = Object.values(presence).map((p) => p.user_info);
  const allUsers = hasJoined && meeting ? [userInfo, ...onlineUsers] : onlineUsers;

  useEffect(() => {
    const loadSharedMeeting = async () => {
      try {
        const response = await fetch(`/api/public/shares/${token}`);
        const data = await response.json();

        if (!response.ok) {
          setError(data.error || "Failed to load meeting");
          setIsLoading(false);
          return;
        }

        if (data.requiresPassword) {
          setRequiresPassword(true);
        } else {
          setMeeting(data.meeting);
          setShareInfo(data.share);
        }
      } catch (err) {
        setError("Failed to load meeting");
      } finally {
        setIsLoading(false);
      }
    };

    loadSharedMeeting();
  }, [token]);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsVerifying(true);
    setError(null);

    try {
      const response = await fetch(`/api/public/shares/${token}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Invalid password");
      } else {
        setRequiresPassword(false);
        setMeeting(data.meeting);
        setShareInfo(data.share);
        setPassword("");
      }
    } catch (err) {
      setError("Failed to verify password");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleJoin = () => {
    setHasJoined(true);
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return "N/A";
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black p-4">
        <Card className="max-w-md w-full shadow-xl">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <X className="w-8 h-8 text-red-500" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Access Error</h2>
            <p className="text-white/60">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (requiresPassword) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black p-4">
        <Card className="max-w-md w-full shadow-xl">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-purple-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-purple-500" />
            </div>
            <CardTitle>Password Required</CardTitle>
            <CardDescription>This meeting is password protected</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Input
                type="password"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
                disabled={isVerifying}
              />
              <Button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  handlePasswordSubmit(e as any);
                }}
                className="w-full"
                disabled={isVerifying || !password}
              >
                {isVerifying ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Verify Password
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!hasJoined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black p-4">
        <Card className="max-w-md w-full shadow-xl">
          <CardHeader className="text-center">
            <CardTitle>Join Meeting</CardTitle>
            <CardDescription>Enter your name to join the collaborative session</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Input
                type="text"
                placeholder="Your name (optional)"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                autoFocus
              />
              <Button onClick={handleJoin} className="w-full">
                Join as {userName || "Anonymous"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!meeting) return null;

  return (
    <div className="min-h-screen bg-black">
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-black to-cyan-900/20" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-purple-800/10 via-transparent to-transparent" />

        <div className="relative z-10 container mx-auto px-4 py-8 max-w-7xl">
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-3xl font-bold font-display">
                <span className="gradient-text">{meeting.title}</span>
              </h1>
              <PresenceAvatars users={allUsers} currentUserId={userInfo.sessionId} />
            </div>

            {meeting.description && <p className="text-white/60 mb-4">{meeting.description}</p>}

            <div className="flex flex-wrap gap-4 text-sm text-white/60">
              {meeting.recorded_at && (
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  {formatDateShort(new Date(meeting.recorded_at))}
                </div>
              )}
              {meeting.duration && (
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  {formatDuration(meeting.duration)}
                </div>
              )}
              {meeting.participants.length > 0 && (
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  {meeting.participants.join(", ")}
                </div>
              )}
            </div>
          </div>

          {meeting.audio_url && (
            <div className="mb-8">
              <AudioPlayer audioUrl={meeting.audio_url} />
            </div>
          )}

          <div className="mb-6 flex gap-2">
            {["transcript", "summary", "actions"].map((tab) => (
              <Button
                key={tab}
                variant={activeTab === tab ? "glow" : "glass"}
                size="sm"
                onClick={() => setActiveTab(tab as typeof activeTab)}
              >
                {tab === "actions" ? "Action Items" : tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Button>
            ))}
          </div>

          <div className="space-y-6">
            <Card className="shadow-xl">
              <CardContent className="p-6">
                {activeTab === "transcript" && (
                  <div className="space-y-4">
                    {meeting.transcript ? (
                      <CollaborativeTranscript
                        transcript={meeting.transcript}
                        annotations={annotations}
                        onAddHighlight={addHighlight}
                        onAddComment={addComment}
                        onDeleteAnnotation={deleteAnnotation}
                        onEditAnnotation={editAnnotation}
                        currentUserColor={userInfo.color}
                        currentUserName={userInfo.name}
                        currentSessionId={userInfo.sessionId}
                      />
                    ) : (
                      <div className="text-center py-12">
                        <FileText className="w-12 h-12 text-white/20 mx-auto mb-4" />
                        <p className="text-white/60">No transcript available</p>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === "summary" && (
                  <div className="space-y-4">
                    {meeting.summary ? (
                      <div className="prose prose-invert max-w-none">
                        <h3 className="text-lg font-semibold mb-4 gradient-text">Meeting Summary</h3>
                        <div className="space-y-4 text-white/80">
                          {meeting.summary.overview && (
                            <div>
                              <h4 className="font-medium text-white mb-2">Overview</h4>
                              <p>{meeting.summary.overview}</p>
                            </div>
                          )}
                          {meeting.summary.key_points && meeting.summary.key_points.length > 0 && (
                            <div>
                              <h4 className="font-medium text-white mb-2">Key Points</h4>
                              <ul className="list-disc pl-5 space-y-1">
                                {meeting.summary.key_points.map((point: string, index: number) => (
                                  <li key={index}>{point}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {meeting.summary.decisions && meeting.summary.decisions.length > 0 && (
                            <div>
                              <h4 className="font-medium text-white mb-2">Decisions Made</h4>
                              <ul className="list-disc pl-5 space-y-1">
                                {meeting.summary.decisions.map((decision: string, index: number) => (
                                  <li key={index}>{decision}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <Lightbulb className="w-12 h-12 text-white/20 mx-auto mb-4" />
                        <p className="text-white/60">No summary available</p>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === "actions" && (
                  <div className="space-y-4">
                    {meeting.action_items && meeting.action_items.length > 0 ? (
                      <div className="space-y-4">
                        {meeting.action_items.map((item: any, index: number) => (
                          <Card key={index} className="bg-white/5">
                            <CardContent className="p-4">
                              <div className="flex items-start gap-4">
                                <div
                                  className={cn(
                                    "w-2 h-2 rounded-full mt-2",
                                    item.priority === "high"
                                      ? "bg-red-500"
                                      : item.priority === "medium"
                                      ? "bg-yellow-500"
                                      : "bg-green-500"
                                  )}
                                />
                                <div className="flex-1">
                                  <p className="text-white">{item.task}</p>
                                  {item.assignee && (
                                    <p className="text-sm text-white/60 mt-1">Assigned to: {item.assignee}</p>
                                  )}
                                  {item.due_date && (
                                    <p className="text-sm text-white/60">
                                      Due: {formatDateShort(new Date(item.due_date))}
                                    </p>
                                  )}
                                </div>
                                <span
                                  className={cn(
                                    "text-xs px-2 py-1 rounded-full",
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
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <ListChecks className="w-12 h-12 text-white/20 mx-auto mb-4" />
                        <p className="text-white/60">No action items found</p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Collaborative Notes */}
            <Card className="shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Shared Notes
                </CardTitle>
                <CardDescription>Collaborate on notes with other viewers</CardDescription>
              </CardHeader>
              <CardContent>
                <CollaborativeNotes
                  value={notes}
                  onChange={updateNotes}
                  lastEditedBy={null}
                  currentUserName={userInfo.name}
                />
              </CardContent>
            </Card>

            {/* Share Information */}
            {shareInfo && (
              <Card className="shadow-xl">
                <CardHeader>
                  <CardTitle>Share Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-white/60 mb-1">Shared on</p>
                      <p className="text-white">{formatDate(new Date(shareInfo.created_at))}</p>
                    </div>
                    <div>
                      <p className="text-white/60 mb-1">Expires</p>
                      <p className="text-white">
                        {shareInfo.expires_at ? formatDate(new Date(shareInfo.expires_at)) : "Never"}
                      </p>
                    </div>
                    <div>
                      <p className="text-white/60 mb-1">Access count</p>
                      <p className="text-white">{shareInfo.access_count} views</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
