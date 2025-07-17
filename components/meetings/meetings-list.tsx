"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useMeetings } from "@/hooks/use-meetings";
import { useMeetingFilters } from "@/hooks/use-meeting-filters";
import { MeetingCard } from "./meeting-card";
import { EditMeetingDialog } from "./edit-meeting-dialog";
import { MeetingFilters } from "./meeting-filters";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Database } from "@/types/supabase";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";

type Meeting = Database["public"]["Tables"]["meetings"]["Row"];

interface MeetingsListProps {
  userEmail: string;
}

export function MeetingsList({ userEmail }: MeetingsListProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const toast = useToast();
  const { data: meetings, isLoading, error } = useMeetings();
  const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null);

  const { searchTerm, setSearchTerm, dateRange, setDateRange, filteredMeetings, clearFilters, hasActiveFilters } =
    useMeetingFilters(meetings);

  const handleView = (meeting: Meeting) => {
    router.push(`/dashboard/meetings/${meeting.id}`);
  };

  const handleEdit = (meeting: Meeting) => {
    setEditingMeeting(meeting);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this meeting?")) return;

    try {
      const response = await fetch(`/api/meetings/${id}`, { method: "DELETE" });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete");
      }

      queryClient.invalidateQueries({ queryKey: ["meetings"] });
      toast.success("Meeting deleted successfully");
    } catch (error) {
      console.error("Failed to delete meeting:", error);
      toast.error(error instanceof Error ? error.message : "Failed to delete meeting");
    }
  };

  return (
    <>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Your Meetings</h1>
          <p className="mt-2 text-gray-600">
            Welcome back, {userEmail}!
            {meetings && meetings.length > 0 && <span className="ml-2">• {meetings.length} total meetings</span>}
          </p>
        </div>
        <Link href="/dashboard/upload">
          <Button>Upload Recording</Button>
        </Link>
      </div>

      {isLoading && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-48 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      )}

      {error && <div className="text-center py-8 text-red-600">Failed to load meetings. Please try again.</div>}

      {!isLoading && !error && meetings && (
        <>
          <MeetingFilters
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
            onClearFilters={clearFilters}
          />

          {filteredMeetings.length === 0 ? (
            <div className="text-center py-12">
              {hasActiveFilters ? (
                <>
                  <p className="text-gray-500 mb-4">No meetings match your filters.</p>
                  <Button variant="outline" onClick={clearFilters}>
                    Clear filters
                  </Button>
                </>
              ) : (
                <>
                  <p className="text-gray-500 mb-4">No meetings yet.</p>
                  <p className="text-sm text-gray-400">Click &quot;Upload Recording&quot; above to get started.</p>
                </>
              )}
            </div>
          ) : (
            <>
              <div className="mb-4 text-sm text-gray-600">
                Showing {filteredMeetings.length} of {meetings.length} meetings
              </div>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredMeetings.map((meeting) => (
                  <MeetingCard
                    key={meeting.id}
                    meeting={meeting}
                    onView={handleView}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            </>
          )}
        </>
      )}

      {editingMeeting && (
        <EditMeetingDialog
          meeting={editingMeeting}
          isOpen={true}
          onClose={() => setEditingMeeting(null)}
          onUpdate={() => {
            queryClient.invalidateQueries({ queryKey: ["meetings"] });
            setEditingMeeting(null);
          }}
        />
      )}
    </>
  );
}
