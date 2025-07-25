"use client";

import { formatDistanceToNow } from "date-fns";
import { User, Clock, Calendar } from "lucide-react";
import type { ParticipantStats } from "@/lib/services/analytics";

interface ParticipantsListProps {
  participants: ParticipantStats[];
}

export function ParticipantsList({ participants }: ParticipantsListProps) {
  if (participants.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-white/40">
        <User className="w-12 h-12 mb-2" />
        <p>No participants recorded yet</p>
      </div>
    );
  }

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  return (
    <div className="space-y-3 max-h-64 overflow-y-auto">
      {participants.map((participant, index) => (
        <div
          key={participant.name}
          className="flex items-center justify-between p-3 rounded-lg bg-white/[0.03] hover:bg-white/[0.05] transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500/20 to-cyan-500/20 flex items-center justify-center">
                <span className="text-sm font-semibold gradient-text">{index + 1}</span>
              </div>
            </div>

            <div>
              <p className="font-medium text-white/90">{participant.name}</p>
              <div className="flex items-center gap-3 text-xs text-white/50 mt-0.5">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {participant.count} meeting{participant.count !== 1 ? "s" : ""}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formatDuration(participant.totalDuration)}
                </span>
              </div>
            </div>
          </div>

          {participant.lastMeeting && (
            <p className="text-xs text-white/40">
              {formatDistanceToNow(new Date(participant.lastMeeting), { addSuffix: true })}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
