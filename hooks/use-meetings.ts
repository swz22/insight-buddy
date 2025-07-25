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
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["meetings"] });
    },
    onError: (error) => {
      console.error("Mutation error:", error);
    },
  });
}

export function useUpdateMeeting() {
  const queryClient = useQueryClient();

  return useMutation<Meeting, Error, { id: string; data: Partial<Meeting> }>({
    mutationFn: async ({ id, data }) => {
      const response = await fetch(`/api/meetings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new ApiClientError(parseApiError(error), response.status, error.code);
      }

      return response.json();
    },
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: ["meetings"] });
      await queryClient.cancelQueries({ queryKey: ["meetings", id] });

      const previousMeetings = queryClient.getQueryData<Meeting[]>(["meetings"]);
      const previousMeeting = queryClient.getQueryData<Meeting>(["meetings", id]);

      if (previousMeetings) {
        queryClient.setQueryData<Meeting[]>(["meetings"], (old) =>
          old ? old.map((m) => (m.id === id ? { ...m, ...data } : m)) : []
        );
      }

      if (previousMeeting) {
        queryClient.setQueryData<Meeting>(["meetings", id], { ...previousMeeting, ...data });
      }

      return { previousMeetings, previousMeeting };
    },
    onError: (err, { id }, context) => {
      if (context?.previousMeetings) {
        queryClient.setQueryData(["meetings"], context.previousMeetings);
      }
      if (context?.previousMeeting) {
        queryClient.setQueryData(["meetings", id], context.previousMeeting);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["meetings"] });
    },
  });
}

export function useDeleteMeeting() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: async (id) => {
      const response = await fetch(`/api/meetings/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new ApiClientError(parseApiError(error), response.status, error.code);
      }
    },
    onMutate: async (id) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["meetings"] });

      // Snapshot previous value
      const previousMeetings = queryClient.getQueryData<Meeting[]>(["meetings"]);

      // Optimistically remove
      queryClient.setQueryData<Meeting[]>(["meetings"], (old) => (old ? old.filter((m) => m.id !== id) : []));

      return { previousMeetings };
    },
    onError: (err, id, context) => {
      // Rollback on error
      if (context?.previousMeetings) {
        queryClient.setQueryData(["meetings"], context.previousMeetings);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["meetings"] });
    },
  });
}
