"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { createClientSafe } from "@/lib/supabase/client-safe";
import { RealtimeChannel } from "@supabase/supabase-js";
import { useToast } from "@/hooks/use-toast";
import { ConnectionManager } from "@/lib/utils/connection-manager";

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
  lastEditedBy: UserInfo | null;
  isConnected: boolean;
  connectionError: string | null;
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
    "color" in obj.user_info &&
    typeof obj.user_info.color === "string" &&
    "status" in obj &&
    ["active", "idle", "typing"].includes(obj.status) &&
    "joined_at" in obj &&
    typeof obj.joined_at === "string"
  );
}

export function useCollaboration(
  meetingId: string,
  shareToken: string,
  userInfo: UserInfo | { name: string; color: string }
) {
  const toast = useToast();
  const [state, setState] = useState<CollaborationState>({
    presence: {},
    annotations: [],
    notes: "",
    lastEditedBy: null,
    isConnected: false,
    connectionError: null,
  });

  const channelRef = useRef<RealtimeChannel | null>(null);
  const supabaseRef = useRef(createClientSafe());
  const presenceRef = useRef<Record<string, Presence>>({});
  const presenceKeyRef = useRef<string>("");
  const hasJoinedRef = useRef(false);
  const connectionManagerRef = useRef<ConnectionManager>(new ConnectionManager());
  const isMountedRef = useRef(true);

  const createChannel = useCallback(async (): Promise<RealtimeChannel> => {
    const supabase = supabaseRef.current;
    const channelName = `meeting-${shareToken}`;

    const channel = supabase.channel(channelName, {
      config: {
        presence: {
          key: presenceKeyRef.current,
        },
        broadcast: {
          self: false,
          ack: true,
        },
      },
    });

    return channel;
  }, [shareToken]);

  const setupChannelHandlers = useCallback(
    (channel: RealtimeChannel) => {
      // Update activity on any interaction
      const updateActivity = () => connectionManagerRef.current.updateActivity();

      // Handle presence sync
      channel
        .on("presence", { event: "sync" }, () => {
          updateActivity();
          if (!isMountedRef.current) return;

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
          updateActivity();
          console.log("User joined:", key, newPresences);
          if (!isMountedRef.current || !hasJoinedRef.current) return;

          if (Array.isArray(newPresences) && newPresences.length > 0) {
            const presenceData = newPresences[0];
            if (isPresence(presenceData) && presenceData.user_info.name !== userInfo.name) {
              toast.info(`${presenceData.user_info.name} joined the session`);
            }
          }
        })
        .on("presence", { event: "leave" }, ({ key, leftPresences }: any) => {
          updateActivity();
          console.log("User left:", key, leftPresences);
          if (!isMountedRef.current || !hasJoinedRef.current) return;

          if (Array.isArray(leftPresences) && leftPresences.length > 0) {
            const presenceData = leftPresences[0];
            if (isPresence(presenceData) && presenceData.user_info.name !== userInfo.name) {
              toast.info(`${presenceData.user_info.name} left the session`);
            }
          }
        });

      // Handle broadcast events
      channel
        .on("broadcast", { event: "annotation" }, ({ payload }) => {
          updateActivity();
          if (!isMountedRef.current) return;
          console.log("Received annotation:", payload);
          setState((prev) => ({
            ...prev,
            annotations: [...prev.annotations, payload],
          }));
        })
        .on("broadcast", { event: "annotation_delete" }, ({ payload }) => {
          updateActivity();
          if (!isMountedRef.current) return;
          setState((prev) => ({
            ...prev,
            annotations: prev.annotations.filter((a) => a.id !== payload.id),
          }));
        })
        .on("broadcast", { event: "notes_update" }, ({ payload }) => {
          updateActivity();
          if (!isMountedRef.current) return;
          setState((prev) => ({
            ...prev,
            notes: payload.content,
            lastEditedBy: payload.userInfo,
          }));
        })
        .on("broadcast", { event: "status_update" }, ({ payload }: any) => {
          updateActivity();
          if (!isMountedRef.current) return;
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
        })
        .on("broadcast", { event: "heartbeat" }, () => {
          updateActivity();
        });

      return channel;
    },
    [userInfo.name, toast]
  );

  const connectToChannel = useCallback(async () => {
    try {
      const channel = await createChannel();
      const enhancedChannel = setupChannelHandlers(channel);

      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error("Channel subscription timeout"));
        }, 10000);

        enhancedChannel.subscribe(async (status) => {
          console.log("Channel subscription status:", status);

          if (status === "SUBSCRIBED") {
            clearTimeout(timeout);
            if (isMountedRef.current) {
              setState((prev) => ({
                ...prev,
                isConnected: true,
                connectionError: null,
              }));
            }

            const presenceData: Presence = {
              user_info: userInfo as UserInfo,
              status: "active",
              joined_at: new Date().toISOString(),
            };

            console.log("Tracking presence with:", presenceData);
            await enhancedChannel.track(presenceData);
            hasJoinedRef.current = true;

            // Start heartbeat
            connectionManagerRef.current.startHeartbeat(enhancedChannel);

            resolve();
          } else if (status === "CLOSED") {
            clearTimeout(timeout);
            if (isMountedRef.current) {
              setState((prev) => ({
                ...prev,
                isConnected: false,
                connectionError: "Connection closed",
              }));
            }
            reject(new Error("Channel closed"));
          } else if (status === "CHANNEL_ERROR") {
            clearTimeout(timeout);
            console.error("Channel error occurred");
            if (isMountedRef.current) {
              setState((prev) => ({
                ...prev,
                isConnected: false,
                connectionError: "Channel error",
              }));
            }
            reject(new Error("Channel error"));
          }
        });
      });

      channelRef.current = enhancedChannel;
      return enhancedChannel;
    } catch (error) {
      console.error("Failed to connect to channel:", error);
      throw error;
    }
  }, [createChannel, setupChannelHandlers, userInfo]);

  const handleReconnect = useCallback(() => {
    if (!isMountedRef.current) return;

    connectionManagerRef.current.reconnect(
      connectToChannel,
      (channel) => {
        console.log("Reconnection successful");
        toast.success("Reconnected to session");
      },
      (error) => {
        console.error("Reconnection failed:", error);
        setState((prev) => ({
          ...prev,
          connectionError: "Failed to reconnect. Please refresh the page.",
        }));
        toast.error("Failed to reconnect. Please refresh the page.");
      }
    );
  }, [connectToChannel, toast]);

  useEffect(() => {
    isMountedRef.current = true;

    if (!meetingId || !shareToken || !userInfo.name) {
      console.log("Skipping collaboration - missing required data");
      return;
    }

    const supabase = supabaseRef.current;
    presenceKeyRef.current = `${shareToken}-${userInfo.name}-${Date.now()}`;

    const initializeCollaboration = async () => {
      try {
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

        if (isMountedRef.current) {
          setState((prev) => ({
            ...prev,
            annotations: annotations || [],
            notes: notesData?.content || "",
            lastEditedBy: notesData?.last_edited_by || null,
          }));
        }

        // Connect to channel
        try {
          await connectToChannel();
        } catch (error) {
          console.error("Initial connection failed:", error);
          handleReconnect();
        }
      } catch (error) {
        console.error("Collaboration initialization error:", error);
        if (isMountedRef.current) {
          setState((prev) => ({
            ...prev,
            connectionError: "Failed to initialize collaboration",
          }));
          toast.error("Failed to initialize collaboration");
        }
      }
    };

    initializeCollaboration();

    // Cleanup
    return () => {
      isMountedRef.current = false;
      hasJoinedRef.current = false;
      connectionManagerRef.current.destroy();

      if (channelRef.current) {
        console.log("Cleaning up collaboration channel");
        channelRef.current.unsubscribe();
        channelRef.current = null;
      }
    };
  }, [meetingId, shareToken, userInfo.name, userInfo.color, connectToChannel, handleReconnect, toast]);

  // Add highlight
  const addHighlight = useCallback(
    async (startLine: number, endLine: number, text: string) => {
      if (!channelRef.current || !state.isConnected) {
        toast.error("Not connected to collaboration session");
        return;
      }

      connectionManagerRef.current.updateActivity();

      const annotation: Omit<Annotation, "id" | "created_at"> = {
        meeting_id: meetingId,
        share_token: shareToken,
        user_info: userInfo as UserInfo,
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
    [meetingId, shareToken, userInfo, state.isConnected, toast]
  );

  // Add comment
  const addComment = useCallback(
    async (lineNumber: number, text: string, parentId?: string) => {
      if (!channelRef.current || !state.isConnected) {
        toast.error("Not connected to collaboration session");
        return;
      }

      connectionManagerRef.current.updateActivity();

      const annotation: Omit<Annotation, "id" | "created_at"> = {
        meeting_id: meetingId,
        share_token: shareToken,
        user_info: userInfo as UserInfo,
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
    [meetingId, shareToken, userInfo, state.isConnected, toast]
  );

  const updateNotes = useCallback(
    async (content: string) => {
      if (!channelRef.current || !state.isConnected) return;

      connectionManagerRef.current.updateActivity();

      try {
        // Update local state immediately
        setState((prev) => ({
          ...prev,
          notes: content,
          lastEditedBy: userInfo as UserInfo,
        }));

        await channelRef.current.send({
          type: "broadcast",
          event: "notes_update",
          payload: {
            content,
            userInfo,
            timestamp: Date.now(),
          },
        });

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
      } catch (error) {
        console.error("Failed to update notes:", error);
      }
    },
    [meetingId, shareToken, userInfo, state.isConnected]
  );

  // Update cursor position
  const updateCursor = useCallback(
    async (lineNumber: number, character: number) => {
      if (!channelRef.current || !state.isConnected) return;

      connectionManagerRef.current.updateActivity();

      try {
        await channelRef.current.send({
          type: "broadcast",
          event: "cursor_move",
          payload: {
            user_key: presenceKeyRef.current,
            position: { line_number: lineNumber, character },
          },
        });
      } catch (error) {
        console.error("Failed to update cursor:", error);
      }
    },
    [state.isConnected]
  );

  // Update status
  const updateStatus = useCallback(
    async (status: "active" | "idle" | "typing") => {
      if (!channelRef.current || !hasJoinedRef.current || !state.isConnected) return;

      connectionManagerRef.current.updateActivity();

      try {
        await channelRef.current.send({
          type: "broadcast",
          event: "status_update",
          payload: {
            user_key: presenceKeyRef.current,
            status,
          },
        });

        setState((prev) => {
          if (prev.presence[presenceKeyRef.current]) {
            return {
              ...prev,
              presence: {
                ...prev.presence,
                [presenceKeyRef.current]: {
                  ...prev.presence[presenceKeyRef.current],
                  status,
                },
              },
            };
          }
          return prev;
        });
      } catch (error) {
        console.error("Failed to update status:", error);
      }
    },
    [state.isConnected]
  );

  const activeUsers = Object.values(state.presence);

  return {
    presence: state.presence,
    annotations: state.annotations,
    notes: state.notes,
    lastEditedBy: state.lastEditedBy,
    isConnected: state.isConnected,
    connectionError: state.connectionError,
    activeUsers,
    addHighlight,
    addComment,
    updateNotes,
    updateCursor,
    updateStatus,
    reconnect: handleReconnect,
  };
}
