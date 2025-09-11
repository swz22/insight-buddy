"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useMeetings, useDeleteMeeting } from "@/hooks/use-meetings";
import { useMeetingFilters } from "@/hooks/use-meeting-filters";
import { MeetingCard } from "./meeting-card";
import { EditMeetingDialog } from "./edit-meeting-dialog";
import { MeetingFilters } from "./meeting-filters";
import { EmptyStateGuide } from "@/components/onboarding/empty-state-guide";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Database } from "@/types/supabase";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { FileText, Plus } from "lucide-react";
import { SkeletonCard } from "@/components/ui/skeleton";
import { VirtualMeetingsList } from "@/components/meetings/virtual-meetings-list";
import { useMeetingsRealtime } from "@/hooks/use-meetings-realtime";
import { useAuth } from "@/hooks/use-auth";

type Meeting = Database["public"]["Tables"]["meetings"]["Row"];

interface MeetingsListProps {
  userEmail: string;
}

export function MeetingsList({ userEmail }: MeetingsListProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const toast = useToast();
  const { user } = useAuth();
  const { data: meetings, isLoading, error } = useMeetings();
  const deleteMeeting = useDeleteMeeting();
  const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null);

  useMeetingsRealtime({
    userId: user?.id,
    enabled: !!user?.id,
  });

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

  const handleShare = (meeting: Meeting) => {
    router.push(`/dashboard/meetings/${meeting.id}`);
  };

  const handleUpdate = (updatedMeeting: Meeting) => {
    queryClient.setQueryData<Meeting[]>(["meetings"], (old) =>
      old ? old.map((m) => (m.id === updatedMeeting.id ? updatedMeeting : m)) : []
    );
  };

  if (error) {
    return (
      <Card className="bg-red-500/10 border-red-500/20">
        <CardContent className="p-6">
          <p className="text-red-400">Failed to load meetings</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold font-display text-white mb-2">
          Your <span className="gradient-text">Meetings</span>
        </h1>
        <p className="text-white/60">Welcome back, {userEmail}</p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : !meetings || meetings.length === 0 ? (
        <EmptyStateGuide />
      ) : (
        <>
          <MeetingFilters
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
            hasActiveFilters={hasActiveFilters}
            onClearFilters={clearFilters}
          />

          {filteredMeetings.length === 0 ? (
            <Card className="bg-white/[0.02] border-white/10">
              <CardContent className="p-12 text-center">
                <FileText className="w-12 h-12 text-white/20 mx-auto mb-4" />
                <p className="text-white/60 mb-2">No meetings match your filters</p>
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  Clear filters
                </Button>
              </CardContent>
            </Card>
          ) : (
            <VirtualMeetingsList
              meetings={filteredMeetings}
              onView={handleView}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onShare={handleShare}
            />
          )}
        </>
      )}

      {editingMeeting && (
        <EditMeetingDialog
          meeting={editingMeeting}
          isOpen={!!editingMeeting}
          onClose={() => setEditingMeeting(null)}
          onUpdate={handleUpdate}
        />
      )}
    </div>
  );
}