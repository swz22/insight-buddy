import { useEffect, useState, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Database } from "@/types/supabase";

type Meeting = Database["public"]["Tables"]["meetings"]["Row"];

interface UseTranscriptionStatusOptions {
  meeting: Meeting | null | undefined;
  enabled?: boolean;
  pollingInterval?: number;
}

export function useTranscriptionStatus({
  meeting,
  enabled = true,
  pollingInterval = 5000,
}: UseTranscriptionStatusOptions) {
  const queryClient = useQueryClient();
  const [isTranscribing, setIsTranscribing] = useState(false);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!enabled || !meeting) {
      setIsTranscribing(false);
      return;
    }

    const hasTranscriptId = !!meeting.transcript_id;
    const hasTranscript = !!meeting.transcript;
    const needsPolling = hasTranscriptId && !hasTranscript;

    setIsTranscribing(needsPolling);

    if (needsPolling) {
      const checkStatus = async () => {
        try {
          const response = await fetch(`/api/meetings/${meeting.id}/check-transcript`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ transcriptId: meeting.transcript_id }),
          });

          if (!response.ok) {
            console.error("Failed to check transcript status");
            return;
          }

          const result = await response.json();

          if (result.status === "completed" && result.hasTranscript) {
            setIsTranscribing(false);
            queryClient.invalidateQueries({ queryKey: ["meeting", meeting.id] });

            if (pollingIntervalRef.current) {
              clearInterval(pollingIntervalRef.current);
              pollingIntervalRef.current = null;
            }
          } else if (result.status === "error") {
            setIsTranscribing(false);

            if (pollingIntervalRef.current) {
              clearInterval(pollingIntervalRef.current);
              pollingIntervalRef.current = null;
            }
          }
        } catch (error) {
          console.error("Error checking transcript status:", error);
        }
      };

      checkStatus();
      pollingIntervalRef.current = setInterval(checkStatus, pollingInterval);
    }

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [meeting, enabled, pollingInterval, queryClient]);

  return {
    isTranscribing,
    hasTranscript: !!meeting?.transcript,
    transcriptId: meeting?.transcript_id,
  };
}
