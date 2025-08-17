import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { RealtimeChannel } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import { Database } from "@/types/supabase";
import { useToast } from "@/hooks/use-toast";

type Meeting = Database["public"]["Tables"]["meetings"]["Row"];

interface UseMeetingsRealtimeOptions {
  userId?: string;
  enabled?: boolean;
}

export function useMeetingsRealtime({ userId, enabled = true }: UseMeetingsRealtimeOptions = {}) {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const queryClient = useQueryClient();
  const { info: toastInfo } = useToast();
  const supabase = createClient();

  useEffect(() => {
    if (!enabled || !userId) return;

    const channel = supabase
      .channel(`user-meetings-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "meetings",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          console.log("New meeting created:", payload);
          const newMeeting = payload.new as Meeting;

          // Add the new meeting to the cache immediately
          queryClient.setQueryData<Meeting[]>(["meetings"], (old) => {
            if (!old) return [newMeeting];
            return [newMeeting, ...old];
          });

          // Invalidate to ensure consistency
          queryClient.invalidateQueries({ queryKey: ["meetings"] });

          toastInfo("New meeting added!");
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "meetings",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          console.log("Meeting updated:", payload);
          const updatedMeeting = payload.new as Meeting;
          const oldMeeting = payload.old as Meeting;

          // Update the specific meeting in cache
          queryClient.setQueryData<Meeting[]>(["meetings"], (old) => {
            if (!old) return old;
            return old.map((meeting) => (meeting.id === updatedMeeting.id ? updatedMeeting : meeting));
          });

          // Update individual meeting query
          queryClient.setQueryData<Meeting>(["meetings", updatedMeeting.id], updatedMeeting);

          // Notify about transcript completion
          if (!oldMeeting.transcript && updatedMeeting.transcript) {
            toastInfo(`Transcript ready for "${updatedMeeting.title}"`);
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "meetings",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          console.log("Meeting deleted:", payload);
          const deletedMeeting = payload.old as Meeting;

          // Remove from cache
          queryClient.setQueryData<Meeting[]>(["meetings"], (old) => {
            if (!old) return old;
            return old.filter((meeting) => meeting.id !== deletedMeeting.id);
          });

          // Remove individual query
          queryClient.removeQueries({ queryKey: ["meetings", deletedMeeting.id] });
        }
      )
      .subscribe((status) => {
        console.log(`Realtime subscription status for user ${userId}:`, status);
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        console.log(`Unsubscribing from user meetings ${userId}`);
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [userId, enabled, supabase, queryClient, toastInfo]);

  return {
    isConnected: channelRef.current?.state === "joined",
  };
}
