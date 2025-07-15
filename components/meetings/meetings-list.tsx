"use client";

import { Button } from "@/components/ui/button";
import { useMeetings } from "@/hooks/use-meetings";
import { MeetingCard } from "./meeting-card";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Database } from "@/types/supabase";

type Meeting = Database["public"]["Tables"]["meetings"]["Row"];

export function MeetingsList() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: meetings, isLoading, error } = useMeetings();

  const handleView = (meeting: Meeting) => {
    router.push(`/dashboard/meetings/${meeting.id}`);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this meeting?")) return;

    try {
      const response = await fetch(`/api/meetings/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Failed to delete");
      
      // Invalidate and refetch the meetings query
      queryClient.invalidateQueries({ queryKey: ["meetings"] });
    } catch (error) {
      console.error("Failed to delete meeting:", error);
      alert("Failed to delete meeting. Please try again.");
    }
  };

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-48 bg-gray-100 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (error) {
    return <div className="text-center py-8 text-red-600">Failed to load meetings. Please try again.</div>;
  }

  if (!meetings?.length) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500 mb-4">No meetings yet.</p>
        <Button onClick={() => router.push("/dashboard/upload")}>Upload Your First Recording</Button>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {meetings.map((meeting) => (
        <MeetingCard key={meeting.id} meeting={meeting} onView={handleView} onDelete={handleDelete} />
      ))}
    </div>
  );
}