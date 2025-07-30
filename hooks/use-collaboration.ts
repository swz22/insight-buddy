"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { RealtimeChannel } from "@supabase/supabase-js";
import { useToast } from "@/hooks/use-toast";

interface UserInfo {
  name: string;
  email?: string;
  avatar_url?: string;
  color: string;
}

interface Presence {
  user_info: UserInfo;
  status: "active" | "idle" | "typing";
  cursor_position?: { line_number: number; character: number };
  joined_at: string;
}

interface Annotation {
  id: string;
  meeting_id: string;
  share_token: string;
  user_info: UserInfo;
  type: "highlight" | "comment" | "note";
  content: string;
  position?: { start_line: number; end_line: number } | { line_number: number };
  parent_id?: string;
  created_at: string;
}

interface CollaborationState {
  presence: Record<string, Presence>;
  annotations: Annotation[];
  notes: string;
  isConnected: boolean;
}

export function useCollaboration(meetingId: string, shareToken: string, userInfo: UserInfo) {
  const toast = useToast();
  const [state, setState] = useState<CollaborationState>({
    presence: {},
    annotations: [],
    notes: "",
    isConnected: false,
  });

  const channelRef = useRef<RealtimeChannel | null>(null);
  const supabase = createClient();

  useEffect(() => {
    if (!meetingId || !shareToken || !userInfo.name) {
      console.log("Skipping collaboration - missing required data:", {
        meetingId,
        shareToken,
        userName: userInfo.name,
      });
      return;
    }

    console.log("Initializing collaboration with user:", userInfo);

    const initializeCollaboration = async () => {
      // Fetch existing annotations
      const { data: annotations } = await supabase
        .from("meeting_annotations")
        .select("*")
        .eq("meeting_id", meetingId)
        .eq("share_token", shareToken)
        .order("created_at", { ascending: true });

      // Fetch collaborative notes
      const { data: notesData } = await supabase
        .from("meeting_notes")
        .select("*")
        .eq("meeting_id", meetingId)
        .eq("share_token", shareToken)
        .single();

      setState((prev) => ({
        ...prev,
        annotations: annotations || [],
        notes: notesData?.content || "",
      }));

      // Set up real-time channel
      const channel = supabase.channel(`meeting:${shareToken}`, {
        config: {
          presence: {
            key: userInfo.email || `anon-${Date.now()}`,
          },
        },
      });

      // Handle presence sync
      channel
        .on("presence", { event: "sync" }, () => {
          const state = channel.presenceState();
          const presenceState: Record<string, Presence> = {};

          for (const [key, presences] of Object.entries(state)) {
            if (Array.isArray(presences) && presences.length > 0) {
              const presence = presences[0] as any;
              if (presence && presence.user_info) {
                presenceState[key] = {
                  user_info: presence.user_info,
                  status: presence.status || "active",
                  cursor_position: presence.cursor_position,
                  joined_at: presence.joined_at || new Date().toISOString(),
                };
              }
            }
          }

          setState((prev) => ({
            ...prev,
            presence: presenceState,
          }));
        })
        .on("presence", { event: "join" }, ({ key, newPresences }) => {
          console.log("User joined:", key, newPresences);
        })
        .on("presence", { event: "leave" }, ({ key, leftPresences }) => {
          console.log("User left:", key, leftPresences);
        });

      // Handle broadcast events
      channel
        .on("broadcast", { event: "annotation" }, ({ payload }) => {
          setState((prev) => ({
            ...prev,
            annotations: [...prev.annotations, payload],
          }));
        })
        .on("broadcast", { event: "annotation_delete" }, ({ payload }) => {
          setState((prev) => ({
            ...prev,
            annotations: prev.annotations.filter((a) => a.id !== payload.id),
          }));
        })
        .on("broadcast", { event: "notes_update" }, ({ payload }) => {
          setState((prev) => ({
            ...prev,
            notes: payload.content,
          }));
        })
        .on("broadcast", { event: "cursor_move" }, ({ payload }) => {
          setState((prev) => {
            const currentPresence = prev.presence[payload.user_key];
            if (currentPresence) {
              return {
                ...prev,
                presence: {
                  ...prev.presence,
                  [payload.user_key]: {
                    ...currentPresence,
                    cursor_position: payload.position,
                  },
                },
              };
            }
            return prev;
          });
        });

      channel.subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          setState((prev) => ({ ...prev, isConnected: true }));

          const trackData = {
            user_info: userInfo,
            status: "active",
            joined_at: new Date().toISOString(),
          };

          console.log("Tracking presence with:", trackData);
          await channel.track(trackData);
        }
      });

      channelRef.current = channel;
    };

    initializeCollaboration();

    // Cleanup
    return () => {
      if (channelRef.current) {
        channelRef.current.unsubscribe();
      }
    };
  }, [meetingId, shareToken, userInfo.email]);

  // Add highlight
  const addHighlight = useCallback(
    async (startLine: number, endLine: number, text: string) => {
      if (!channelRef.current) return;

      const annotation: Omit<Annotation, "id" | "created_at"> = {
        meeting_id: meetingId,
        share_token: shareToken,
        user_info: userInfo,
        type: "highlight",
        content: text,
        position: { start_line: startLine, end_line: endLine },
      };

      // Save to database
      const { data, error } = await supabase.from("meeting_annotations").insert(annotation).select().single();

      if (error) {
        toast.error("Failed to add highlight");
        return;
      }

      // Broadcast to others
      channelRef.current.send({
        type: "broadcast",
        event: "annotation",
        payload: data,
      });

      // Update local state
      setState((prev) => ({
        ...prev,
        annotations: [...prev.annotations, data],
      }));
    },
    [meetingId, shareToken, userInfo, supabase, toast]
  );

  // Add comment
  const addComment = useCallback(
    async (lineNumber: number, text: string, parentId?: string) => {
      if (!channelRef.current) return;

      const annotation: Omit<Annotation, "id" | "created_at"> = {
        meeting_id: meetingId,
        share_token: shareToken,
        user_info: userInfo,
        type: "comment",
        content: text,
        position: { line_number: lineNumber },
        parent_id: parentId,
      };

      // Save to database
      const { data, error } = await supabase.from("meeting_annotations").insert(annotation).select().single();

      if (error) {
        toast.error("Failed to add comment");
        return;
      }

      // Broadcast to others
      channelRef.current.send({
        type: "broadcast",
        event: "annotation",
        payload: data,
      });

      // Update local state
      setState((prev) => ({
        ...prev,
        annotations: [...prev.annotations, data],
      }));
    },
    [meetingId, shareToken, userInfo, supabase, toast]
  );

  const updateNotes = useCallback(
    async (content: string) => {
      if (!channelRef.current) return;

      try {
        const { data: existingNotes } = await supabase
          .from("meeting_notes")
          .select("id")
          .eq("meeting_id", meetingId)
          .eq("share_token", shareToken)
          .single();

        if (existingNotes) {
          const { error } = await supabase
            .from("meeting_notes")
            .update({
              content,
              last_edited_by: userInfo,
              updated_at: new Date().toISOString(),
            })
            .eq("meeting_id", meetingId)
            .eq("share_token", shareToken);

          if (error) throw error;
        } else {
          const { error } = await supabase.from("meeting_notes").insert({
            meeting_id: meetingId,
            share_token: shareToken,
            content,
            last_edited_by: userInfo,
          });

          if (error) throw error;
        }

        // Broadcast to others
        channelRef.current.send({
          type: "broadcast",
          event: "notes_update",
          payload: { content },
        });

        // Update local state
        setState((prev) => ({
          ...prev,
          notes: content,
        }));
      } catch (error) {
        console.error("Failed to update notes:", error);
      }
    },
    [meetingId, shareToken, userInfo, supabase]
  );

  // Update cursor position
  const updateCursor = useCallback(
    (lineNumber: number, character: number) => {
      if (!channelRef.current) return;

      channelRef.current.send({
        type: "broadcast",
        event: "cursor_move",
        payload: {
          user_key: userInfo.email || `anon-${Date.now()}`,
          position: { line_number: lineNumber, character },
        },
      });
    },
    [userInfo.email]
  );

  // Update status
  const updateStatus = useCallback(
    async (status: "active" | "idle" | "typing") => {
      if (!channelRef.current) return;

      await channelRef.current.track({
        user_info: userInfo,
        status,
        joined_at: new Date().toISOString(),
      });
    },
    [userInfo]
  );

  return {
    presence: state.presence,
    annotations: state.annotations,
    notes: state.notes,
    isConnected: state.isConnected,
    activeUsers: Object.values(state.presence).filter((p) => p.status === "active"),
    addHighlight,
    addComment,
    updateNotes,
    updateCursor,
    updateStatus,
  };
}
