"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { createClientWithFallback } from "@/lib/supabase/client-with-fallback";
import { RealtimeChannel } from "@supabase/supabase-js";
import { useToast } from "@/hooks/use-toast";
import { isEdgeBrowser } from "@/lib/utils/browser-detection";

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

function isPresence(obj: any): obj is Presence {
  return (
    obj &&
    typeof obj === "object" &&
    "user_info" in obj &&
    obj.user_info &&
    typeof obj.user_info === "object" &&
    "name" in obj.user_info &&
    typeof obj.user_info.name === "string" &&
    "status" in obj &&
    ["active", "idle", "typing"].includes(obj.status) &&
    "joined_at" in obj
  );
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
  const supabaseRef = useRef(createClientWithFallback());
  const presenceRef = useRef<Record<string, Presence>>({});
  const isEdge = useRef(isEdgeBrowser());

  useEffect(() => {
    if (!meetingId || !shareToken || !userInfo.name) {
      console.log("Skipping collaboration - missing required data:", {
        meetingId,
        shareToken,
        userName: userInfo.name,
      });
      return;
    }

    const supabase = supabaseRef.current;
    let isMounted = true;

    const initializeCollaboration = async () => {
      try {
        if (isEdge.current) {
          console.log("Edge browser detected - using compatibility mode");
        }

        const {
          data: { session },
        } = await supabase.auth.getSession();
        console.log("Collaboration session status:", session ? "authenticated" : "anonymous");

        // Fetch existing annotations
        const { data: annotations, error: annotationsError } = await supabase
          .from("meeting_annotations")
          .select("*")
          .eq("meeting_id", meetingId)
          .eq("share_token", shareToken)
          .order("created_at", { ascending: true });

        if (annotationsError) {
          console.error("Failed to fetch annotations:", annotationsError);
        }

        // Fetch collaborative notes
        const { data: notesData, error: notesError } = await supabase
          .from("meeting_notes")
          .select("*")
          .eq("meeting_id", meetingId)
          .eq("share_token", shareToken)
          .single();

        if (notesError && notesError.code !== "PGRST116") {
          console.error("Failed to fetch notes:", notesError);
        }

        if (isMounted) {
          setState((prev) => ({
            ...prev,
            annotations: annotations || [],
            notes: notesData?.content || "",
          }));
        }

        const channelName = `meeting-${shareToken}`;

        const channel = supabase.channel(channelName, {
          config: {
            presence: {
              key: `${shareToken}-${userInfo.name}-${Date.now()}`,
            },
            broadcast: {
              self: true, // Include own broadcasts for Edge compatibility
            },
          },
        });

        // Handle presence sync
        channel
          .on("presence", { event: "sync" }, () => {
            if (!isMounted) return;

            const presenceState = channel.presenceState();
            const newPresence: Record<string, Presence> = {};

            Object.entries(presenceState).forEach(([key, presences]) => {
              if (Array.isArray(presences) && presences.length > 0) {
                const presenceData = presences[0];

                if (isPresence(presenceData)) {
                  newPresence[key] = presenceData;
                }
              }
            });

            presenceRef.current = newPresence;
            setState((prev) => ({
              ...prev,
              presence: newPresence,
            }));
          })
          .on("presence", { event: "join" }, ({ key, newPresences }: any) => {
            console.log("User joined:", key, newPresences);
            if (!isMounted) return;

            if (Array.isArray(newPresences) && newPresences.length > 0) {
              const presenceData = newPresences[0];
              if (isPresence(presenceData)) {
                toast.info(`${presenceData.user_info.name} joined the session`);
              }
            }
          })
          .on("presence", { event: "leave" }, ({ key, leftPresences }: any) => {
            console.log("User left:", key, leftPresences);
            if (!isMounted) return;

            if (Array.isArray(leftPresences) && leftPresences.length > 0) {
              const presenceData = leftPresences[0];
              if (isPresence(presenceData)) {
                toast.info(`${presenceData.user_info.name} left the session`);
              }
            }
          });

        // Handle broadcast events
        channel
          .on("broadcast", { event: "annotation" }, ({ payload }) => {
            if (!isMounted) return;
            console.log("Received annotation:", payload);
            setState((prev) => ({
              ...prev,
              annotations: [...prev.annotations, payload],
            }));
          })
          .on("broadcast", { event: "annotation_delete" }, ({ payload }) => {
            if (!isMounted) return;
            setState((prev) => ({
              ...prev,
              annotations: prev.annotations.filter((a) => a.id !== payload.id),
            }));
          })
          .on("broadcast", { event: "notes_update" }, ({ payload }) => {
            if (!isMounted) return;
            setState((prev) => ({
              ...prev,
              notes: payload.content,
            }));
          })
          .on("broadcast", { event: "status_update" }, ({ payload }: any) => {
            if (!isMounted) return;
            const key = payload.user_key;
            if (presenceRef.current[key]) {
              const updatedPresence = {
                ...presenceRef.current[key],
                status: payload.status,
              };
              presenceRef.current[key] = updatedPresence;
              setState((prev) => ({
                ...prev,
                presence: {
                  ...prev.presence,
                  [key]: updatedPresence,
                },
              }));
            }
          });

        const subscription = channel.subscribe(async (status) => {
          console.log("Channel subscription status:", status);

          if (status === "SUBSCRIBED") {
            if (isMounted) {
              setState((prev) => ({ ...prev, isConnected: true }));
            }

            const presenceData: Presence = {
              user_info: userInfo,
              status: "active",
              joined_at: new Date().toISOString(),
            };

            console.log("Tracking presence with:", presenceData);
            await channel.track(presenceData);
          } else if (status === "CLOSED") {
            if (isMounted) {
              setState((prev) => ({ ...prev, isConnected: false }));
            }
          } else if (status === "CHANNEL_ERROR") {
            console.error("Channel error occurred");
            if (isMounted) {
              setState((prev) => ({ ...prev, isConnected: false }));
              toast.error("Connection error. Trying to reconnect...");
            }
          }
        });

        channelRef.current = channel;
      } catch (error) {
        console.error("Collaboration initialization error:", error);
        if (isMounted) {
          toast.error("Failed to initialize collaboration");
        }
      }
    };

    initializeCollaboration();

    // Cleanup
    return () => {
      isMounted = false;
      if (channelRef.current) {
        console.log("Cleaning up collaboration channel");
        channelRef.current.unsubscribe();
        channelRef.current = null;
      }
    };
  }, [meetingId, shareToken, userInfo.name, userInfo.color]);

  // Add highlight
  const addHighlight = useCallback(
    async (startLine: number, endLine: number, text: string) => {
      if (!channelRef.current) {
        toast.error("Not connected to collaboration session");
        return;
      }

      const annotation: Omit<Annotation, "id" | "created_at"> = {
        meeting_id: meetingId,
        share_token: shareToken,
        user_info: userInfo,
        type: "highlight",
        content: text,
        position: { start_line: startLine, end_line: endLine },
      };

      try {
        // Save to database
        const { data, error } = await supabaseRef.current
          .from("meeting_annotations")
          .insert(annotation)
          .select()
          .single();

        if (error) {
          console.error("Failed to save highlight:", error);
          toast.error("Failed to add highlight");
          return;
        }

        // Broadcast to others
        await channelRef.current.send({
          type: "broadcast",
          event: "annotation",
          payload: data,
        });

        // Update local state
        setState((prev) => ({
          ...prev,
          annotations: [...prev.annotations, data],
        }));

        toast.success("Highlight added");
      } catch (error) {
        console.error("Add highlight error:", error);
        toast.error("Failed to add highlight");
      }
    },
    [meetingId, shareToken, userInfo, toast]
  );

  // Add comment
  const addComment = useCallback(
    async (lineNumber: number, text: string, parentId?: string) => {
      if (!channelRef.current) {
        toast.error("Not connected to collaboration session");
        return;
      }

      const annotation: Omit<Annotation, "id" | "created_at"> = {
        meeting_id: meetingId,
        share_token: shareToken,
        user_info: userInfo,
        type: "comment",
        content: text,
        position: { line_number: lineNumber },
        parent_id: parentId,
      };

      try {
        // Save to database
        const { data, error } = await supabaseRef.current
          .from("meeting_annotations")
          .insert(annotation)
          .select()
          .single();

        if (error) {
          console.error("Failed to save comment:", error);
          toast.error("Failed to add comment");
          return;
        }

        // Broadcast to others
        await channelRef.current.send({
          type: "broadcast",
          event: "annotation",
          payload: data,
        });

        // Update local state
        setState((prev) => ({
          ...prev,
          annotations: [...prev.annotations, data],
        }));

        toast.success("Comment added");
      } catch (error) {
        console.error("Add comment error:", error);
        toast.error("Failed to add comment");
      }
    },
    [meetingId, shareToken, userInfo, toast]
  );

  const updateNotes = useCallback(
    async (content: string) => {
      if (!channelRef.current) return;

      try {
        const broadcastResult = await channelRef.current.send({
          type: "broadcast",
          event: "notes_update",
          payload: {
            content,
            userInfo,
            timestamp: Date.now(),
          },
        });

        console.log("Broadcast result:", broadcastResult);

        setState((prev) => ({
          ...prev,
          notes: content,
        }));

        if (isEdge.current) {
          console.log("Edge browser detected - using broadcast-only mode");
          return;
        }

        try {
          const { data: existingNotes, error: fetchError } = await supabaseRef.current
            .from("meeting_notes")
            .select("id")
            .eq("meeting_id", meetingId)
            .eq("share_token", shareToken)
            .single();

          if (fetchError && fetchError.code !== "PGRST116") {
            console.error("Error checking existing notes:", fetchError);
          }

          if (existingNotes) {
            const { error: updateError } = await supabaseRef.current
              .from("meeting_notes")
              .update({
                content,
                last_edited_by: userInfo,
                updated_at: new Date().toISOString(),
              })
              .eq("meeting_id", meetingId)
              .eq("share_token", shareToken);

            if (updateError) {
              console.error("Error updating notes in database:", updateError);
            }
          } else {
            const { error: insertError } = await supabaseRef.current.from("meeting_notes").insert({
              meeting_id: meetingId,
              share_token: shareToken,
              content,
              last_edited_by: userInfo,
            });

            if (insertError) {
              console.error("Error inserting notes in database:", insertError);
            }
          }
        } catch (dbError) {
          console.warn("Database operation failed, relying on broadcast:", dbError);
        }
      } catch (error) {
        console.error("Failed to update notes:", error);
        toast.error("Failed to share notes. Please check your connection.");
      }
    },
    [meetingId, shareToken, userInfo, toast]
  );

  // Update cursor position
  const updateCursor = useCallback(
    async (lineNumber: number, character: number) => {
      if (!channelRef.current) return;

      try {
        await channelRef.current.send({
          type: "broadcast",
          event: "cursor_move",
          payload: {
            user_key: `${shareToken}-${userInfo.name}-${Date.now()}`,
            position: { line_number: lineNumber, character },
          },
        });
      } catch (error) {
        console.error("Failed to update cursor:", error);
      }
    },
    [shareToken, userInfo.name]
  );

  // Update status
  const updateStatus = useCallback(
    async (status: "active" | "idle" | "typing") => {
      if (!channelRef.current) return;

      try {
        const presenceData: Presence = {
          user_info: userInfo,
          status,
          joined_at: new Date().toISOString(),
        };

        await channelRef.current.track(presenceData);
        await channelRef.current.send({
          type: "broadcast",
          event: "status_update",
          payload: {
            user_key: `${shareToken}-${userInfo.name}-${Date.now()}`,
            status,
          },
        });
      } catch (error) {
        console.error("Failed to update status:", error);
      }
    },
    [shareToken, userInfo]
  );

  const activeUsers = Object.values(state.presence);

  return {
    presence: state.presence,
    annotations: state.annotations,
    notes: state.notes,
    isConnected: state.isConnected,
    activeUsers,
    addHighlight,
    addComment,
    updateNotes,
    updateCursor,
    updateStatus,
  };
}
