import { useState, useCallback } from "react";
import { Comment, TextSelection, CommentHighlight } from "@/types/comments";
import { generateCommentId, mergeOverlappingHighlights, clearSelection } from "@/lib/utils/comments";

export function useDemoComments() {
  const [comments, setComments] = useState<Comment[]>([]);
  const [selection, setSelection] = useState<TextSelection | null>(null);

  const highlights = mergeOverlappingHighlights(
    comments.map((comment) => ({
      id: comment.id,
      start: comment.selection.start,
      end: comment.selection.end,
      commentCount: 1,
      isActive: false,
      isHovered: false,
      userColors: [comment.userColor],
    }))
  );

  const addComment = useCallback(
    async (text: string, selection: TextSelection) => {
      const newComment: Comment = {
        id: generateCommentId(),
        text,
        selection,
        userId: "demo-user",
        userName: "Demo User",
        userColor: "#a855f7",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        meetingId: "demo-meeting",
      };

      setComments((prev) => [...prev, newComment]);
      clearSelection();
      setSelection(null);
    },
    []
  );

  const updateComment = useCallback(
    async (commentId: string, text: string) => {
      setComments((prev) =>
        prev.map((c) =>
          c.id === commentId
            ? { ...c, text, updatedAt: new Date().toISOString() }
            : c
        )
      );
    },
    []
  );

  const deleteComment = useCallback(
    async (commentId: string) => {
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    },
    []
  );

  const getCommentsAtPosition = useCallback(
    (position: number): Comment[] => {
      return comments.filter(
        (comment) =>
          position >= comment.selection.start &&
          position <= comment.selection.end
      );
    },
    [comments]
  );

  return {
    comments,
    highlights,
    presence: [],
    selection,
    isLoading: false,
    addComment,
    updateComment,
    deleteComment,
    setSelection,
    clearSelection: () => {
      clearSelection();
      setSelection(null);
    },
    getCommentsAtPosition,
  };
}