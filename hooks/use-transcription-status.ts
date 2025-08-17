import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Database } from "@/types/supabase";

type Meeting = Database["public"]["Tables"]["meetings"]["Row"];

interface UseTranscriptionStatusOptions {
  meeting: Meeting | null | undefined;
  enabled?: boolean;
  pollingInterval?: number;
  onTranscriptionComplete?: () => void;
}

export function useTranscriptionStatus({
  meeting,
  enabled = true,
  pollingInterval = 5000,
  onTranscriptionComplete,
}: UseTranscriptionStatusOptions) {
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const queryClient = useQueryClient();
  const hasCompletedRef = useRef(false);

  useEffect(() => {
    if (!enabled || !meeting?.transcript_id || meeting.transcript || hasCompletedRef.current) {
      setIsTranscribing(false);
      return;
    }

    setIsTranscribing(true);

    const checkTranscriptionStatus = async () => {
      try {
        const response = await fetch(`/api/meetings/${meeting.id}/transcription-status`);

        if (!response.ok) {
          throw new Error("Failed to check transcription status");
        }

        const result = await response.json();

        if (result.status === "completed" && result.hasTranscript) {
          setIsTranscribing(false);
          hasCompletedRef.current = true;

          queryClient.invalidateQueries({ queryKey: ["meetings", meeting.id] });
          queryClient.invalidateQueries({ queryKey: ["meetings"] });

          if (onTranscriptionComplete) {
            onTranscriptionComplete();
          }

          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }
        } else if (result.status === "error") {
          setIsTranscribing(false);
          setError(result.error || "Transcription failed");

          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }
        }
      } catch (err) {
        console.error("Error checking transcription status:", err);
        setError(err instanceof Error ? err.message : "Failed to check status");
      }
    };

    checkTranscriptionStatus();

    pollIntervalRef.current = setInterval(checkTranscriptionStatus, pollingInterval);

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [meeting, enabled, pollingInterval, queryClient, onTranscriptionComplete]);

  useEffect(() => {
    if (meeting?.transcript) {
      setIsTranscribing(false);
      hasCompletedRef.current = true;
    }
  }, [meeting?.transcript]);

  return {
    isTranscribing,
    error,
  };
}
