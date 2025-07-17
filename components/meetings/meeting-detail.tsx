"use client";

import { useState } from "react";
import { format } from "date-fns";
import { ArrowLeft, Clock, Users, Download, FileText, ListChecks, Lightbulb, Edit2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Database } from "@/types/supabase";
import { EditMeetingDialog } from "./edit-meeting-dialog";

type Meeting = Database["public"]["Tables"]["meetings"]["Row"];

interface MeetingDetailProps {
  meeting: Meeting;
}

export function MeetingDetail({ meeting: initialMeeting }: MeetingDetailProps) {
  const [meeting, setMeeting] = useState(initialMeeting);
  const [activeTab, setActiveTab] = useState<"transcript" | "summary" | "actions">("transcript");
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return "N/A";
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center text-gray-600 hover:text-gray-900">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to meetings
        </Link>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setIsEditDialogOpen(true)}>
            <Edit2 className="w-4 h-4 mr-2" />
            Edit
          </Button>
          {meeting.audio_url && (
            <Button variant="outline" size="sm" asChild>
              <a href={meeting.audio_url} download>
                <Download className="w-4 h-4 mr-2" />
                Download
              </a>
            </Button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h1 className="text-2xl font-bold mb-2">{meeting.title}</h1>
        {meeting.description && <p className="text-gray-600 mb-4">{meeting.description}</p>}

        <div className="flex flex-wrap gap-4 text-sm text-gray-500">
          {meeting.recorded_at && (
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              <span>{format(new Date(meeting.recorded_at), "PPP 'at' p")}</span>
            </div>
          )}
          {meeting.duration && (
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              <span>{formatDuration(meeting.duration)}</span>
            </div>
          )}
          {meeting.participants && meeting.participants.length > 0 && (
            <div className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              <span>{meeting.participants.join(", ")}</span>
            </div>
          )}
        </div>
      </div>

      {meeting.audio_url && (
        <Card>
          <CardHeader>
            <CardTitle>Recording</CardTitle>
          </CardHeader>
          <CardContent>
            <audio controls className="w-full">
              <source src={meeting.audio_url} type="audio/mpeg" />
              <source src={meeting.audio_url} type="audio/wav" />
              <source src={meeting.audio_url} type="video/mp4" />
              Your browser does not support the audio element.
            </audio>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab("transcript")}
              className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
                activeTab === "transcript" ? "bg-primary text-primary-foreground" : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <FileText className="w-4 h-4" />
              Transcript
            </button>
            <button
              onClick={() => setActiveTab("summary")}
              className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
                activeTab === "summary" ? "bg-primary text-primary-foreground" : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <Lightbulb className="w-4 h-4" />
              Summary
            </button>
            <button
              onClick={() => setActiveTab("actions")}
              className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
                activeTab === "actions" ? "bg-primary text-primary-foreground" : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <ListChecks className="w-4 h-4" />
              Action Items
            </button>
          </div>
        </CardHeader>
        <CardContent>
          {activeTab === "transcript" && (
            <div className="prose max-w-none">
              {meeting.transcript ? (
                <div className="whitespace-pre-wrap text-gray-700">{meeting.transcript}</div>
              ) : (
                <p className="text-gray-500 italic">Transcript will be available after AI processing is complete.</p>
              )}
            </div>
          )}

          {activeTab === "summary" && (
            <div className="space-y-4">
              {meeting.summary ? (
                <>
                  <div>
                    <h3 className="font-semibold mb-2">Overview</h3>
                    <p className="text-gray-700">{meeting.summary.overview}</p>
                  </div>
                  {meeting.summary.key_points.length > 0 && (
                    <div>
                      <h3 className="font-semibold mb-2">Key Points</h3>
                      <ul className="list-disc list-inside space-y-1">
                        {meeting.summary.key_points.map((point, index) => (
                          <li key={index} className="text-gray-700">
                            {point}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {meeting.summary.decisions.length > 0 && (
                    <div>
                      <h3 className="font-semibold mb-2">Decisions Made</h3>
                      <ul className="list-disc list-inside space-y-1">
                        {meeting.summary.decisions.map((decision, index) => (
                          <li key={index} className="text-gray-700">
                            {decision}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {meeting.summary.next_steps.length > 0 && (
                    <div>
                      <h3 className="font-semibold mb-2">Next Steps</h3>
                      <ul className="list-disc list-inside space-y-1">
                        {meeting.summary.next_steps.map((step, index) => (
                          <li key={index} className="text-gray-700">
                            {step}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-gray-500 italic">Summary will be available after AI processing is complete.</p>
              )}
            </div>
          )}

          {activeTab === "actions" && (
            <div className="space-y-3">
              {meeting.action_items && meeting.action_items.length > 0 ? (
                meeting.action_items.map((item) => (
                  <div
                    key={item.id}
                    className={`p-4 rounded-lg border ${
                      item.completed ? "bg-gray-50 border-gray-200" : "bg-white border-gray-300"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className={`font-medium ${item.completed ? "text-gray-500 line-through" : "text-gray-900"}`}>
                          {item.task}
                        </p>
                        <div className="flex gap-4 mt-2 text-sm text-gray-500">
                          {item.assignee && (
                            <span>
                              Assigned to: <strong>{item.assignee}</strong>
                            </span>
                          )}
                          {item.due_date && (
                            <span>
                              Due: <strong>{format(new Date(item.due_date), "PPP")}</strong>
                            </span>
                          )}
                        </div>
                      </div>
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${
                          item.priority === "high"
                            ? "bg-red-100 text-red-700"
                            : item.priority === "medium"
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-green-100 text-green-700"
                        }`}
                      >
                        {item.priority}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 italic">Action items will be extracted after AI processing is complete.</p>
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
