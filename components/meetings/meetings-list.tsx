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

  // Enable Realtime subscriptions for instant updates
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
    queryClient.setQueryData<Meeting>(["meetings", updatedMeeting.id], updatedMeeting);
    setEditingMeeting(null);
  };

  return (
    <>
      <Card className="bg-white/[0.02] backdrop-blur-sm border-white/10 shadow-xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl font-display">
                Your <span className="gradient-text">Meetings</span>
              </CardTitle>
              <CardDescription className="text-white/60 mt-1">Welcome back, {userEmail.split("@")[0]}</CardDescription>
            </div>
            <Link href="/dashboard/upload">
              <Button variant="glow" className="shadow-lg hover:shadow-xl transition-all">
                <FileText className="w-4 h-4 mr-2" />
                New Meeting
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <MeetingFilters
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
            onClearFilters={clearFilters}
            hasActiveFilters={hasActiveFilters}
          />

          {isLoading ? (
            <div className="grid gap-4 mt-6">
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-red-400">Failed to load meetings</p>
              <Button
                onClick={() => queryClient.invalidateQueries({ queryKey: ["meetings"] })}
                className="mt-4"
                variant="outline"
              >
                Retry
              </Button>
            </div>
          ) : filteredMeetings.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-white/20 mx-auto mb-4" />
              {hasActiveFilters ? (
                <>
                  <p className="text-white/60 mb-4">No meetings match your filters</p>
                  <Button onClick={clearFilters} variant="outline" size="sm">
                    Clear Filters
                  </Button>
                </>
              ) : (
                <>
                  <p className="text-white/60 mb-4">No meetings yet</p>
                  <Link href="/dashboard/upload">
                    <Button variant="glow" className="shadow-lg">
                      Upload Your First Meeting
                    </Button>
                  </Link>
                </>
              )}
            </div>
          ) : (
            <div className="mt-6">
              <div className="mb-4 text-sm text-white/50">
                {filteredMeetings.length} {filteredMeetings.length === 1 ? "meeting" : "meetings"}
                {hasActiveFilters && ` (filtered from ${meetings?.length || 0} total)`}
              </div>
              <VirtualMeetingsList
                meetings={filteredMeetings}
                onView={handleView}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onShare={handleShare}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {editingMeeting && (
        <EditMeetingDialog
          meeting={editingMeeting}
          isOpen={true}
          onClose={() => setEditingMeeting(null)}
          onUpdate={handleUpdate}
        />
      )}
    </>
  );
}
