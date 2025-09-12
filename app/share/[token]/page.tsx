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
      const response = await fetch(`/api/public/shares/${token}`, {
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
      }
    } finally {
      setIsVerifying(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-6 text-center">
            <p className="text-red-400 mb-4">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (requiresPassword) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5" />
              Password Protected
            </CardTitle>
            <CardDescription>This meeting requires a password to access</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <Input
                type="password"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isVerifying}
                autoFocus
              />
              <Button type="submit" className="w-full" disabled={isVerifying || !password}>
                {isVerifying ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Lock className="w-4 h-4 mr-2" />}
                {isVerifying ? "Verifying..." : "Access Meeting"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!hasJoined) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>Join Meeting</CardTitle>
            <CardDescription>Enter your name to join the collaborative session</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              placeholder="Your name"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && userName.trim()) {
                  setHasJoined(true);
                }
              }}
              autoFocus
            />
            <Button
              onClick={() => setHasJoined(true)}
              className="w-full"
              disabled={!userName.trim()}
            >
              <Users className="w-4 h-4 mr-2" />
              Join Meeting
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!meeting) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <p className="text-white/60">Meeting not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <div className="sticky top-0 z-30 bg-black/80 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-white">{meeting.title}</h1>
              <div className="flex items-center gap-4 mt-2 text-sm text-white/60">
                {meeting.recorded_at && (
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {formatDateShort(new Date(meeting.recorded_at))}
                  </span>
                )}
                {meeting.duration && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {Math.round(meeting.duration / 60)} min
                  </span>
                )}
                {meeting.participants?.length > 0 && (
                  <span className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    {meeting.participants.length} participants
                  </span>
                )}
              </div>
            </div>
            <PresenceAvatars users={allUsers} maxDisplay={5} />
          </div>

          {meeting.audio_url && (
            <div className="mb-4">
              <AudioPlayer audioUrl={meeting.audio_url} mini />
            </div>
          )}

          <div className="flex gap-2">
            {["transcript", "summary", "actions"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                  activeTab === tab
                    ? "bg-purple-600 text-white"
                    : "text-white/60 hover:text-white hover:bg-white/10"
                )}
              >
                {tab === "transcript" && <FileText className="w-4 h-4 inline mr-2" />}
                {tab === "summary" && <Lightbulb className="w-4 h-4 inline mr-2" />}
                {tab === "actions" && <ListChecks className="w-4 h-4 inline mr-2" />}
                {tab.charAt(0).toUpperCase() + tab.slice(1).replace("-", " ")}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            {activeTab === "transcript" && (
              <div className="transcript-container">
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
                  <Card>
                    <CardContent className="p-12 text-center">
                      <FileText className="w-12 h-12 text-white/20 mx-auto mb-4" />
                      <p className="text-white/60">No transcript available</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {activeTab === "summary" && (
              <Card>
                <CardContent className="p-6">
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
                </CardContent>
              </Card>
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
                              <p className="text-white mb-2">{item.task}</p>
                              <div className="flex gap-4 text-sm text-white/60">
                                {item.assignee && <span>Assignee: {item.assignee}</span>}
                                {item.due_date && <span>Due: {item.due_date}</span>}
                                <span className="capitalize">Priority: {item.priority || "low"}</span>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Card>
                    <CardContent className="p-12 text-center">
                      <ListChecks className="w-12 h-12 text-white/20 mx-auto mb-4" />
                      <p className="text-white/60">No action items available</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </div>

          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Collaborative Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <CollaborativeNotes
                  notes={notes}
                  onUpdateNotes={updateNotes}
                  currentUserName={userInfo.name}
                  currentUserColor={userInfo.color}
                />
              </CardContent>
            </Card>

            {shareInfo && (
              <Card className="bg-white/5">
                <CardHeader>
                  <CardTitle className="text-sm">Share Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-white/60">Created</span>
                    <span>{formatDate(new Date(shareInfo.created_at))}</span>
                  </div>
                  {shareInfo.expires_at && (
                    <div className="flex justify-between">
                      <span className="text-white/60">Expires</span>
                      <span>{formatDate(new Date(shareInfo.expires_at))}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-white/60">Views</span>
                    <span>{shareInfo.access_count}</span>
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