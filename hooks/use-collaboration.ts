"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { RealtimeChannel } from "@supabase/supabase-js";
import { useToast } from "@/hooks/use-toast";
import { createPublicClient } from "@/lib/supabase/public-client";
import { debounce } from "@/lib/utils/debounce";

interface UserInfo {
  name: string;
  email?: string;
  avatar_url?: string;
  color: string;
  sessionId: string;
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
  connectionError: boolean;
}

interface QueuedOperation {
  id: string;
  type: "annotation_create" | "annotation_update" | "annotation_delete" | "notes_update";
  payload: any;
  retries: number;
  timestamp: number;
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

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;
const RECONNECT_DELAY = 3000;
const PRESENCE_CLEANUP_INTERVAL = 30000;
const IDLE_TIMEOUT = 120000;

export function useCollaboration(
  meetingId: string,
  shareToken: string,
  userInfo: UserInfo | { name: string; color: string; sessionId: string }
) {
  const toast = useToast();
  const [state, setState] = useState<CollaborationState>({
    presence: {},
    annotations: [],
    notes: "",
    lastEditedBy: null,
    isConnected: false,
    connectionError: false,
  });

  const channelRef = useRef<RealtimeChannel | null>(null);
  const supabaseRef = useRef(createPublicClient());
  const presenceRef = useRef<Record<string, Presence>>({});
  const presenceKeyRef = useRef<string>("");
  const hasJoinedRef = useRef(false);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const cleanupIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const operationQueueRef = useRef<QueuedOperation[]>([]);
  const isProcessingQueueRef = useRef(false);
  const lastActivityRef = useRef(Date.now());

  useEffect(() => {
    if (!meetingId || !shareToken || !userInfo.name) {
      return;
    }

    const supabase = supabaseRef.current;
    let isMounted = true;

    presenceKeyRef.current = `${shareToken}-${userInfo.sessionId}`;

    const processOperationQueue = async () => {
      if (isProcessingQueueRef.current || operationQueueRef.current.length === 0) {
        return;
      }

      isProcessingQueueRef.current = true;
      const queue = [...operationQueueRef.current];

      for (const operation of queue) {
        if (!isMounted) break;

        try {
          switch (operation.type) {
            case "annotation_create":
              const { data: createdData, error: createError } = await supabase
                .from("meeting_annotations")
                .insert(operation.payload)
                .select()
                .single();

              if (createError) throw createError;

              if (channelRef.current) {
                await channelRef.current.send({
                  type: "broadcast",
                  event: "annotation",
                  payload: createdData,
                });
              }

              setState((prev) => ({
                ...prev,
                annotations: [...prev.annotations, createdData],
              }));
              break;

            case "annotation_delete":
              const { error: deleteError } = await supabase
                .from("meeting_annotations")
                .delete()
                .eq("id", operation.payload.id)
                .eq("share_token", shareToken);

              if (deleteError) throw deleteError;

              if (channelRef.current) {
                await channelRef.current.send({
                  type: "broadcast",
                  event: "annotation_delete",
                  payload: { id: operation.payload.id },
                });
              }

              setState((prev) => ({
                ...prev,
                annotations: prev.annotations.filter((a) => a.id !== operation.payload.id),
              }));
              break;

            case "notes_update":
              const { error: notesError } = await supabase
                .from("meeting_notes")
                .upsert({
                  meeting_id: meetingId,
                  share_token: shareToken,
                  content: operation.payload.content,
                  last_edited_by: operation.payload.userInfo,
                  updated_at: new Date().toISOString(),
                })
                .eq("meeting_id", meetingId)
                .eq("share_token", shareToken);

              if (notesError) throw notesError;

              if (channelRef.current) {
                await channelRef.current.send({
                  type: "broadcast",
                  event: "notes_update",
                  payload: operation.payload,
                });
              }
              break;
          }

          // Remove successful operation
          operationQueueRef.current = operationQueueRef.current.filter((op) => op.id !== operation.id);
        } catch (error) {
          console.error(`Failed to process operation ${operation.type}:`, error);

          operation.retries++;
          if (operation.retries >= MAX_RETRIES) {
            toast.error(`Failed to save ${operation.type.replace("_", " ")} after multiple attempts`);
            operationQueueRef.current = operationQueueRef.current.filter((op) => op.id !== operation.id);
          } else {
            // Retry later
            setTimeout(() => processOperationQueue(), RETRY_DELAY * operation.retries);
          }
        }
      }

      isProcessingQueueRef.current = false;
    };

    const cleanupStalePresence = () => {
      const now = Date.now();
      const staleThreshold = now - IDLE_TIMEOUT;

      Object.entries(presenceRef.current).forEach(([key, presence]) => {
        const joinedAt = new Date(presence.joined_at).getTime();
        if (joinedAt < staleThreshold && key !== presenceKeyRef.current) {
          delete presenceRef.current[key];
          setState((prev) => {
            const newPresence = { ...prev.presence };
            delete newPresence[key];
            return { ...prev, presence: newPresence };
          });
        }
      });
    };

    const initializeCollaboration = async () => {
      try {
        setState((prev) => ({ ...prev, connectionError: false }));

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
            lastEditedBy: notesData?.last_edited_by || null,
          }));
        }

        const channelName = `public:meeting-${shareToken}`;

        const channel = supabase.channel(channelName, {
          config: {
            presence: {
              key: presenceKeyRef.current,
            },
            broadcast: {
              self: false,
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
            if (!isMounted || !hasJoinedRef.current) return;

            if (Array.isArray(newPresences) && newPresences.length > 0) {
              const presenceData = newPresences[0];
              if (isPresence(presenceData) && presenceData.user_info.name !== userInfo.name) {
                toast.info(`${presenceData.user_info.name} joined the session`);
              }
            }
          })
          .on("presence", { event: "leave" }, ({ key, leftPresences }: any) => {
            if (!isMounted || !hasJoinedRef.current) return;

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
            if (!isMounted) return;
            setState((prev) => ({
              ...prev,
              annotations: [...prev.annotations.filter((a) => a.id !== payload.id), payload],
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
              lastEditedBy: payload.userInfo,
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
          if (status === "SUBSCRIBED") {
            if (isMounted) {
              setState((prev) => ({ ...prev, isConnected: true, connectionError: false }));
            }

            const presenceData: Presence = {
              user_info: userInfo as UserInfo,
              status: "active",
              joined_at: new Date().toISOString(),
            };

            await channel.track(presenceData);
            hasJoinedRef.current = true;

            // Process any queued operations
            processOperationQueue();
          } else if (status === "CLOSED" || status === "CHANNEL_ERROR") {
            if (isMounted) {
              setState((prev) => ({ ...prev, isConnected: false, connectionError: true }));

              // Schedule reconnection
              if (!reconnectTimeoutRef.current) {
                reconnectTimeoutRef.current = setTimeout(() => {
                  reconnectTimeoutRef.current = null;
                  initializeCollaboration();
                }, RECONNECT_DELAY);
              }
            }
          }
        });

        channelRef.current = channel;

        // Start cleanup interval
        if (!cleanupIntervalRef.current) {
          cleanupIntervalRef.current = setInterval(cleanupStalePresence, PRESENCE_CLEANUP_INTERVAL);
        }
      } catch (error) {
        console.error("Collaboration initialization error:", error);
        if (isMounted) {
          setState((prev) => ({ ...prev, connectionError: true }));
          toast.error("Failed to connect to collaboration session");

          // Schedule reconnection
          if (!reconnectTimeoutRef.current) {
            reconnectTimeoutRef.current = setTimeout(() => {
              reconnectTimeoutRef.current = null;
              initializeCollaboration();
            }, RECONNECT_DELAY);
          }
        }
      }
    };

    initializeCollaboration();

    // Cleanup
    return () => {
      isMounted = false;
      hasJoinedRef.current = false;

      if (channelRef.current) {
        channelRef.current.unsubscribe();
        channelRef.current = null;
      }

      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }

      if (cleanupIntervalRef.current) {
        clearInterval(cleanupIntervalRef.current);
        cleanupIntervalRef.current = null;
      }
    };
  }, [meetingId, shareToken, userInfo.name, userInfo.color, userInfo.sessionId]);

  // Queue operation for retry
  const queueOperation = (operation: Omit<QueuedOperation, "id" | "retries" | "timestamp">) => {
    const queuedOp: QueuedOperation = {
      ...operation,
      id: `${operation.type}-${Date.now()}-${Math.random()}`,
      retries: 0,
      timestamp: Date.now(),
    };

    operationQueueRef.current.push(queuedOp);

    // Try to process immediately if connected
    if (state.isConnected) {
      processOperationQueue();
    }
  };

  // Add highlight
  const addHighlight = useCallback(
    async (startLine: number, endLine: number, text: string) => {
      lastActivityRef.current = Date.now();

      const annotation: Omit<Annotation, "id" | "created_at"> = {
        meeting_id: meetingId,
        share_token: shareToken,
        user_info: userInfo as UserInfo,
        type: "highlight",
        content: text,
        position: { start_line: startLine, end_line: endLine },
      };

      if (!state.isConnected) {
        queueOperation({
          type: "annotation_create",
          payload: annotation,
        });
        toast.info("Highlight saved offline, will sync when connected");
        return;
      }

      try {
        const { data, error } = await supabaseRef.current
          .from("meeting_annotations")
          .insert(annotation)
          .select()
          .single();

        if (error) throw error;

        if (channelRef.current) {
          await channelRef.current.send({
            type: "broadcast",
            event: "annotation",
            payload: data,
          });
        }

        setState((prev) => ({
          ...prev,
          annotations: [...prev.annotations, data],
        }));

        toast.success("Highlight added");
      } catch (error) {
        console.error("Add highlight error:", error);
        queueOperation({
          type: "annotation_create",
          payload: annotation,
        });
        toast.error("Failed to add highlight, will retry");
      }
    },
    [meetingId, shareToken, userInfo, state.isConnected, toast]
  );

  // Add comment
  const addComment = useCallback(
    async (lineNumber: number, text: string, parentId?: string) => {
      lastActivityRef.current = Date.now();

      const annotation: Omit<Annotation, "id" | "created_at"> = {
        meeting_id: meetingId,
        share_token: shareToken,
        user_info: userInfo as UserInfo,
        type: "comment",
        content: text,
        position: { line_number: lineNumber },
        parent_id: parentId,
      };

      if (!state.isConnected) {
        queueOperation({
          type: "annotation_create",
          payload: annotation,
        });
        toast.info("Comment saved offline, will sync when connected");
        return;
      }

      try {
        const { data, error } = await supabaseRef.current
          .from("meeting_annotations")
          .insert(annotation)
          .select()
          .single();

        if (error) throw error;

        if (channelRef.current) {
          await channelRef.current.send({
            type: "broadcast",
            event: "annotation",
            payload: data,
          });
        }

        setState((prev) => ({
          ...prev,
          annotations: [...prev.annotations, data],
        }));

        toast.success("Comment added");
      } catch (error) {
        console.error("Add comment error:", error);
        queueOperation({
          type: "annotation_create",
          payload: annotation,
        });
        toast.error("Failed to add comment, will retry");
      }
    },
    [meetingId, shareToken, userInfo, state.isConnected, toast]
  );

  // Delete annotation
  const deleteAnnotation = useCallback(
    async (annotationId: string) => {
      lastActivityRef.current = Date.now();

      if (!state.isConnected) {
        queueOperation({
          type: "annotation_delete",
          payload: { id: annotationId },
        });

        // Optimistically update UI
        setState((prev) => ({
          ...prev,
          annotations: prev.annotations.filter((a) => a.id !== annotationId),
        }));

        toast.info("Delete saved offline, will sync when connected");
        return;
      }

      try {
        const { error } = await supabaseRef.current
          .from("meeting_annotations")
          .delete()
          .eq("id", annotationId)
          .eq("share_token", shareToken);

        if (error) throw error;

        if (channelRef.current) {
          await channelRef.current.send({
            type: "broadcast",
            event: "annotation_delete",
            payload: { id: annotationId },
          });
        }

        setState((prev) => ({
          ...prev,
          annotations: prev.annotations.filter((a) => a.id !== annotationId),
        }));

        toast.success("Annotation deleted");
      } catch (error) {
        console.error("Delete annotation error:", error);
        queueOperation({
          type: "annotation_delete",
          payload: { id: annotationId },
        });
        toast.error("Failed to delete, will retry");
      }
    },
    [shareToken, state.isConnected, toast]
  );

  // Edit annotation
  const editAnnotation = useCallback(
    async (annotationId: string, newContent: string) => {
      lastActivityRef.current = Date.now();

      const annotation = state.annotations.find((a) => a.id === annotationId);
      if (!annotation) return;

      const updatedAnnotation = { ...annotation, content: newContent };

      if (!state.isConnected) {
        // Optimistically update UI
        setState((prev) => ({
          ...prev,
          annotations: prev.annotations.map((a) => (a.id === annotationId ? updatedAnnotation : a)),
        }));

        toast.info("Edit saved offline, will sync when connected");
        return;
      }

      try {
        const { data, error } = await supabaseRef.current
          .from("meeting_annotations")
          .update({ content: newContent })
          .eq("id", annotationId)
          .eq("share_token", shareToken)
          .select()
          .single();

        if (error) throw error;

        if (channelRef.current) {
          await channelRef.current.send({
            type: "broadcast",
            event: "annotation",
            payload: data,
          });
        }

        setState((prev) => ({
          ...prev,
          annotations: prev.annotations.map((a) => (a.id === annotationId ? data : a)),
        }));

        toast.success("Annotation updated");
      } catch (error) {
        console.error("Edit annotation error:", error);
        toast.error("Failed to update annotation");
      }
    },
    [shareToken, state.annotations, state.isConnected, toast]
  );

  // Debounced notes update
  const debouncedNotesUpdate = useCallback(
    debounce(async (content: string) => {
      const payload = {
        content,
        userInfo: userInfo as UserInfo,
        timestamp: Date.now(),
      };

      if (!state.isConnected) {
        queueOperation({
          type: "notes_update",
          payload,
        });
        return;
      }

      try {
        const { error } = await supabaseRef.current
          .from("meeting_notes")
          .upsert({
            meeting_id: meetingId,
            share_token: shareToken,
            content,
            last_edited_by: userInfo as UserInfo,
            updated_at: new Date().toISOString(),
          })
          .eq("meeting_id", meetingId)
          .eq("share_token", shareToken);

        if (error) throw error;

        if (channelRef.current) {
          await channelRef.current.send({
            type: "broadcast",
            event: "notes_update",
            payload,
          });
        }
      } catch (error) {
        console.error("Failed to update notes:", error);
        queueOperation({
          type: "notes_update",
          payload,
        });
      }
    }, 1000),
    [meetingId, shareToken, userInfo, state.isConnected]
  );

  const updateNotes = useCallback(
    (content: string) => {
      lastActivityRef.current = Date.now();

      // Update local state immediately
      setState((prev) => ({
        ...prev,
        notes: content,
        lastEditedBy: userInfo as UserInfo,
      }));

      // Debounced save to database
      debouncedNotesUpdate(content);
    },
    [userInfo, debouncedNotesUpdate]
  );

  // Update status with rate limiting
  const updateStatus = useCallback(
    debounce(async (status: "active" | "idle" | "typing") => {
      if (!channelRef.current || !hasJoinedRef.current || !state.isConnected) return;

      lastActivityRef.current = Date.now();

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
    }, 500),
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
    deleteAnnotation,
    editAnnotation,
    updateNotes,
    updateStatus,
  };
}
