"use client";

import { formatDistanceToNow } from "date-fns";
import { Clock, Users, FileText } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function MeetingCard({ meeting, onView, onDelete }) {
  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <CardTitle className="text-lg">{meeting.title}</CardTitle>
        <CardDescription>
          {meeting.recordedAt && formatDistanceToNow(new Date(meeting.recordedAt), { addSuffix: true })}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-600 mb-4">{meeting.description || "No description provided"}</p>

        <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
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

        <div className="flex gap-2">
          <Button size="sm" onClick={() => onView(meeting)}>
            View Details
          </Button>
          <Button size="sm" variant="outline" onClick={() => onDelete(meeting.id)}>
            Delete
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
