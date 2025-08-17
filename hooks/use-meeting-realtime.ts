import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { RealtimeChannel } from "@supabase/supabase-js";
import { Database } from "@/types/supabase";
import { useToast } from "@/hooks/use-toast";

type Meeting = Database["public"]["Tables"]["meetings"]["Row"];

interface UseMeetingRealtimeOptions {
  meetingId: string;
  enabled?: boolean;
  onUpdate?: (meeting: Meeting) => void;
  onTranscriptComplete?: () => void;
  onSummaryComplete?: () => void;
  onInsightsComplete?: () => void;
}

export function useMeetingRealtime({
  meetingId,
  enabled = true,
  onUpdate,
  onTranscriptComplete,
  onSummaryComplete,
  onInsightsComplete,
}: UseMeetingRealtimeOptions) {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const { info: toastInfo } = useToast();
  const supabase = createClient();

  useEffect(() => {
    if (!enabled || !meetingId) return;

    const channel = supabase
      .channel(`meeting-${meetingId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "meetings",
          filter: `id=eq.${meetingId}`,
        },
        (payload) => {
          console.log("Meeting update received:", payload);
          const updatedMeeting = payload.new as Meeting;
          const oldMeeting = payload.old as Meeting;

          // Notify about specific completions
          if (!oldMeeting.transcript && updatedMeeting.transcript) {
            toastInfo("Transcript ready!");
            onTranscriptComplete?.();
          }

          if (!oldMeeting.summary && updatedMeeting.summary) {
            toastInfo("Summary generated!");
            onSummaryComplete?.();
          }

          if (!oldMeeting.action_items?.length && updatedMeeting.action_items?.length) {
            toastInfo("Action items extracted!");
          }

          // Call general update handler
          onUpdate?.(updatedMeeting);
        }
      )
      .subscribe((status) => {
        console.log(`Realtime subscription status for meeting ${meetingId}:`, status);
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        console.log(`Unsubscribing from meeting ${meetingId}`);
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [meetingId, enabled, supabase, onUpdate, onTranscriptComplete, onSummaryComplete, toastInfo]);

  // Also subscribe to insights table updates
  useEffect(() => {
    if (!enabled || !meetingId) return;

    const insightsChannel = supabase
      .channel(`meeting-insights-${meetingId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "meeting_insights",
          filter: `meeting_id=eq.${meetingId}`,
        },
        (payload) => {
          console.log("Insights created:", payload);
          toastInfo("Insights generated!");
          onInsightsComplete?.();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "meeting_insights",
          filter: `meeting_id=eq.${meetingId}`,
        },
        (payload) => {
          console.log("Insights updated:", payload);
          toastInfo("Insights updated!");
          onInsightsComplete?.();
        }
      )
      .subscribe((status) => {
        console.log(`Realtime subscription status for insights ${meetingId}:`, status);
      });

    return () => {
      if (insightsChannel) {
        console.log(`Unsubscribing from insights ${meetingId}`);
        supabase.removeChannel(insightsChannel);
      }
    };
  }, [meetingId, enabled, supabase, onInsightsComplete, toastInfo]);

  return {
    isConnected: channelRef.current?.state === "joined",
  };
}
