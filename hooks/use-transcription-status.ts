import { useEffect, useRef } from "react";
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
  pollingInterval = 5000, // 5 seconds
}: UseTranscriptionStatusOptions) {
  const queryClient = useQueryClient();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!enabled || !meeting || !meeting.transcript_id || meeting.transcript) {
      return;
    }

    const checkTranscriptionStatus = async () => {
      try {
        const response = await fetch(`/api/meetings/${meeting.id}/transcription-status`);
        if (response.ok) {
          const data = await response.json();
          if (data.status === "completed") {
            // Invalidate the meeting query to refetch with new data
            queryClient.invalidateQueries({ queryKey: ["meetings", meeting.id] });

            // Clear the interval
            if (intervalRef.current) {
              clearInterval(intervalRef.current);
              intervalRef.current = null;
            }
          }
        }
      } catch (error) {
        console.error("Error checking transcription status:", error);
      }
    };

    // Check immediately
    checkTranscriptionStatus();

    // Then set up polling
    intervalRef.current = setInterval(checkTranscriptionStatus, pollingInterval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [meeting, enabled, pollingInterval, queryClient]);

  return {
    isTranscribing: !!(meeting?.transcript_id && !meeting.transcript),
  };
}
