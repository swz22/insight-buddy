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
  const { error: toastError, success: toastSuccess, info: toastInfo } = useToast();
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
  const isInitializedRef = useRef(false);

  const stableUserInfo: UserInfo = {
    name: userInfo.name,
    email: "email" in userInfo ? userInfo.email : undefined,
    avatar_url: "avatar_url" in userInfo ? userInfo.avatar_url : undefined,
    color: userInfo.color,
    sessionId: userInfo.sessionId,
  };

  const processOperationQueue = useCallback(async () => {
    if (isProcessingQueueRef.current || operationQueueRef.current.length === 0) {
      return;
    }

    isProcessingQueueRef.current = true;
    const queue = [...operationQueueRef.current];

    for (const operation of queue) {
      if (operation.retries >= MAX_RETRIES) {
        operationQueueRef.current = operationQueueRef.current.filter((op) => op.id !== operation.id);
        toastError(`Failed to sync ${operation.type} after ${MAX_RETRIES} attempts`);
        continue;
      }

      try {
        let success = false;

        switch (operation.type) {
          case "annotation_create":
            const createResponse = await fetch("/api/public/annotations", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(operation.payload),
            });
            success = createResponse.ok;
            break;

          case "annotation_delete":
            const deleteResponse = await fetch("/api/public/annotations", {
              method: "DELETE",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                id: operation.payload.id,
                share_token: shareToken,
                sessionId: stableUserInfo.sessionId,
              }),
            });
            success = deleteResponse.ok;
            break;

          case "notes_update":
            const notesResponse = await fetch("/api/public/notes", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                meeting_id: meetingId,
                share_token: shareToken,
                content: operation.payload.content,
                last_edited_by: operation.payload.userInfo,
              }),
            });
            success = notesResponse.ok;
            break;
        }

        if (success) {
          operationQueueRef.current = operationQueueRef.current.filter((op) => op.id !== operation.id);
        } else {
          operation.retries++;
          setTimeout(() => processOperationQueue(), RETRY_DELAY * operation.retries);
        }
      } catch (error) {
        operation.retries++;
        if (operation.retries < MAX_RETRIES) {
          setTimeout(() => processOperationQueue(), RETRY_DELAY * operation.retries);
        } else {
          operationQueueRef.current = operationQueueRef.current.filter((op) => op.id !== operation.id);
        }
      }
    }

    isProcessingQueueRef.current = false;
  }, [meetingId, shareToken, stableUserInfo.sessionId, toastError]);

  const cleanupStalePresence = useCallback(() => {
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
  }, []);

  const queueOperation = useCallback(
    (operation: Omit<QueuedOperation, "id" | "retries" | "timestamp">) => {
      const queuedOp: QueuedOperation = {
        ...operation,
        id: `${operation.type}-${Date.now()}-${Math.random()}`,
        retries: 0,
        timestamp: Date.now(),
      };

      operationQueueRef.current.push(queuedOp);

      if (state.isConnected) {
        processOperationQueue();
      }
    },
    [state.isConnected, processOperationQueue]
  );

  useEffect(() => {
    if (!meetingId || !shareToken || !stableUserInfo.name || isInitializedRef.current) {
      return;
    }

    isInitializedRef.current = true;
    const supabase = supabaseRef.current;
    presenceKeyRef.current = `${shareToken}-${stableUserInfo.sessionId}`;
    let mounted = true;

    const initializeCollaboration = async () => {
      try {
        if (!mounted) return;

        if (mounted) {
          setState((prev) => ({ ...prev, connectionError: false }));
        }

        // Fetch existing annotations
        try {
          const annotationsResponse = await fetch(
            `/api/public/annotations?meeting_id=${meetingId}&share_token=${shareToken}`
          );
          if (annotationsResponse.ok) {
            const annotations = await annotationsResponse.json();
            if (mounted && Array.isArray(annotations)) {
              setState((prev) => ({ ...prev, annotations }));
            }
          }
        } catch (err) {
          console.error("Failed to fetch annotations:", err);
        }

        // Fetch collaborative notes
        try {
          const notesResponse = await fetch(`/api/public/notes?meeting_id=${meetingId}&share_token=${shareToken}`);
          if (notesResponse.ok) {
            const notesData = await notesResponse.json();
            if (mounted && notesData) {
              setState((prev) => ({
                ...prev,
                notes: notesData.content || "",
                lastEditedBy: notesData.last_edited_by || null,
              }));
            }
          }
        } catch (err) {
          console.error("Failed to fetch notes:", err);
        }

        const channelName = `public:meeting-${shareToken}`;

        const channel = supabase.channel(channelName, {
          config: {
            presence: {
              key: presenceKeyRef.current,
            },
            broadcast: {
              self: false,
              ack: false,
            },
          },
        });

        channelRef.current = channel;

        // Handle presence sync
        channel
          .on("presence", { event: "sync" }, () => {
            if (!mounted) return;

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
            if (mounted) {
              setState((prev) => ({
                ...prev,
                presence: newPresence,
              }));
            }
          })
          .on("presence", { event: "join" }, ({ key, newPresences }: any) => {
            if (!mounted || !hasJoinedRef.current) return;

            if (Array.isArray(newPresences) && newPresences.length > 0) {
              const presenceData = newPresences[0];
              if (isPresence(presenceData) && presenceData.user_info.name !== stableUserInfo.name) {
                toastInfo(`${presenceData.user_info.name} joined the session`);
              }
            }
          })
          .on("presence", { event: "leave" }, ({ key, leftPresences }: any) => {
            if (!mounted || !hasJoinedRef.current) return;

            if (Array.isArray(leftPresences) && leftPresences.length > 0) {
              const presenceData = leftPresences[0];
              if (isPresence(presenceData) && presenceData.user_info.name !== stableUserInfo.name) {
                toastInfo(`${presenceData.user_info.name} left the session`);
              }
            }
          })
          .on("broadcast", { event: "annotation" }, ({ payload }) => {
            if (!mounted) return;

            setState((prev) => {
              const exists = prev.annotations.some((a) => a.id === payload.id);
              if (exists) {
                return {
                  ...prev,
                  annotations: prev.annotations.map((a) => (a.id === payload.id ? payload : a)),
                };
              }
              return {
                ...prev,
                annotations: [...prev.annotations, payload],
              };
            });
          })
          .on("broadcast", { event: "annotation_delete" }, ({ payload }) => {
            if (!mounted) return;

            setState((prev) => ({
              ...prev,
              annotations: prev.annotations.filter((a) => a.id !== payload.id),
            }));
          })
          .on("broadcast", { event: "notes_update" }, ({ payload }) => {
            if (!mounted) return;

            setState((prev) => ({
              ...prev,
              notes: payload.content,
              lastEditedBy: payload.userInfo,
            }));
          })
          .on("broadcast", { event: "status_update" }, ({ payload }) => {
            if (!mounted) return;

            const { user_key, status } = payload;
            if (presenceRef.current[user_key]) {
              presenceRef.current[user_key].status = status;
              if (mounted) {
                setState((prev) => ({
                  ...prev,
                  presence: { ...presenceRef.current },
                }));
              }
            }
          })
          .subscribe(async (status) => {
            if (status === "SUBSCRIBED") {
              if (mounted) {
                setState((prev) => ({ ...prev, isConnected: true, connectionError: false }));
              }

              const presenceData: Presence = {
                user_info: stableUserInfo,
                status: "active",
                joined_at: new Date().toISOString(),
              };

              await channel.track(presenceData);
              hasJoinedRef.current = true;

              // Process any queued operations
              if (operationQueueRef.current.length > 0) {
                processOperationQueue();
              }
            } else if (status === "CHANNEL_ERROR") {
              if (mounted) {
                setState((prev) => ({ ...prev, isConnected: false, connectionError: true }));
              }
            } else if (status === "TIMED_OUT") {
              if (mounted) {
                setState((prev) => ({ ...prev, isConnected: false }));
              }
            }
          });

        // Start cleanup interval
        cleanupIntervalRef.current = setInterval(cleanupStalePresence, PRESENCE_CLEANUP_INTERVAL);
      } catch (error) {
        console.error("Collaboration initialization error:", error);
        if (mounted) {
          setState((prev) => ({ ...prev, connectionError: true, isConnected: false }));

          if (!reconnectTimeoutRef.current) {
            reconnectTimeoutRef.current = setTimeout(() => {
              reconnectTimeoutRef.current = null;
              if (mounted) {
                initializeCollaboration();
              }
            }, RECONNECT_DELAY);
          }
        }
      }
    };

    initializeCollaboration();

    // Cleanup
    return () => {
      mounted = false;
      isInitializedRef.current = false;
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
  }, [meetingId, shareToken, stableUserInfo.name, stableUserInfo.sessionId]);

  useEffect(() => {}, [processOperationQueue, cleanupStalePresence, toastError, toastInfo]);

  // Add highlight
  const addHighlight = useCallback(
    async (startLine: number, endLine: number, text: string) => {
      lastActivityRef.current = Date.now();

      const annotation: Omit<Annotation, "id" | "created_at"> = {
        meeting_id: meetingId,
        share_token: shareToken,
        user_info: stableUserInfo,
        type: "highlight",
        content: text,
        position: { start_line: startLine, end_line: endLine },
      };

      if (!state.isConnected) {
        queueOperation({
          type: "annotation_create",
          payload: annotation,
        });
        toastInfo("Highlight saved offline, will sync when connected");
        return;
      }

      try {
        const response = await fetch("/api/public/annotations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(annotation),
        });

        if (!response.ok) throw new Error("Failed to create annotation");

        const data = await response.json();

        if (channelRef.current) {
          try {
            await channelRef.current.send({
              type: "broadcast",
              event: "annotation",
              payload: data,
            });
          } catch (err) {
            console.error("Failed to broadcast highlight:", err);
          }
        }

        setState((prev) => ({
          ...prev,
          annotations: [...prev.annotations, data],
        }));

        toastSuccess("Highlight added");
      } catch (error: any) {
        console.error("Add highlight error:", error);
        queueOperation({
          type: "annotation_create",
          payload: annotation,
        });
        toastError("Failed to add highlight, will retry");
      }
    },
    [meetingId, shareToken, stableUserInfo, state.isConnected, toastSuccess, toastError, toastInfo, queueOperation]
  );

  // Add comment
  const addComment = useCallback(
    async (lineNumber: number, text: string, parentId?: string) => {
      lastActivityRef.current = Date.now();

      const annotation: Omit<Annotation, "id" | "created_at"> = {
        meeting_id: meetingId,
        share_token: shareToken,
        user_info: stableUserInfo,
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
        toastInfo("Comment saved offline, will sync when connected");
        return;
      }

      try {
        const response = await fetch("/api/public/annotations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(annotation),
        });

        if (!response.ok) throw new Error("Failed to create comment");

        const data = await response.json();

        if (channelRef.current) {
          try {
            await channelRef.current.send({
              type: "broadcast",
              event: "annotation",
              payload: data,
            });
          } catch (err) {
            console.error("Failed to broadcast comment:", err);
          }
        }

        setState((prev) => ({
          ...prev,
          annotations: [...prev.annotations, data],
        }));

        toastSuccess("Comment added");
      } catch (error: any) {
        console.error("Add comment error:", error);
        queueOperation({
          type: "annotation_create",
          payload: annotation,
        });
        toastError("Failed to add comment, will retry");
      }
    },
    [meetingId, shareToken, stableUserInfo, state.isConnected, toastSuccess, toastError, toastInfo, queueOperation]
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

        setState((prev) => ({
          ...prev,
          annotations: prev.annotations.filter((a) => a.id !== annotationId),
        }));

        toastInfo("Delete saved offline, will sync when connected");
        return;
      }

      try {
        const response = await fetch("/api/public/annotations", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: annotationId,
            share_token: shareToken,
            sessionId: stableUserInfo.sessionId,
          }),
        });

        if (!response.ok) throw new Error("Failed to delete annotation");

        if (channelRef.current) {
          try {
            await channelRef.current.send({
              type: "broadcast",
              event: "annotation_delete",
              payload: { id: annotationId },
            });
          } catch (err) {
            console.error("Failed to broadcast delete:", err);
          }
        }

        setState((prev) => ({
          ...prev,
          annotations: prev.annotations.filter((a) => a.id !== annotationId),
        }));

        toastSuccess("Annotation deleted");
      } catch (error: any) {
        console.error("Delete annotation error:", error);
        queueOperation({
          type: "annotation_delete",
          payload: { id: annotationId },
        });
        toastError("Failed to delete, will retry");
      }
    },
    [shareToken, state.isConnected, stableUserInfo.sessionId, toastSuccess, toastError, toastInfo, queueOperation]
  );

  // Edit annotation
  const editAnnotation = useCallback(
    async (annotationId: string, newContent: string) => {
      lastActivityRef.current = Date.now();

      const annotation = state.annotations.find((a) => a.id === annotationId);
      if (!annotation) return;

      const updatedAnnotation = { ...annotation, content: newContent };

      if (!state.isConnected) {
        setState((prev) => ({
          ...prev,
          annotations: prev.annotations.map((a) => (a.id === annotationId ? updatedAnnotation : a)),
        }));

        toastInfo("Edit saved offline, will sync when connected");
        return;
      }

      try {
        const response = await fetch("/api/public/annotations", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: annotationId,
            share_token: shareToken,
            sessionId: stableUserInfo.sessionId,
            content: newContent,
          }),
        });

        if (!response.ok) throw new Error("Failed to update annotation");

        const data = await response.json();

        if (channelRef.current) {
          try {
            await channelRef.current.send({
              type: "broadcast",
              event: "annotation",
              payload: data,
            });
          } catch (err) {
            console.error("Failed to broadcast edit:", err);
          }
        }

        setState((prev) => ({
          ...prev,
          annotations: prev.annotations.map((a) => (a.id === annotationId ? data : a)),
        }));

        toastSuccess("Annotation updated");
      } catch (error: any) {
        console.error("Edit annotation error:", error);
        toastError("Failed to update annotation");
      }
    },
    [shareToken, state.annotations, state.isConnected, stableUserInfo.sessionId, toastSuccess, toastError, toastInfo]
  );

  const debouncedUpdateNotes = useRef(
    debounce(async (content: string, userInfo: UserInfo) => {
      const payload = {
        content,
        userInfo,
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
        const response = await fetch("/api/public/notes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            meeting_id: meetingId,
            share_token: shareToken,
            content,
            last_edited_by: userInfo,
          }),
        });

        if (!response.ok) throw new Error("Failed to update notes");

        if (channelRef.current && channelRef.current.state === "joined") {
          try {
            await channelRef.current.send({
              type: "broadcast",
              event: "notes_update",
              payload: {
                content,
                userInfo,
              },
            });
          } catch (err) {
            console.error("Failed to broadcast notes update:", err);
          }
        }
      } catch (error) {
        console.error("Update notes error:", error);
        queueOperation({
          type: "notes_update",
          payload,
        });
      }
    }, 1000)
  ).current;

  const updateNotes = useCallback(
    (content: string) => {
      lastActivityRef.current = Date.now();

      // Update local state immediately
      setState((prev) => ({
        ...prev,
        notes: content,
        lastEditedBy: stableUserInfo,
      }));

      debouncedUpdateNotes(content, stableUserInfo);
    },
    [stableUserInfo, debouncedUpdateNotes]
  );

  const updateStatus = useCallback(
    async (status: "active" | "idle" | "typing") => {
      if (!channelRef.current || !hasJoinedRef.current) return;

      try {
        await channelRef.current.track({
          user_info: stableUserInfo,
          status,
          joined_at: presenceRef.current[presenceKeyRef.current]?.joined_at || new Date().toISOString(),
        });

        if (channelRef.current.state === "joined") {
          await channelRef.current.send({
            type: "broadcast",
            event: "status_update",
            payload: {
              user_key: presenceKeyRef.current,
              status,
            },
          });
        }
      } catch (error) {
        console.error("Update status error:", error);
      }
    },
    [stableUserInfo]
  );

  return {
    presence: state.presence,
    annotations: state.annotations,
    notes: state.notes,
    lastEditedBy: state.lastEditedBy,
    isConnected: state.isConnected,
    connectionError: state.connectionError,
    addHighlight,
    addComment,
    deleteAnnotation,
    editAnnotation,
    updateNotes,
    updateStatus,
  };
}
