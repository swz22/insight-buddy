import { Comment, TextSelection, CommentHighlight } from "@/types/comments";

export function getTextSelection(): TextSelection | null {
  const selection = window.getSelection();
  if (!selection || selection.isCollapsed || !selection.rangeCount) return null;

  const range = selection.getRangeAt(0);
  const container = range.commonAncestorContainer.parentElement;
  const paragraph = container?.closest("[data-paragraph-id]");
  
  if (!paragraph) return null;

  const paragraphId = paragraph.getAttribute("data-paragraph-id") || "";
  const speaker = paragraph.getAttribute("data-speaker") || "";
  const fullText = paragraph.textContent || "";
  const selectedText = selection.toString().trim();
  
  if (!selectedText) return null;

  const preSelectionRange = range.cloneRange();
  preSelectionRange.selectNodeContents(paragraph);
  preSelectionRange.setEnd(range.startContainer, range.startOffset);
  const start = preSelectionRange.toString().length;
  const end = start + selectedText.length;

  const contextStart = Math.max(0, start - 20);
  const contextEnd = Math.min(fullText.length, end + 20);

  return {
    start,
    end,
    text: selectedText,
    contextBefore: fullText.substring(contextStart, start),
    contextAfter: fullText.substring(end, contextEnd),
    paragraphId,
    speakerName: speaker,
  };
}

export interface HighlightSegment {
  type: "text" | "highlight";
  content: string;
  highlight?: CommentHighlight;
  key?: string;
}

export function createHighlightSegments(
  text: string,
  highlights: CommentHighlight[]
): HighlightSegment[] {
  if (!highlights.length) {
    return [{ type: "text", content: text }];
  }

  const sortedHighlights = [...highlights].sort((a, b) => a.start - b.start);
  const segments: HighlightSegment[] = [];
  let lastEnd = 0;

  sortedHighlights.forEach((highlight, index) => {
    if (highlight.start > lastEnd) {
      segments.push({
        type: "text",
        content: text.substring(lastEnd, highlight.start),
      });
    }

    const highlightedText = text.substring(
      highlight.start,
      Math.min(highlight.end, text.length)
    );

    segments.push({
      type: "highlight",
      content: highlightedText,
      highlight,
      key: `highlight-${highlight.id}-${index}`,
    });

    lastEnd = highlight.end;
  });

  if (lastEnd < text.length) {
    segments.push({
      type: "text",
      content: text.substring(lastEnd),
    });
  }

  return segments;
}

export function mergeOverlappingHighlights(
  highlights: CommentHighlight[]
): CommentHighlight[] {
  if (highlights.length <= 1) return highlights;

  const sorted = [...highlights].sort((a, b) => a.start - b.start);
  const merged: CommentHighlight[] = [];
  let current = sorted[0];

  for (let i = 1; i < sorted.length; i++) {
    const next = sorted[i];
    
    if (current.end >= next.start) {
      current = {
        ...current,
        end: Math.max(current.end, next.end),
        commentCount: current.commentCount + next.commentCount,
        userColors: [...new Set([...current.userColors, ...next.userColors])],
      };
    } else {
      merged.push(current);
      current = next;
    }
  }
  
  merged.push(current);
  return merged;
}

export function findCommentAtPosition(
  position: number,
  comments: Comment[]
): Comment | null {
  return comments.find(
    (comment) =>
      position >= comment.selection.start && position <= comment.selection.end
  ) || null;
}

export function generateCommentId(): string {
  return `comment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function getRelativeTime(date: string): string {
  const now = new Date();
  const then = new Date(date);
  const seconds = Math.floor((now.getTime() - then.getTime()) / 1000);

  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  
  return then.toLocaleDateString();
}

export function getUserInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function clearSelection(): void {
  const selection = window.getSelection();
  if (selection) {
    selection.removeAllRanges();
  }
}