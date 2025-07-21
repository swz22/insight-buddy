"use client";

import { formatDistanceToNow } from "date-fns";
import { Clock, Users, FileText } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Database } from "@/types/supabase";
import { MiniAudioPlayer } from "@/components/audio/mini-audio-player";

type Meeting = Database["public"]["Tables"]["meetings"]["Row"];

interface MeetingCardProps {
  meeting: Meeting;
  onView: (meeting: Meeting) => void;
  onEdit: (meeting: Meeting) => void;
  onDelete: (id: string) => void;
}

export function MeetingCard({ meeting, onView, onEdit, onDelete }: MeetingCardProps) {
  return (
    <Card className="hover:border-white/[0.1] hover:shadow-2xl hover:shadow-purple-500/10 group">
      <CardHeader>
        <CardTitle className="text-lg text-white group-hover:text-white/90">{meeting.title}</CardTitle>
        <CardDescription className="text-white/60">
          {meeting.recorded_at && formatDistanceToNow(new Date(meeting.recorded_at), { addSuffix: true })}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-white/70 mb-4">{meeting.description || "No description provided"}</p>

        <div className="flex items-center gap-4 text-sm text-white/50 mb-4">
          {meeting.duration && (
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              <span>{Math.round(meeting.duration / 60)} min</span>
            </div>
          )}
          {meeting.participants?.length > 0 && (
            <div className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              <span>{meeting.participants.length} participants</span>
            </div>
          )}
          {meeting.transcript && (
            <div className="flex items-center gap-1">
              <FileText className="w-4 h-4" />
              <span>Transcribed</span>
            </div>
          )}
        </div>

        {meeting.audio_url && (
          <div className="mb-4">
            <MiniAudioPlayer url={meeting.audio_url} />
          </div>
        )}

        <div className="flex gap-2">
          <Button size="sm" variant="glow" onClick={() => onView(meeting)}>
            View Details
          </Button>
          <Button size="sm" variant="glass" onClick={() => onEdit(meeting)}>
            Edit
          </Button>
          <Button size="sm" variant="glass" onClick={() => onDelete(meeting.id)}>
            Delete
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
