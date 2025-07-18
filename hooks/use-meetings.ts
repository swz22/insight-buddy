"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Database } from "@/types/supabase";
import { ApiClientError, parseApiError } from "@/lib/types/error";

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
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Fetch meetings error - Status:", response.status);
        console.error("Fetch meetings error - Response:", errorText);

        let error;
        try {
          error = JSON.parse(errorText);
        } catch {
          error = { error: errorText };
        }

        throw new ApiClientError(parseApiError(error), response.status, error.code);
      }
      return response.json();
    },
  });
}

export function useMeeting(id: string) {
  return useQuery<Meeting>({
    queryKey: ["meetings", id],
    queryFn: async () => {
      const response = await fetch(`/api/meetings/${id}`);
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Fetch meeting error - Status:", response.status);
        console.error("Fetch meeting error - Response:", errorText);

        let error;
        try {
          error = JSON.parse(errorText);
        } catch {
          error = { error: errorText };
        }

        throw new ApiClientError(parseApiError(error), response.status, error.code);
      }
      return response.json();
    },
    enabled: !!id,
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
        const errorText = await response.text();
        console.error("Create meeting error - Status:", response.status);
        console.error("Create meeting error - Response:", errorText);
        console.error("Create meeting error - Request data:", data);

        let error;
        try {
          error = JSON.parse(errorText);
        } catch {
          error = { error: errorText };
        }

        throw new ApiClientError(parseApiError(error), response.status, error.code);
      }

      const result = await response.json();
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meetings"] });
    },
    onError: (error) => {
      console.error("Mutation error:", error);
    },
  });
}
