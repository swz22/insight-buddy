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
import { FileText } from "lucide-react";

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
      <div className="flex justify-between items-center mb-8 animate-fade-in">
        <div>
          <h1 className="text-4xl font-bold font-display text-white mb-2">
            Your <span className="gradient-text">Meetings</span>
          </h1>
          <p className="text-white/60">
            Welcome back, <span className="text-white/90 font-medium">{userEmail}</span>
            {meetings && meetings.length > 0 && (
              <span className="text-white/50 ml-2">• {meetings.length} total meetings</span>
            )}
          </p>
        </div>
        <Link href="/dashboard/upload">
          <Button variant="glow" size="lg" className="font-medium shadow-lg shadow-purple-500/25">
            Upload Recording
          </Button>
        </Link>
      </div>

      {isLoading && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-56 glass rounded-xl skeleton-gradient animate-pulse" />
          ))}
        </div>
      )}

      {error && <div className="text-center py-8 text-red-400">Failed to load meetings. Please try again.</div>}

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
            <div className="text-center py-16 animate-fade-in">
              <div className="glass rounded-2xl p-12 max-w-md mx-auto">
                {hasActiveFilters ? (
                  <>
                    <p className="text-white/60 mb-6 text-lg">No meetings match your filters.</p>
                    <Button variant="outline" onClick={clearFilters} className="hover:border-cyan-500/60">
                      Clear filters
                    </Button>
                  </>
                ) : (
                  <>
                    <div className="w-16 h-16 rounded-full bg-gradient-to-r from-purple-500/20 to-cyan-500/20 flex items-center justify-center mx-auto mb-6">
                      <FileText className="w-8 h-8 text-white/40" />
                    </div>
                    <p className="text-white/60 mb-2 text-lg">No meetings yet.</p>
                    <p className="text-sm text-white/50">Click "Upload Recording" above to get started.</p>
                  </>
                )}
              </div>
            </div>
          ) : (
            <>
              <div className="mb-4 text-sm text-white/50 animate-fade-in">
                Showing {filteredMeetings.length} of {meetings.length} meetings
              </div>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 animate-fade-in">
                {filteredMeetings.map((meeting, index) => (
                  <div
                    key={meeting.id}
                    style={{
                      animationDelay: `${index * 50}ms`,
                    }}
                    className="animate-fade-in"
                  >
                    <MeetingCard meeting={meeting} onView={handleView} onEdit={handleEdit} onDelete={handleDelete} />
                  </div>
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
