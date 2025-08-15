import { useEffect, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Database } from "@/types/supabase";

type Meeting = Database["public"]["Tables"]["meetings"]["Row"];

interface UseMeetingProcessingOptions {
  meeting: Meeting | null | undefined;
  enabled?: boolean;
}

export function useMeetingProcessing({ meeting, enabled = true }: UseMeetingProcessingOptions) {
  const { success: toastSuccess, error: toastError } = useToast();
  const hasTriggeredRef = useRef(false);

  const startTranscription = useMutation({
    mutationFn: async (meetingId: string) => {
      const response = await fetch(`/api/meetings/${meetingId}/transcribe`, {
        method: "POST",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to start transcription");
      }

      return response.json();
    },
    onSuccess: () => {
      toastSuccess("Transcription started! This may take a few minutes.");
    },
    onError: (error) => {
      if (error.message.includes("already in progress")) {
        return;
      }
      toastError(error.message || "Failed to start transcription");
    },
  });

  const generateSummary = useMutation({
    mutationFn: async (meetingId: string) => {
      const response = await fetch(`/api/meetings/${meetingId}/summarize`, {
        method: "POST",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to generate summary");
      }

      return response.json();
    },
    onSuccess: () => {
      toastSuccess("Summary generated successfully!");
    },
    onError: (error) => {
      toastError(error.message || "Failed to generate summary");
    },
  });

  useEffect(() => {
    if (!enabled || !meeting || hasTriggeredRef.current) return;

    const needsTranscription = meeting.audio_url && !meeting.transcript && !meeting.transcript_id;

    if (needsTranscription) {
      hasTriggeredRef.current = true;
      startTranscription.mutate(meeting.id);
    }
  }, [meeting, enabled]);

  return {
    isProcessing: startTranscription.isPending || generateSummary.isPending,
    startTranscription: () => meeting && startTranscription.mutate(meeting.id),
    generateSummary: () => meeting && generateSummary.mutate(meeting.id),
  };
}
