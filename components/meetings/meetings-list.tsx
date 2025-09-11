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

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold font-display text-white">
              Your <span className="gradient-text">Meetings</span>
            </h1>
            <p className="text-white/60 mt-2">Welcome back, {userEmail}</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="p-8 text-center">
        <CardContent>
          <p className="text-red-400 mb-4">Failed to load meetings</p>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </CardContent>
      </Card>
    );
  }

  if (!meetings || meetings.length === 0) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="text-center">
          <h1 className="text-4xl font-bold font-display text-white mb-2">
            Your <span className="gradient-text">Meetings</span>
          </h1>
          <p className="text-white/60">Welcome back, {userEmail}</p>
        </div>
        <EmptyStateGuide />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold font-display text-white">
            Your <span className="gradient-text">Meetings</span>
          </h1>
          <p className="text-white/60 mt-2">Welcome back, {userEmail}</p>
        </div>
        <Link href="/dashboard/upload">
          <Button variant="glow" className="gap-2">
            <Plus className="w-4 h-4" />
            New Meeting
          </Button>
        </Link>
      </div>

      <MeetingFilters
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        onClearFilters={clearFilters}
        hasActiveFilters={hasActiveFilters}
      />

      {filteredMeetings.length === 0 ? (
        <Card className="p-12 text-center">
          <CardContent>
            <FileText className="w-12 h-12 text-white/20 mx-auto mb-4" />
            <p className="text-white/60 mb-4">No meetings found matching your filters</p>
            {hasActiveFilters && (
              <Button variant="outline" onClick={clearFilters}>
                Clear Filters
              </Button>
            )}
          </CardContent>
        </Card>
      ) : filteredMeetings.length <= 9 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMeetings.map((meeting) => (
            <MeetingCard
              key={meeting.id}
              meeting={meeting}
              onView={handleView}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onShare={handleShare}
            />
          ))}
        </div>
      ) : (
        <VirtualMeetingsList
          meetings={filteredMeetings}
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
          onUpdate={handleUpdate}
        />
      )}

      <div className="text-center text-sm text-white/40 pt-4">
        {filteredMeetings.length} of {meetings.length} meetings
      </div>
    </div>
  );
}