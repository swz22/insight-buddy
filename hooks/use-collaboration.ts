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

interface UseCollaborationOptions {
  meetingId: string;
  shareToken: string;
  userInfo: UserInfo | { name: string; color: string; sessionId: string };
  enabled?: boolean;
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

export function useCollaboration({ meetingId, shareToken, userInfo, enabled = true }: UseCollaborationOptions) {
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
  const hasInitializedRef = useRef(false);

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
          if (operation.retries < MAX_RETRIES) {
            setTimeout(() => processOperationQueue(), RETRY_DELAY * operation.retries);
          }
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

  const updateNotes = useCallback(
    (content: string) => {
      setState((prev) => ({ ...prev, notes: content }));
      lastActivityRef.current = Date.now();

      if (notesUpdateTimeoutRef.current) {
        clearTimeout(notesUpdateTimeoutRef.current);
      }

      notesUpdateTimeoutRef.current = setTimeout(async () => {
        if (content !== lastBroadcastedNotesRef.current) {
          lastBroadcastedNotesRef.current = content;

          if (channelRef.current?.state === "joined") {
            await channelRef.current.send({
              type: "broadcast",
              event: "notes_update",
              payload: {
                meeting_id: meetingId,
                content,
                last_edited_by: stableUserInfo,
              },
            });
          }

          queueOperation({
            type: "notes_update",
            payload: { content, userInfo: stableUserInfo },
          });
        }
      }, NOTES_DEBOUNCE_DELAY);
    },
    [meetingId, stableUserInfo, queueOperation]
  );

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

  const deleteAnnotation = useCallback(
    async (annotationId: string) => {
      const annotation = state.annotations.find((a) => a.id === annotationId);

      if (!annotation || annotation.user_info.sessionId !== stableUserInfo.sessionId) {
        toastError("You can only delete your own annotations");
        return;
      }

      setState((prev) => ({
        ...prev,
        annotations: prev.annotations.filter((a) => a.id !== annotationId),
      }));

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
        setState((prev) => ({
          ...prev,
          annotations: [...prev.annotations, annotation],
        }));
        toastError("Failed to delete annotation");
      }
    },
    [shareToken, state.annotations, stableUserInfo.sessionId, toastSuccess, toastError]
  );

  const editAnnotation = useCallback(
    async (annotationId: string, newContent: string) => {
      const annotation = state.annotations.find((a) => a.id === annotationId);

      if (!annotation || annotation.user_info.sessionId !== stableUserInfo.sessionId) {
        toastError("You can only edit your own annotations");
        return;
      }

      setState((prev) => ({
        ...prev,
        annotations: prev.annotations.map((a) => (a.id === annotationId ? { ...a, content: newContent } : a)),
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

        if (channelRef.current?.state === "joined") {
          await channelRef.current.send({
            type: "broadcast",
            event: "annotation_update",
            payload: { id: annotationId, content: newContent },
          });
        }

        toastSuccess("Annotation updated");
      } catch (error) {
        console.error("Edit annotation error:", error);
        setState((prev) => ({
          ...prev,
          annotations: prev.annotations.map((a) => (a.id === annotationId ? { ...a, content: annotation.content } : a)),
        }));
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

  useEffect(() => {
    if (!enabled || !meetingId || !shareToken || !stableUserInfo.name) {
      return;
    }

    if (hasInitializedRef.current) {
      return;
    }
    hasInitializedRef.current = true;

    let mounted = true;
    let reconnectTimeout: NodeJS.Timeout | null = null;
    let cleanupInterval: NodeJS.Timeout | null = null;

    const initializeCollaboration = async () => {
      if (!mounted) return;

      try {
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

        channel.on("presence", { event: "sync" }, () => {
          if (!mounted) return;

          const presenceState = channel.presenceState();
          const newPresence: Record<string, Presence> = {};

          Object.entries(presenceState).forEach(([key, presences]) => {
            if (Array.isArray(presences) && presences.length > 0) {
              const presence = presences[0];
              if (isValidPresence(presence)) {
                const joinedAt = new Date(presence.joined_at).getTime();
                const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
                if (joinedAt > fiveMinutesAgo) {
                  newPresence[key] = presence;
                }
              }
            }
          });

          presenceRef.current = newPresence;
          setState((prev) => ({ ...prev, presence: newPresence }));
        });

        channel.on("presence", { event: "join" }, ({ key, newPresences }) => {
          if (!mounted || !Array.isArray(newPresences)) return;

          newPresences.forEach((presence) => {
            if (isValidPresence(presence)) {
              presenceRef.current[key] = presence;
              setState((prev) => ({
                ...prev,
                presence: { ...prev.presence, [key]: presence },
              }));
            }
          });
        });

        channel.on("presence", { event: "leave" }, ({ key }) => {
          if (!mounted) return;

          delete presenceRef.current[key];
          setState((prev) => {
            const newPresence = { ...prev.presence };
            delete newPresence[key];
            return { ...prev, presence: newPresence };
          });
        });

        channel.on("broadcast", { event: "annotation" }, ({ payload }) => {
          if (!mounted) return;

          setState((prev) => {
            const exists = prev.annotations.some((a) => a.id === payload.id);
            if (exists) return prev;
            return { ...prev, annotations: [...prev.annotations, payload] };
          });
        });

        channel.on("broadcast", { event: "annotation_update" }, ({ payload }) => {
          if (!mounted) return;

          setState((prev) => ({
            ...prev,
            annotations: prev.annotations.map((a) => (a.id === payload.id ? { ...a, content: payload.content } : a)),
          }));
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

          setState((prev) => ({
            ...prev,
            notes: payload.content,
            lastEditedBy: payload.last_edited_by,
          }));
          lastBroadcastedNotesRef.current = payload.content;
        });

        await channel.subscribe(async (status) => {
          if (!mounted) return;

          if (status === "SUBSCRIBED") {
            setState((prev) => ({ ...prev, isConnected: true, connectionError: false }));

            await channel.track({
              user_info: stableUserInfo,
              status: "active",
              joined_at: new Date().toISOString(),
            });

            if (operationQueueRef.current.length > 0) {
              setTimeout(() => {
                processOperationQueue();
              }, 1000);
            }
          } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
            setState((prev) => ({ ...prev, isConnected: false, connectionError: true }));
          }
        });

        cleanupInterval = setInterval(() => {
          const now = Date.now();
          if (now - lastActivityRef.current > IDLE_TIMEOUT) {
            updateStatus("idle");
          }

          const staleThreshold = now - 5 * 60 * 1000;
          Object.entries(presenceRef.current).forEach(([key, presence]) => {
            const lastSeen = new Date(presence.joined_at).getTime();
            if (lastSeen < staleThreshold) {
              delete presenceRef.current[key];
              setState((prev) => {
                const newPresence = { ...prev.presence };
                delete newPresence[key];
                return { ...prev, presence: newPresence };
              });
            }
          });
        }, PRESENCE_CLEANUP_INTERVAL);
      } catch (error) {
        console.error("Collaboration initialization error:", error);
        if (mounted) {
          setState((prev) => ({ ...prev, connectionError: true, isConnected: false }));

          reconnectTimeout = setTimeout(() => {
            hasInitializedRef.current = false;
            initializeCollaboration();
          }, RECONNECT_DELAY);
        }
      }
    };

    initializeCollaboration();

    return () => {
      mounted = false;
      hasInitializedRef.current = false;

      if (channelRef.current) {
        channelRef.current.untrack().catch(() => {});
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
  }, [enabled, meetingId, shareToken, stableUserInfo.name]);

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
