"use client";

import { formatDistanceToNow } from "date-fns";
import { Clock, Users, FileText, Play, Pause } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Database } from "@/types/supabase";
import { useState, useRef } from "react";

type Meeting = Database["public"]["Tables"]["meetings"]["Row"];

interface MeetingCardProps {
  meeting: Meeting;
  onView: (meeting: Meeting) => void;
  onEdit: (meeting: Meeting) => void;
  onDelete: (id: string) => void;
}

export function MeetingCard({ meeting, onView, onEdit, onDelete }: MeetingCardProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

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

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <Card className="group cursor-pointer hover:-translate-y-1">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg text-white group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-purple-400 group-hover:to-cyan-400 transition-all duration-300">
          {meeting.title}
        </CardTitle>
        <CardDescription className="text-white/60">
          {meeting.recorded_at && formatDistanceToNow(new Date(meeting.recorded_at), { addSuffix: true })}
        </CardDescription>
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
          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            <Button
              size="sm"
              variant="ghost"
              onClick={handlePlayPause}
              className="w-8 h-8 p-0 hover:bg-white/10 hover:text-cyan-400 transition-colors"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </Button>

            <div className="flex-1 h-1.5 bg-white/10 rounded-full relative overflow-hidden group/progress">
              <div
                className="absolute left-0 top-0 h-full bg-gradient-to-r from-purple-500 to-cyan-500 transition-all duration-200 group-hover/progress:shadow-[0_0_10px_rgba(168,85,247,0.5)]"
                style={{ width: `${progress}%` }}
              />
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

        <div className="flex gap-2 pt-2">
          <Button
            size="sm"
            variant="glow"
            onClick={(e) => {
              e.stopPropagation();
              onView(meeting);
            }}
            className="flex-1 shadow-md"
          >
            View Details
          </Button>
          <Button
            size="sm"
            variant="glass"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(meeting);
            }}
            className="hover:bg-purple-500/10 hover:border-purple-400/50 hover:text-purple-300"
          >
            Edit
          </Button>
          <Button
            size="sm"
            variant="glass"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(meeting.id);
            }}
            className="hover:bg-red-500/10 hover:border-red-400/50 hover:text-red-300"
          >
            Delete
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
