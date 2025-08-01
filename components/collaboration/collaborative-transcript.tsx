"use client";

import { useState, useRef, useEffect } from "react";
import { MessageCircle, Highlighter, X, Edit2, Check, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { formatDistanceToNow } from "date-fns";

interface UserInfo {
  name: string;
  email?: string;
  avatar_url?: string;
  color: string;
  sessionId?: string;
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

interface CollaborativeTranscriptProps {
  transcript: string;
  annotations: Annotation[];
  onAddHighlight: (startLine: number, endLine: number, text: string) => void;
  onAddComment: (lineNumber: number, text: string, parentId?: string) => void;
  onDeleteAnnotation?: (annotationId: string) => void;
  onEditAnnotation?: (annotationId: string, newContent: string) => void;
  currentUserColor: string;
  currentUserName?: string;
  currentSessionId?: string;
}

export function CollaborativeTranscript({
  transcript,
  annotations,
  onAddHighlight,
  onAddComment,
  onDeleteAnnotation,
  onEditAnnotation,
  currentUserColor,
  currentUserName,
  currentSessionId,
}: CollaborativeTranscriptProps) {
  const [selectedLines, setSelectedLines] = useState<number[]>([]);
  const [showCommentInput, setShowCommentInput] = useState<number | null>(null);
  const [commentText, setCommentText] = useState("");
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const transcriptRef = useRef<HTMLDivElement>(null);
  const lines = transcript.split("\n");
  const highlightsByLine = new Map<number, Annotation[]>();
  const commentsByLine = new Map<number, Annotation[]>();

  annotations.forEach((annotation) => {
    if (annotation.type === "highlight" && annotation.position && "start_line" in annotation.position) {
      for (let i = annotation.position.start_line; i <= annotation.position.end_line; i++) {
        if (!highlightsByLine.has(i)) highlightsByLine.set(i, []);
        highlightsByLine.get(i)!.push(annotation);
      }
    } else if (annotation.type === "comment" && annotation.position && "line_number" in annotation.position) {
      const lineNum = annotation.position.line_number;
      if (!commentsByLine.has(lineNum)) commentsByLine.set(lineNum, []);
      commentsByLine.get(lineNum)!.push(annotation);
    }
  });

  useEffect(() => {
    const handleSelection = () => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed || !transcriptRef.current) {
        setSelectedLines([]);
        return;
      }

      const range = selection.getRangeAt(0);
      const startElement =
        range.startContainer.nodeType === Node.TEXT_NODE
          ? range.startContainer.parentElement
          : (range.startContainer as HTMLElement);
      const endElement =
        range.endContainer.nodeType === Node.TEXT_NODE
          ? range.endContainer.parentElement
          : (range.endContainer as HTMLElement);

      const startLine = parseInt(startElement?.dataset.line || "0");
      const endLine = parseInt(endElement?.dataset.line || "0");

      if (startLine && endLine) {
        const lines = [];
        for (let i = Math.min(startLine, endLine); i <= Math.max(startLine, endLine); i++) {
          lines.push(i);
        }
        setSelectedLines(lines);
      }
    };

    document.addEventListener("mouseup", handleSelection);
    document.addEventListener("selectionchange", handleSelection);

    return () => {
      document.removeEventListener("mouseup", handleSelection);
      document.removeEventListener("selectionchange", handleSelection);
    };
  }, []);

  const handleHighlight = () => {
    if (selectedLines.length === 0) return;

    const startLine = Math.min(...selectedLines);
    const endLine = Math.max(...selectedLines);
    const selectedText = lines.slice(startLine - 1, endLine).join("\n");

    onAddHighlight(startLine, endLine, selectedText);
    setSelectedLines([]);
    window.getSelection()?.removeAllRanges();
  };

  const handleComment = (lineNumber: number) => {
    if (!commentText.trim()) return;

    onAddComment(lineNumber, commentText);
    setCommentText("");
    setShowCommentInput(null);
  };

  const startEditingComment = (annotation: Annotation) => {
    setEditingComment(annotation.id);
    setEditText(annotation.content);
  };

  const saveEditedComment = (annotationId: string) => {
    if (!editText.trim() || !onEditAnnotation) return;

    onEditAnnotation(annotationId, editText);
    setEditingComment(null);
    setEditText("");
  };

  const canModifyAnnotation = (annotation: Annotation) => {
    if (!currentSessionId) return false;
    return annotation.user_info.sessionId === currentSessionId;
  };

  return (
    <div className="relative">
      {/* Selection toolbar */}
      <AnimatePresence>
        {selectedLines.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute top-0 left-0 right-0 flex justify-center z-20 pointer-events-none"
          >
            <div className="bg-black/90 backdrop-blur-sm rounded-lg shadow-lg p-2 flex gap-2 pointer-events-auto">
              <Button size="sm" variant="ghost" onClick={handleHighlight} className="text-white/90 hover:bg-white/10">
                <Highlighter className="w-4 h-4 mr-2" />
                Highlight
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowCommentInput(selectedLines[0])}
                className="text-white/90 hover:bg-white/10"
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                Comment
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div ref={transcriptRef} className="space-y-1 select-text">
        {lines.map((line, index) => {
          const lineNumber = index + 1;
          const lineHighlights = highlightsByLine.get(lineNumber) || [];
          const lineComments = commentsByLine.get(lineNumber) || [];
          const isSelected = selectedLines.includes(lineNumber);

          return (
            <div key={lineNumber} className="group relative">
              <div className="absolute -left-16 top-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-xs text-white/30 select-none w-8 text-right">{lineNumber}</span>
                <button
                  onClick={() => setShowCommentInput(lineNumber)}
                  className="p-1 rounded hover:bg-white/10 transition-colors"
                  title="Add comment"
                >
                  <MessageCircle className="w-3 h-3 text-white/40" />
                </button>
              </div>

              <div
                data-line={lineNumber}
                className={cn(
                  "relative px-2 py-0.5 rounded transition-all",
                  isSelected && "bg-blue-500/20",
                  lineHighlights.length > 0 && "has-highlights"
                )}
              >
                {/* Highlight backgrounds */}
                {lineHighlights.map((highlight) => (
                  <div key={highlight.id} className="group/highlight relative">
                    <div
                      className="absolute inset-0 rounded opacity-20 mix-blend-multiply"
                      style={{
                        backgroundColor: highlight.user_info.color,
                      }}
                    />

                    {/* Highlight tooltip */}
                    <div className="absolute -top-8 left-0 bg-black/90 text-white text-xs px-2 py-1 rounded opacity-0 group-hover/highlight:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                      Highlighted by {highlight.user_info.name}
                      <div className="text-white/50 text-xs">
                        {formatDistanceToNow(new Date(highlight.created_at), { addSuffix: true })}
                      </div>
                    </div>
                  </div>
                ))}

                {/* Text content */}
                <span className="relative z-10">{line || " "}</span>

                {/* Comment indicators */}
                {lineComments.length > 0 && (
                  <div className="inline-flex items-center ml-2">
                    <div className="relative">
                      <MessageCircle className="w-4 h-4 text-yellow-400 fill-yellow-400/20" />
                      <span className="absolute -top-1 -right-1 text-xs bg-yellow-400 text-black rounded-full w-4 h-4 flex items-center justify-center font-medium">
                        {lineComments.length}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Comments for this line */}
              {lineComments.length > 0 && (
                <div className="ml-8 mt-2 space-y-2">
                  {lineComments.map((comment) => (
                    <motion.div
                      key={comment.id}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-white/5 rounded-lg p-3 border border-white/10"
                    >
                      <div className="flex items-start gap-2">
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium text-white shrink-0"
                          style={{ backgroundColor: comment.user_info.color }}
                        >
                          {comment.user_info.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-baseline justify-between gap-2 mb-1">
                            <div className="flex items-baseline gap-2">
                              <span className="text-sm font-medium text-white/90">{comment.user_info.name}</span>
                              <span className="text-xs text-white/40">
                                {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                              </span>
                            </div>

                            {/* Edit/Delete buttons */}
                            {canModifyAnnotation(comment) && (
                              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                {editingComment !== comment.id && (
                                  <>
                                    <button
                                      onClick={() => startEditingComment(comment)}
                                      className="p-1 rounded hover:bg-white/10 transition-colors"
                                      title="Edit comment"
                                    >
                                      <Edit2 className="w-3 h-3 text-white/40 hover:text-white/60" />
                                    </button>
                                    {onDeleteAnnotation && (
                                      <button
                                        onClick={() => onDeleteAnnotation(comment.id)}
                                        className="p-1 rounded hover:bg-red-500/20 transition-colors"
                                        title="Delete comment"
                                      >
                                        <Trash2 className="w-3 h-3 text-white/40 hover:text-red-400" />
                                      </button>
                                    )}
                                  </>
                                )}
                              </div>
                            )}
                          </div>

                          {editingComment === comment.id ? (
                            <div className="space-y-2">
                              <textarea
                                value={editText}
                                onChange={(e) => setEditText(e.target.value)}
                                className="w-full bg-white/10 rounded p-2 text-sm text-white placeholder:text-white/40 outline-none resize-none"
                                rows={2}
                                autoFocus
                              />
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="glow"
                                  onClick={() => saveEditedComment(comment.id)}
                                  disabled={!editText.trim()}
                                >
                                  <Check className="w-3 h-3 mr-1" />
                                  Save
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setEditingComment(null);
                                    setEditText("");
                                  }}
                                >
                                  <X className="w-3 h-3 mr-1" />
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <p className="text-sm text-white/80">{comment.content}</p>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}

              {/* Comment input */}
              {showCommentInput === lineNumber && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="ml-8 mt-2"
                >
                  <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                    <textarea
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      placeholder="Add a comment..."
                      className="w-full bg-transparent text-sm text-white placeholder:text-white/40 outline-none resize-none"
                      rows={2}
                      autoFocus
                    />
                    <div className="flex gap-2 mt-2">
                      <Button
                        size="sm"
                        variant="glow"
                        onClick={() => handleComment(lineNumber)}
                        disabled={!commentText.trim()}
                      >
                        Add Comment
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setShowCommentInput(null);
                          setCommentText("");
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
