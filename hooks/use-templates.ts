"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Database } from "@/types/supabase";
import { ApiClientError, parseApiError } from "@/lib/types/error";

type MeetingTemplate = Database["public"]["Tables"]["meeting_templates"]["Row"];
type MeetingTemplateInsert = Omit<
  Database["public"]["Tables"]["meeting_templates"]["Insert"],
  "id" | "user_id" | "created_at" | "updated_at"
>;
type MeetingTemplateUpdate = Omit<
  Database["public"]["Tables"]["meeting_templates"]["Update"],
  "id" | "user_id" | "created_at" | "updated_at"
>;

export function useTemplates() {
  return useQuery<MeetingTemplate[]>({
    queryKey: ["templates"],
    queryFn: async () => {
      const response = await fetch("/api/templates");
      if (!response.ok) {
        const error = await response.json();
        throw new ApiClientError(parseApiError(error), response.status, error.code);
      }
      return response.json();
    },
  });
}

export function useCreateTemplate() {
  const queryClient = useQueryClient();

  return useMutation<MeetingTemplate, Error, MeetingTemplateInsert>({
    mutationFn: async (data) => {
      const response = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new ApiClientError(parseApiError(error), response.status, error.code);
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
    },
  });
}

export function useUpdateTemplate() {
  const queryClient = useQueryClient();

  return useMutation<MeetingTemplate, Error, { id: string; data: MeetingTemplateUpdate }>({
    mutationFn: async ({ id, data }) => {
      const response = await fetch(`/api/templates/${id}`, {
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
    },
  });
}

export function useDeleteTemplate() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: async (id) => {
      const response = await fetch(`/api/templates/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new ApiClientError(parseApiError(error), response.status, error.code);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
    },
  });
}
