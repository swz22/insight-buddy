"use client";

import { useState, useEffect, useRef, Fragment, useCallback } from "react";
import { CommentHighlight } from "./comment-highlight";
import { CommentThread } from "./comment-thread";
import { SelectionToolbar } from "./selection-toolbar";
import { CommentPresenceIndicator } from "./comment-presence";
import { getTextSelection, createHighlightSegments } from "@/lib/utils/comments";
import { cn } from "@/lib/utils";
import { MessageSquare } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { Comment, TextSelection, CommentPresence, CommentHighlight as CommentHighlightType } from "@/types/comments";
import { generateCommentId, mergeOverlappingHighlights, clearSelection } from "@/lib/utils/comments";

interface CommentableTranscriptProps {
  meetingId: string;
  transcript: string;
  parsedTranscript?: Array<{
    speaker: string;
    text: string;
    timestamp?: number;
  }>;
  enabled?: boolean;
  isDemo?: boolean;
  className?: string;
}

export function CommentableTranscript({
  meetingId,
  transcript,
  parsedTranscript,
  enabled = true,
  isDemo = false,
  className,
}: CommentableTranscriptProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [presence, setPresence] = useState<CommentPresence[]>([]);
  const [selection, setSelection] = useState<TextSelection | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const selectionTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [threadPosition, setThreadPosition] = useState<{ x: number; y: number } | null>(null);
  const [selectionRect, setSelectionRect] = useState<DOMRect | null>(null);
  const [hoveredHighlight, setHoveredHighlight] = useState<string | null>(null);
  const [showHint, setShowHint] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  const highlights: CommentHighlightType[] = comments.length > 0 
    ? mergeOverlappingHighlights(
        comments.map((comment) => ({
          id: comment.id,
          start: comment.selection.start,
          end: comment.selection.end,
          commentCount: 1,
          isActive: false,
          isHovered: false,
          userColors: [comment.userColor],
        }))
      )
    : [];

  const currentUserId = isDemo ? "demo-user" : (comments[0]?.userId || "");

  useEffect(() => {
    if (!enabled || !meetingId || isDemo) return;

    const loadComments = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/meetings/${meetingId}/comments`);
        if (response.ok) {
          const data = await response.json();
          const commentsData = data.data?.comments || data.comments || [];
          
          const formattedComments: Comment[] = commentsData.map((c: any) => ({
            id: c.id,
            text: c.text,
            selection: {
              start: c.selection_start,
              end: c.selection_end,
              text: c.selection_text,
              contextBefore: c.context_before,
              contextAfter: c.context_after,
              paragraphId: c.paragraph_id,
              speakerName: c.speaker_name,
            },
            userId: c.user_id,
            userName: c.user_name,
            userAvatar: c.user_avatar,
            userColor: c.user_color,
            createdAt: c.created_at,
            updatedAt: c.updated_at,
            meetingId: c.meeting_id,
            parentId: c.parent_id,
            resolved: c.resolved,
          }));
          
          setComments(formattedComments);
        }
      } catch (error) {
        console.error("Failed to load comments:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadComments();
  }, [meetingId, enabled, isDemo]);

  useEffect(() => {
    if (comments.length > 0) {
      setShowHint(false);
    }
  }, [comments.length]);

  const clearSelectionState = useCallback(() => {
    clearSelection();
    setSelection(null);
    setSelectionRect(null);
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const handleMouseUp = () => {
      setTimeout(() => {
        const newSelection = getTextSelection();
        if (newSelection && newSelection.text.length > 2) {
          const range = window.getSelection()?.getRangeAt(0);
          if (range) {
            const rect = range.getBoundingClientRect();
            setSelectionRect(rect);
            setSelection(newSelection);
          }
        }
      }, 50);
    };

    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest(".comment-thread") && !target.closest(".selection-toolbar")) {
        setActiveThreadId(null);
        clearSelectionState();
      }
    };

    document.addEventListener("mouseup", handleMouseUp);
    document.addEventListener("mousedown", handleMouseDown);

    return () => {
      document.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("mousedown", handleMouseDown);
    };
  }, [enabled, clearSelectionState]);

  const addComment = useCallback(async (text: string, commentSelection: TextSelection) => {
    const newComment: Comment = {
      id: generateCommentId(),
      text,
      selection: commentSelection,
      userId: isDemo ? "demo-user" : "user-id",
      userName: isDemo ? "Demo User" : "User",
      userColor: "#a855f7",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      meetingId,
    };

    setComments((prev) => [...prev, newComment]);
    clearSelectionState();

    if (!isDemo) {
      try {
        const response = await fetch(`/api/meetings/${meetingId}/comments`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text,
            selection: commentSelection,
          }),
        });

        if (!response.ok) throw new Error("Failed to add comment");
        
        const result = await response.json();
        const savedComment = result.data || result;
        
        const formattedComment: Comment = {
          id: savedComment.id,
          text: savedComment.text,
          selection: {
            start: savedComment.selection_start,
            end: savedComment.selection_end,
            text: savedComment.selection_text,
            contextBefore: savedComment.context_before,
            contextAfter: savedComment.context_after,
            paragraphId: savedComment.paragraph_id,
            speakerName: savedComment.speaker_name,
          },
          userId: savedComment.user_id,
          userName: savedComment.user_name,
          userAvatar: savedComment.user_avatar,
          userColor: savedComment.user_color,
          createdAt: savedComment.created_at,
          updatedAt: savedComment.updated_at,
          meetingId: savedComment.meeting_id,
          parentId: savedComment.parent_id,
          resolved: savedComment.resolved,
        };
        
        setComments((prev) =>
          prev.map((c) => (c.id === newComment.id ? formattedComment : c))
        );
      } catch (error) {
        setComments((prev) => prev.filter((c) => c.id !== newComment.id));
        console.error("Failed to add comment:", error);
      }
    }
  }, [meetingId, isDemo, clearSelectionState]);

  const updateComment = useCallback(async (commentId: string, text: string) => {
    const comment = comments.find((c) => c.id === commentId);
    if (!comment) return;

    const previousText = comment.text;
    setComments((prev) =>
      prev.map((c) =>
        c.id === commentId
          ? { ...c, text, updatedAt: new Date().toISOString() }
          : c
      )
    );

    if (!isDemo) {
      try {
        const response = await fetch(`/api/meetings/${meetingId}/comments/${commentId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text }),
        });

        if (!response.ok) throw new Error("Failed to update comment");
        
        const result = await response.json();
        const updatedComment = result.data || result;
        
        const formattedComment: Comment = {
          ...comment,
          text: updatedComment.text,
          updatedAt: updatedComment.updated_at,
        };
        
        setComments((prev) =>
          prev.map((c) => (c.id === commentId ? formattedComment : c))
        );
      } catch (error) {
        setComments((prev) =>
          prev.map((c) =>
            c.id === commentId ? { ...c, text: previousText } : c
          )
        );
        console.error("Failed to update comment:", error);
      }
    }
  }, [comments, meetingId, isDemo]);

  const deleteComment = useCallback(async (commentId: string) => {
    const comment = comments.find((c) => c.id === commentId);
    if (!comment) return;

    setComments((prev) => prev.filter((c) => c.id !== commentId));

    if (!isDemo) {
      try {
        const response = await fetch(`/api/meetings/${meetingId}/comments/${commentId}`, {
          method: "DELETE",
        });

        if (!response.ok) throw new Error("Failed to delete comment");
      } catch (error) {
        setComments((prev) => [...prev, comment]);
        console.error("Failed to delete comment:", error);
      }
    }
  }, [comments, meetingId, isDemo]);

  const handleHighlightClick = useCallback((highlightId: string, e: React.MouseEvent<HTMLSpanElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setThreadPosition({
      x: rect.left + rect.width / 2,
      y: rect.bottom + 10,
    });
    setActiveThreadId(highlightId);
    clearSelectionState();
  }, [clearSelectionState]);

  const handleAddComment = useCallback(async (text: string) => {
    if (selection) {
      await addComment(text, selection);
      setShowHint(false);
    }
  }, [selection, addComment]);

  const renderParagraph = (text: string, paragraphId: string, speaker?: string) => {
    const paragraphHighlights = highlights.filter((h: CommentHighlightType) => {
      const comment = comments.find((c: Comment) => c.id === h.id);
      return comment?.selection.paragraphId === paragraphId;
    });

    const segments = createHighlightSegments(text, paragraphHighlights);

    return (
      <div
        data-paragraph-id={paragraphId}
        data-speaker={speaker}
        className="leading-relaxed"
      >
        {segments.map((segment, index) => {
          if (segment.type === "highlight" && segment.highlight) {
            const commentsAtPosition = comments.filter(
              (c: Comment) => c.id === segment.highlight!.id
            );
            const tooltipContent = commentsAtPosition.length > 0 && (
              <div>
                <strong>{commentsAtPosition[0].userName}:</strong>{" "}
                {commentsAtPosition[0].text.length > 50
                  ? `${commentsAtPosition[0].text.substring(0, 50)}...`
                  : commentsAtPosition[0].text}
                {commentsAtPosition.length > 1 && (
                  <span className="text-white/50 ml-1">
                    +{commentsAtPosition.length - 1} more
                  </span>
                )}
              </div>
            );

            return (
              <CommentHighlight
                key={segment.key || index}
                highlight={segment.highlight}
                text={segment.content}
                onClick={(e) => handleHighlightClick(segment.highlight!.id, e)}
                onHover={(isHovered) => setHoveredHighlight(isHovered ? segment.highlight!.id : null)}
                tooltipContent={tooltipContent}
              />
            );
          }

          return <Fragment key={index}>{segment.content}</Fragment>;
        })}
      </div>
    );
  };

  const activeComments = activeThreadId
    ? comments.filter((c: Comment) => c.id === activeThreadId)
    : [];

  const hintMessage = isDemo ? (
    <>
      <p className="text-sm text-purple-300 font-medium">
        Demo Mode - Try the comment system!
      </p>
      <p className="text-xs text-purple-400/80 mt-0.5">
        Select any text to add a comment. Comments are temporary in demo mode.
      </p>
    </>
  ) : (
    <>
      <p className="text-sm text-purple-300 font-medium">
        Add comments to this transcript
      </p>
      <p className="text-xs text-purple-400/80 mt-0.5">
        Select any text to add a comment. Click comments to edit or delete them.
      </p>
    </>
  );

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      {showHint && enabled && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="mb-4 p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg"
        >
          <div className="flex items-start gap-2">
            <MessageSquare className="w-4 h-4 text-purple-400 mt-0.5" />
            <div>{hintMessage}</div>
          </div>
        </motion.div>
      )}

      <div className="space-y-4">
        {parsedTranscript ? (
          parsedTranscript.map((paragraph, index) => (
            <div key={index}>
              <div className="font-semibold text-purple-400 mb-1">
                {paragraph.speaker}:
              </div>
              <div className="text-white/90">
                {renderParagraph(
                  paragraph.text,
                  `paragraph-${index}`,
                  paragraph.speaker
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="text-white/90 whitespace-pre-wrap">
            {renderParagraph(transcript, "full-transcript", "")}
          </div>
        )}
      </div>

      {selection && selectionRect && (
        <SelectionToolbar
          selection={{ text: selection.text, rect: selectionRect }}
          onAddComment={handleAddComment}
          onClose={() => {
            clearSelectionState();
          }}
        />
      )}

      <AnimatePresence>
        {activeThreadId && activeComments.length > 0 && threadPosition && (
          <div className="comment-thread">
            <CommentThread
              comments={activeComments}
              currentUserId={currentUserId}
              position={threadPosition}
              onClose={() => setActiveThreadId(null)}
              onEdit={updateComment}
              onDelete={deleteComment}
              onResolve={() => {}}
            />
          </div>
        )}
      </AnimatePresence>

      {!isDemo && (
        <CommentPresenceIndicator
          presence={presence}
          currentUserId={currentUserId}
        />
      )}
    </div>
  );
}