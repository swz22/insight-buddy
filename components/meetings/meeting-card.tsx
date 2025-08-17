"use client";

import { formatDistanceToNow } from "date-fns";
import { Clock, Users, FileText, Play, Pause, MoreVertical, Edit2, Share2, Download, Trash2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Database } from "@/types/supabase";
import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Meeting = Database["public"]["Tables"]["meetings"]["Row"];

interface MeetingCardProps {
  meeting: Meeting;
  onView: (meeting: Meeting) => void;
  onEdit: (meeting: Meeting) => void;
  onDelete: (id: string) => void;
  onShare?: (meeting: Meeting) => void;
}

export function MeetingCard({ meeting, onView, onEdit, onDelete, onShare }: MeetingCardProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const handlePlayPause = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (!audioRef.current || !duration) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    const newTime = percentage * duration;

    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleProgressMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    setIsDragging(true);
    handleProgressClick(e);
  };

  const handleProgressMouseMove = (e: MouseEvent) => {
    if (!isDragging || !progressRef.current || !audioRef.current || !duration) return;

    const rect = progressRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const percentage = x / rect.width;
    const newTime = percentage * duration;

    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleProgressMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener("mousemove", handleProgressMouseMove);
      document.addEventListener("mouseup", handleProgressMouseUp);
      return () => {
        document.removeEventListener("mousemove", handleProgressMouseMove);
        document.removeEventListener("mouseup", handleProgressMouseUp);
      };
    }
  }, [isDragging, duration]);

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMenuOpen(false);
    onEdit(meeting);
  };

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMenuOpen(false);
    if (onShare) {
      onShare(meeting);
    } else {
      onView(meeting);
    }
  };

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMenuOpen(false);
    if (meeting.audio_url) {
      const link = document.createElement("a");
      link.href = meeting.audio_url;
      link.download = `${meeting.title.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.mp3`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMenuOpen(false);
    onDelete(meeting.id);
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <Card
      className="cursor-pointer transition-all duration-300 hover:border-white/20 hover:shadow-2xl group relative"
      onClick={() => onView(meeting)}
    >
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg text-white group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-purple-400 group-hover:to-cyan-400 transition-all duration-300">
              {meeting.title}
            </CardTitle>
            <CardDescription className="text-white/60">
              {meeting.recorded_at && formatDistanceToNow(new Date(meeting.recorded_at), { addSuffix: true })}
            </CardDescription>
          </div>
          <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
            <DropdownMenuTrigger asChild>
              <Button
                size="sm"
                variant="ghost"
                onClick={(e) => e.stopPropagation()}
                className="w-7 h-7 p-0 text-white/30 hover:text-white/60 hover:bg-white/[0.05] transition-all duration-200"
              >
                <MoreVertical className="w-3.5 h-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 bg-black/90 backdrop-blur-xl border-white/10">
              <DropdownMenuItem
                onClick={handleEdit}
                className="text-white/70 hover:text-white hover:bg-white/[0.05] cursor-pointer"
              >
                <Edit2 className="w-3.5 h-3.5 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={handleShare}
                className="text-white/70 hover:text-white hover:bg-white/[0.05] cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5 mr-2" />
                Share
              </DropdownMenuItem>
              {meeting.audio_url && (
                <DropdownMenuItem
                  onClick={handleDownload}
                  className="text-white/70 hover:text-white hover:bg-white/[0.05] cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 mr-2" />
                  Download
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator className="bg-white/10" />
              <DropdownMenuItem
                onClick={handleDelete}
                className="text-red-400/80 hover:text-red-400 hover:bg-red-500/10 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-white/70 line-clamp-2">{meeting.description || "No description provided"}</p>

        <div className="flex items-center gap-4 text-sm text-white/60">
          {meeting.duration && (
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              <span>{Math.round(meeting.duration / 60)} min</span>
            </div>
          )}
          {meeting.participants?.length > 0 && (
            <div className="flex items-center gap-1.5">
              <Users className="w-4 h-4" />
              <span>{meeting.participants.length}</span>
            </div>
          )}
          {meeting.transcript && (
            <div className="flex items-center gap-1.5">
              <FileText className="w-4 h-4" />
              <span>Transcribed</span>
            </div>
          )}
        </div>

        {meeting.audio_url && (
          <div className="space-y-1.5">
            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
              <Button
                size="sm"
                variant="ghost"
                onClick={handlePlayPause}
                className="w-8 h-8 p-0 hover:bg-white/10 hover:text-cyan-400 transition-colors"
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </Button>

              <div
                ref={progressRef}
                className="flex-1 h-2 bg-white/10 rounded-full relative overflow-hidden cursor-pointer group/progress hover:h-3 transition-all"
                onClick={handleProgressClick}
                onMouseDown={handleProgressMouseDown}
              >
                <div
                  className="absolute left-0 top-0 h-full bg-gradient-to-r from-purple-500 to-cyan-500 transition-all duration-200 pointer-events-none"
                  style={{ width: `${progress}%` }}
                />
                <div
                  className={cn(
                    "absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-lg transition-all duration-200 pointer-events-none",
                    "opacity-0 group-hover/progress:opacity-100",
                    isDragging && "opacity-100"
                  )}
                  style={{ left: `${progress}%`, transform: "translateX(-50%) translateY(-50%)" }}
                />
              </div>

              <span className="text-xs text-white/40 min-w-[65px] text-right">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>

            <audio
              ref={audioRef}
              src={meeting.audio_url}
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onEnded={() => setIsPlaying(false)}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
