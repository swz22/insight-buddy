"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { RealtimeChannel } from "@supabase/supabase-js";
import { useToast } from "@/hooks/use-toast";
import { createPublicClient } from "@/lib/supabase/public-client";

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

function isValidPresence(obj: any): obj is Presence {
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
const NOTES_DEBOUNCE_DELAY = 500;

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
  const operationQueueRef = useRef<QueuedOperation[]>([]);
  const isProcessingQueueRef = useRef(false);
  const lastActivityRef = useRef(Date.now());
  const notesUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastBroadcastedNotesRef = useRef<string>("");
  const joinAnnouncedRef = useRef<Set<string>>(new Set());
  const stableUserInfo = useMemo<UserInfo>(
    () => ({
      name: userInfo.name,
      email: "email" in userInfo ? userInfo.email : undefined,
      avatar_url: "avatar_url" in userInfo ? userInfo.avatar_url : undefined,
      color: userInfo.color,
      sessionId: userInfo.sessionId,
    }),
    [userInfo.name, userInfo.color, userInfo.sessionId]
  );

  const presenceKey = useMemo(
    () => `${shareToken}-${stableUserInfo.sessionId}`,
    [shareToken, stableUserInfo.sessionId]
  );

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
    if (!meetingId || !shareToken || !stableUserInfo.name) {
      return;
    }

    let mounted = true;
    let hasTrackedPresence = false;
    let reconnectTimeout: NodeJS.Timeout | null = null;
    let cleanupInterval: NodeJS.Timeout | null = null;

    const initializeCollaboration = async () => {
      try {
        if (!mounted) return;

        setState((prev) => ({ ...prev, connectionError: false }));

        const [annotationsRes, notesRes] = await Promise.all([
          fetch(`/api/public/annotations?meeting_id=${meetingId}&share_token=${shareToken}`),
          fetch(`/api/public/notes?meeting_id=${meetingId}&share_token=${shareToken}`),
        ]);

        if (mounted) {
          if (annotationsRes.ok) {
            const annotations = await annotationsRes.json();
            setState((prev) => ({ ...prev, annotations: Array.isArray(annotations) ? annotations : [] }));
          }

          if (notesRes.ok) {
            const notesData = await notesRes.json();
            setState((prev) => ({
              ...prev,
              notes: notesData.content || "",
              lastEditedBy: notesData.last_edited_by || null,
            }));
            lastBroadcastedNotesRef.current = notesData.content || "";
          }
        }

        const channel = supabaseRef.current.channel(`public:meeting-${shareToken}`, {
          config: {
            presence: {
              key: presenceKey,
            },
            broadcast: {
              self: false,
              ack: true,
            },
          },
        });

        channelRef.current = channel;

        // Handle presence sync
        channel.on("presence", { event: "sync" }, () => {
          if (!mounted) return;

          const presenceState = channel.presenceState();
          const newPresence: Record<string, Presence> = {};

          Object.entries(presenceState).forEach(([key, presences]) => {
            if (Array.isArray(presences) && presences.length > 0) {
              const presenceData = presences[0];
              if (isValidPresence(presenceData)) {
                newPresence[key] = presenceData;
              }
            }
          });

          presenceRef.current = newPresence;
          setState((prev) => ({ ...prev, presence: newPresence }));
        });

        channel.on("presence", { event: "join" }, ({ key, newPresences }) => {
          if (!mounted || !hasTrackedPresence) return;

          if (Array.isArray(newPresences) && newPresences.length > 0) {
            const presenceData = newPresences[0];
            if (presenceData?.user_info?.name && presenceData.user_info.name !== stableUserInfo.name) {
              const joinKey = `${key}-${presenceData.user_info.name}`;
              if (!joinAnnouncedRef.current.has(joinKey)) {
                joinAnnouncedRef.current.add(joinKey);
                toastInfo(`${presenceData.user_info.name} joined the session`);
                setTimeout(() => joinAnnouncedRef.current.delete(joinKey), 300000);
              }
            }
          }
        });

        channel.on("presence", { event: "leave" }, ({ key, leftPresences }) => {
          if (!mounted || !hasTrackedPresence) return;

          if (Array.isArray(leftPresences) && leftPresences.length > 0) {
            const presenceData = leftPresences[0];
            if (presenceData?.user_info?.name && presenceData.user_info.name !== stableUserInfo.name) {
              toastInfo(`${presenceData.user_info.name} left the session`);
              const joinKey = `${key}-${presenceData.user_info.name}`;
              joinAnnouncedRef.current.delete(joinKey);
            }
          }
        });

        channel.on("broadcast", { event: "annotation" }, ({ payload }) => {
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
        });

        channel.on("broadcast", { event: "annotation_delete" }, ({ payload }) => {
          if (!mounted) return;

          setState((prev) => ({
            ...prev,
            annotations: prev.annotations.filter((a) => a.id !== payload.id),
          }));
        });

        channel.on("broadcast", { event: "notes_update" }, ({ payload }) => {
          if (!mounted) return;

          console.log("[Collaboration] Received notes update:", {
            content: payload.content?.substring(0, 50) + "...",
            from: payload.userInfo?.name,
            sessionId: payload.userInfo?.sessionId,
            mySessionId: stableUserInfo.sessionId,
          });

          if (payload.userInfo?.sessionId !== stableUserInfo.sessionId) {
            lastBroadcastedNotesRef.current = payload.content;
            setState((prev) => ({
              ...prev,
              notes: payload.content,
              lastEditedBy: payload.userInfo,
            }));
          }
        });

        await channel.subscribe(async (status) => {
          console.log("[Collaboration] Channel status:", status);

          if (status === "SUBSCRIBED" && mounted) {
            setState((prev) => ({ ...prev, isConnected: true, connectionError: false }));

            if (!hasTrackedPresence) {
              const presenceData: Presence = {
                user_info: stableUserInfo,
                status: "active",
                joined_at: new Date().toISOString(),
              };

              await channel.track(presenceData);
              hasTrackedPresence = true;
            }

            if (operationQueueRef.current.length > 0) {
              processOperationQueue();
            }
          } else if (status === "CHANNEL_ERROR" && mounted) {
            console.error("[Collaboration] Channel error");
            setState((prev) => ({ ...prev, isConnected: false, connectionError: true }));
          } else if (status === "CLOSED" && mounted) {
            console.log("[Collaboration] Channel closed");
            setState((prev) => ({ ...prev, isConnected: false }));
            hasTrackedPresence = false;
          }
        });

        cleanupInterval = setInterval(() => {
          const now = Date.now();
          const staleThreshold = now - IDLE_TIMEOUT;

          Object.entries(presenceRef.current).forEach(([key, presence]) => {
            if (key !== presenceKey) {
              const joinedAt = new Date(presence.joined_at).getTime();
              if (joinedAt < staleThreshold) {
                delete presenceRef.current[key];
                setState((prev) => {
                  const newPresence = { ...prev.presence };
                  delete newPresence[key];
                  return { ...prev, presence: newPresence };
                });
              }
            }
          });
        }, PRESENCE_CLEANUP_INTERVAL);
      } catch (error) {
        console.error("Collaboration initialization error:", error);
        if (mounted) {
          setState((prev) => ({ ...prev, connectionError: true, isConnected: false }));

          reconnectTimeout = setTimeout(() => {
            if (mounted) {
              initializeCollaboration();
            }
          }, RECONNECT_DELAY);
        }
      }
    };

    initializeCollaboration();

    // Cleanup
    return () => {
      mounted = false;
      joinAnnouncedRef.current.clear();

      if (channelRef.current) {
        channelRef.current.unsubscribe();
        channelRef.current = null;
      }

      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }

      if (cleanupInterval) {
        clearInterval(cleanupInterval);
      }

      if (notesUpdateTimeoutRef.current) {
        clearTimeout(notesUpdateTimeoutRef.current);
      }
    };
  }, [meetingId, shareToken, stableUserInfo.name, presenceKey]);

  useEffect(() => {
    if (state.isConnected && operationQueueRef.current.length > 0) {
      processOperationQueue();
    }
  }, [state.isConnected, processOperationQueue]);

  const updateNotes = useCallback(
    (content: string) => {
      lastActivityRef.current = Date.now();

      setState((prev) => ({
        ...prev,
        notes: content,
        lastEditedBy: stableUserInfo,
      }));

      if (notesUpdateTimeoutRef.current) {
        clearTimeout(notesUpdateTimeoutRef.current);
      }

      notesUpdateTimeoutRef.current = setTimeout(async () => {
        if (content === lastBroadcastedNotesRef.current) {
          return;
        }

        lastBroadcastedNotesRef.current = content;

        if (!state.isConnected) {
          queueOperation({
            type: "notes_update",
            payload: { content, userInfo: stableUserInfo },
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
              last_edited_by: stableUserInfo,
            }),
          });

          if (!response.ok) throw new Error("Failed to update notes");

          if (channelRef.current?.state === "joined") {
            console.log("[Collaboration] Broadcasting notes update:", {
              content: content.substring(0, 50) + "...",
              channelState: channelRef.current.state,
              user: stableUserInfo.name,
            });

            await channelRef.current.send({
              type: "broadcast",
              event: "notes_update",
              payload: { content, userInfo: stableUserInfo },
            });
          } else {
            console.warn("[Collaboration] Cannot broadcast - channel not joined:", channelRef.current?.state);
          }
        } catch (error) {
          console.error("Update notes error:", error);
          queueOperation({
            type: "notes_update",
            payload: { content, userInfo: stableUserInfo },
          });
        }
      }, NOTES_DEBOUNCE_DELAY);
    },
    [meetingId, shareToken, stableUserInfo, state.isConnected, queueOperation]
  );

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
        queueOperation({ type: "annotation_create", payload: annotation });
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

        if (channelRef.current?.state === "joined") {
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

        toastSuccess("Highlight added");
      } catch (error) {
        console.error("Add highlight error:", error);
        queueOperation({ type: "annotation_create", payload: annotation });
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
        queueOperation({ type: "annotation_create", payload: annotation });
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

        if (channelRef.current?.state === "joined") {
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

        toastSuccess("Comment added");
      } catch (error) {
        console.error("Add comment error:", error);
        queueOperation({ type: "annotation_create", payload: annotation });
        toastError("Failed to add comment, will retry");
      }
    },
    [meetingId, shareToken, stableUserInfo, state.isConnected, toastSuccess, toastError, toastInfo, queueOperation]
  );

  // Delete annotation
  const deleteAnnotation = useCallback(
    async (annotationId: string) => {
      lastActivityRef.current = Date.now();

      setState((prev) => ({
        ...prev,
        annotations: prev.annotations.filter((a) => a.id !== annotationId),
      }));

      if (!state.isConnected) {
        queueOperation({ type: "annotation_delete", payload: { id: annotationId } });
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

        if (channelRef.current?.state === "joined") {
          await channelRef.current.send({
            type: "broadcast",
            event: "annotation_delete",
            payload: { id: annotationId },
          });
        }

        toastSuccess("Annotation deleted");
      } catch (error) {
        console.error("Delete annotation error:", error);
        queueOperation({ type: "annotation_delete", payload: { id: annotationId } });
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

      setState((prev) => ({
        ...prev,
        annotations: prev.annotations.map((a) => (a.id === annotationId ? updatedAnnotation : a)),
      }));

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

        if (channelRef.current?.state === "joined") {
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

        toastSuccess("Annotation updated");
      } catch (error) {
        console.error("Edit annotation error:", error);
        toastError("Failed to update annotation");
      }
    },
    [shareToken, state.annotations, stableUserInfo.sessionId, toastSuccess, toastError]
  );

  const updateStatus = useCallback(
    async (status: "active" | "idle" | "typing") => {
      if (!channelRef.current || channelRef.current.state !== "joined") return;

      try {
        await channelRef.current.track({
          user_info: stableUserInfo,
          status,
          joined_at: presenceRef.current[presenceKey]?.joined_at || new Date().toISOString(),
        });
      } catch (error) {
        console.error("Update status error:", error);
      }
    },
    [stableUserInfo, presenceKey]
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
