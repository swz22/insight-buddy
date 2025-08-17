"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useMeetings, useDeleteMeeting } from "@/hooks/use-meetings";
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
import { SkeletonCard } from "@/components/ui/skeleton";
import { VirtualMeetingsList } from "@/components/meetings/virtual-meetings-list";

type Meeting = Database["public"]["Tables"]["meetings"]["Row"];

interface MeetingsListProps {
  userEmail: string;
}

export function MeetingsList({ userEmail }: MeetingsListProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const toast = useToast();
  const { data: meetings, isLoading, error } = useMeetings();
  const deleteMeeting = useDeleteMeeting();
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
      await deleteMeeting.mutateAsync(id);
      toast.success("Meeting deleted successfully");
    } catch (error) {
      console.error("Failed to delete meeting:", error);
      toast.error(error instanceof Error ? error.message : "Failed to delete meeting");
    }
  };

  const handleShareClick = (e: React.MouseEvent, meeting: Meeting) => {
    e.stopPropagation();
    router.push(`/dashboard/meetings/${meeting.id}?share=true`);
  };

  const handleShare = (meeting: Meeting) => {
    router.push(`/dashboard/meetings/${meeting.id}?share=true`);
  };

  const handleUpdateSuccess = (updatedMeeting: Meeting) => {
    queryClient.invalidateQueries({ queryKey: ["meetings"] });
    setEditingMeeting(null);
    toast.success("Meeting updated successfully");
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-display gradient-text">Meetings</h1>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500">Failed to load meetings</p>
        <Button variant="glass" className="mt-4" onClick={() => router.refresh()}>
          Try Again
        </Button>
      </div>
    );
  }

  const displayMeetings = filteredMeetings || meetings || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display gradient-text">Meetings</h1>
          <p className="text-white/60 mt-1">Logged in as {userEmail}</p>
        </div>
        <Button variant="glow" size="lg" asChild className="shadow-lg hover:shadow-cyan-500/20">
          <Link href="/dashboard/upload">Upload Meeting</Link>
        </Button>
      </div>

      <MeetingFilters
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        onClearFilters={clearFilters}
      />

      {displayMeetings.length === 0 ? (
        <Card className="p-12 text-center">
          <FileText className="w-16 h-16 mx-auto mb-4 text-white/20" />
          <h3 className="text-xl font-semibold mb-2">
            {hasActiveFilters ? "No meetings match your filters" : "No meetings yet"}
          </h3>
          <p className="text-white/60 mb-6">
            {hasActiveFilters ? "Try adjusting your search criteria" : "Upload your first meeting to get started"}
          </p>
          {hasActiveFilters ? (
            <Button variant="glass" onClick={clearFilters}>
              Clear Filters
            </Button>
          ) : (
            <Button variant="glow" asChild>
              <Link href="/dashboard/upload">Upload Your First Meeting</Link>
            </Button>
          )}
        </Card>
      ) : (
        <VirtualMeetingsList
          meetings={displayMeetings}
          onView={handleView}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onShare={handleShare}
        />
      )}

      {editingMeeting && (
        <EditMeetingDialog
          meeting={editingMeeting}
          isOpen={!!editingMeeting}
          onClose={() => setEditingMeeting(null)}
          onUpdate={handleUpdateSuccess}
        />
      )}
    </div>
  );
}
