"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Database } from "@/types/supabase";

type Meeting = Database["public"]["Tables"]["meetings"]["Row"];
type MeetingInsert = Omit<
  Database["public"]["Tables"]["meetings"]["Insert"],
  "id" | "user_id" | "created_at" | "updated_at"
>;

export function useMeetings() {
  return useQuery<Meeting[]>({
    queryKey: ["meetings"],
    queryFn: async () => {
      const response = await fetch("/api/meetings");
      if (!response.ok) throw new Error("Failed to fetch meetings");
      return response.json();
    },
  });
}

export function useCreateMeeting() {
  const queryClient = useQueryClient();

  return useMutation<Meeting, Error, MeetingInsert>({
    mutationFn: async (data) => {
      const response = await fetch("/api/meetings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.details || "Failed to create meeting");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meetings"] });
    },
  });
}
