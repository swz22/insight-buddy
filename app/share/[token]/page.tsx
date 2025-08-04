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

  const getUserColor = (name: string) => {
    const colors = ["#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#DDA0DD", "#F4A460", "#98D8C8", "#6C5CE7"];
    const index = name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
    return colors[index];
  };

  const userInfo = {
    name: userName || "Anonymous",
    color: getUserColor(userName || "Anonymous"),
    sessionId,
  };

  const {
    presence,
    annotations,
    notes,
    lastEditedBy,
    isConnected,
    addHighlight,
    addComment,
    deleteAnnotation,
    editAnnotation,
    updateNotes,
    updateStatus,
  } = useCollaboration(meeting?.id || "", token, userInfo);

  useEffect(() => {
    if (hasJoined && meeting) {
      const savedName = sessionStorage.getItem(`share-${token}-name`);
      if (savedName && !userName) {
        setUserName(savedName);
      }
    }
  }, [hasJoined, meeting, token, userName]);

  const fetchSharedMeeting = async (passwordAttempt?: string) => {
    try {
      const url = passwordAttempt ? `/api/public/shares/${token}` : `/api/public/shares/${token}`;

      const response = await fetch(url, {
        method: passwordAttempt ? "POST" : "GET",
        headers: passwordAttempt ? { "Content-Type": "application/json" } : {},
        body: passwordAttempt ? JSON.stringify({ password: passwordAttempt }) : undefined,
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to access meeting");
        return;
      }

      if (data.requiresPassword && !passwordAttempt) {
        setRequiresPassword(true);
      } else {
        setMeeting(data.meeting);
        setShareInfo(data.share);
        setRequiresPassword(false);
        setError(null);

        if (typeof window !== "undefined") {
          sessionStorage.setItem(`share-${token}-auth`, "true");
        }
      }
    } catch (err) {
      setError("Failed to load meeting. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSharedMeeting();
  }, [token]);

  const verifyPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsVerifying(true);
    setError(null);

    try {
      await fetchSharedMeeting(password);
      const savedName = sessionStorage.getItem(`share-${token}-name`);
      if (savedName) {
        setUserName(savedName);
        setHasJoined(true);
      }
    } catch (err) {
      setError("Incorrect password. Please try again.");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleJoinMeeting = (e: React.FormEvent) => {
    e.preventDefault();
    const nameToUse = userName.trim() || "Anonymous";
    setUserName(nameToUse);
    setHasJoined(true);

    if (typeof window !== "undefined") {
      sessionStorage.setItem(`share-${token}-name`, nameToUse);
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

  if (typeof window !== "undefined" && !requiresPassword && !meeting) {
    const hasAuth = sessionStorage.getItem(`share-${token}-auth`);
    if (hasAuth) {
      fetchSharedMeeting();
    }
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
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
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

  if (meeting && !hasJoined) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-display">
              Join <span className="gradient-text">Meeting</span>
            </CardTitle>
            <CardDescription>Enter your name to collaborate on this meeting</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleJoinMeeting} className="space-y-4">
              <Input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="Your name (optional)"
                className="bg-white/[0.03] border-white/20"
                autoFocus
              />
              <Button type="submit" variant="glow" className="w-full">
                Join Meeting
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!meeting) return null;

  return (
    <div className="min-h-screen bg-black">
      <div className="relative">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-20 left-20 w-72 h-72 bg-purple-600 rounded-full filter blur-[128px] opacity-20 animate-pulse"></div>
          <div className="absolute top-40 right-20 w-96 h-96 bg-cyan-600 rounded-full filter blur-[128px] opacity-20 animate-pulse"></div>
        </div>

        <div className="relative z-10 p-8">
          <div className="max-w-6xl mx-auto space-y-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-3xl font-bold font-display mb-2">
                  <span className="gradient-text">{meeting.title}</span>
                </h1>
                {meeting.description && <p className="text-white/60">{meeting.description}</p>}
              </div>
              <PresenceAvatars presence={presence} currentUser={userInfo.name} />
            </div>

            <div className="flex flex-wrap gap-4 text-sm text-white/60">
              {meeting.recorded_at && (
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  {format(new Date(meeting.recorded_at), "PPP")}
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

            {meeting.audio_url && (
              <Card className="shadow-xl">
                <CardContent className="p-6">
                  <AudioPlayer url={meeting.audio_url} />
                </CardContent>
              </Card>
            )}

            <div className="flex gap-2 mb-6">
              {(["transcript", "summary", "actions"] as const).map((tab) => (
                <Button
                  key={tab}
                  variant={activeTab === tab ? "glow" : "ghost"}
                  size="sm"
                  onClick={() => setActiveTab(tab)}
                  className={cn("capitalize", activeTab === tab && "shadow-lg shadow-purple-500/20")}
                >
                  {tab === "actions" ? "Action Items" : tab}
                </Button>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
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
                          <>
                            <div>
                              <h3 className="text-lg font-semibold mb-2">Overview</h3>
                              <p className="text-white/80">{meeting.summary.overview}</p>
                            </div>

                            {meeting.summary.key_points?.length > 0 && (
                              <div>
                                <h3 className="text-lg font-semibold mb-2">Key Points</h3>
                                <ul className="list-disc list-inside space-y-2">
                                  {meeting.summary.key_points.map((point: string, index: number) => (
                                    <li key={index} className="text-white/80">
                                      {point}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {meeting.summary.decisions?.length > 0 && (
                              <div>
                                <h3 className="text-lg font-semibold mb-2">Decisions</h3>
                                <ul className="list-disc list-inside space-y-2">
                                  {meeting.summary.decisions.map((decision: string, index: number) => (
                                    <li key={index} className="text-white/80">
                                      {decision}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {meeting.summary.next_steps?.length > 0 && (
                              <div>
                                <h3 className="text-lg font-semibold mb-2">Next Steps</h3>
                                <ul className="list-disc list-inside space-y-2">
                                  {meeting.summary.next_steps.map((step: string, index: number) => (
                                    <li key={index} className="text-white/80">
                                      {step}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="text-center py-12">
                            <FileText className="w-12 h-12 text-white/20 mx-auto mb-4" />
                            <p className="text-white/60">No summary available</p>
                          </div>
                        )}
                      </div>
                    )}

                    {activeTab === "actions" && (
                      <div className="space-y-4">
                        {meeting.action_items && meeting.action_items.length > 0 ? (
                          <div className="space-y-3">
                            {meeting.action_items.map((item: any, index: number) => (
                              <div
                                key={item.id || index}
                                className="p-4 rounded-lg bg-white/[0.03] border border-white/10"
                              >
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <p className="text-white/90">{item.task}</p>
                                    <div className="flex gap-4 mt-2 text-sm text-white/60">
                                      {item.assignee && <span>Assigned to: {item.assignee}</span>}
                                      {item.due_date && <span>Due: {format(new Date(item.due_date), "PP")}</span>}
                                    </div>
                                  </div>
                                  <span
                                    className={cn(
                                      "px-3 py-1 rounded-full text-xs font-medium",
                                      item.priority === "high" && "bg-red-500/20 text-red-400",
                                      item.priority === "medium" && "bg-yellow-500/20 text-yellow-400",
                                      item.priority === "low" && "bg-green-500/20 text-green-400"
                                    )}
                                  >
                                    {item.priority}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-12">
                            <FileText className="w-12 h-12 text-white/20 mx-auto mb-4" />
                            <p className="text-white/60">No action items available</p>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-6">
                <CollaborativeNotes
                  value={notes}
                  onChange={updateNotes}
                  lastEditedBy={lastEditedBy}
                  currentUserName={userInfo.name}
                  onFocus={() => updateStatus("typing")}
                  onBlur={() => updateStatus("active")}
                />

                {shareInfo && (
                  <Card className="shadow-xl">
                    <CardHeader>
                      <CardTitle className="text-lg">Share Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <div>
                        <span className="text-white/60">Created:</span> {format(new Date(shareInfo.created_at), "PP")}
                      </div>
                      {shareInfo.expires_at && (
                        <div>
                          <span className="text-white/60">Expires:</span> {format(new Date(shareInfo.expires_at), "PP")}
                        </div>
                      )}
                      <div>
                        <span className="text-white/60">Views:</span> {shareInfo.access_count}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
