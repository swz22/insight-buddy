"use client";

import { useState, useRef, useEffect } from "react";
import { MessageCircle, Highlighter, X, Edit2, Check, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { SelectionPopover } from "./selection-popover";
import { LineCommentIndicator } from "./line-comment-indicator";
import { CommentInputInline } from "./comment-input-inline";
import { CommentSidebar } from "./comment-sidebar";

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
  showSidebar?: boolean;
}

export function CollaborativeTranscript({
  transcript,
  annotations,
  onAddHighlight,
  onAddComment,
  onDeleteAnnotation,
  onEditAnnotation,
  currentUserColor,
  currentUserName = "Anonymous",
  currentSessionId,
  showSidebar = false,
}: CollaborativeTranscriptProps) {
  const [hoveredLine, setHoveredLine] = useState<number | null>(null);
  const [activeCommentLine, setActiveCommentLine] = useState<number | null>(null);
  const [editingAnnotation, setEditingAnnotation] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [showCommentSidebar, setShowCommentSidebar] = useState(showSidebar);
  const containerRef = useRef<HTMLElement>(null);

  const lines = transcript.split("\n");

  const getLineAnnotations = (lineNumber: number) => {
    return annotations.filter((annotation) => {
      if (!annotation.position) return false;
      
      if ("line_number" in annotation.position) {
        return annotation.position.line_number === lineNumber;
      }
      
      if ("start_line" in annotation.position && "end_line" in annotation.position) {
        return lineNumber >= annotation.position.start_line && lineNumber <= annotation.position.end_line;
      }
      
      return false;
    });
  };

  const handleSelectionComment = (text: string, range: Range) => {
    const selection = window.getSelection();
    if (!selection || !containerRef.current) return;

    const lineElements = containerRef.current.querySelectorAll(".transcript-line");
    let startLine = -1;
    let endLine = -1;

    lineElements.forEach((element, index) => {
      if (selection.containsNode(element, true)) {
        if (startLine === -1) startLine = index + 1;
        endLine = index + 1;
      }
    });

    if (startLine !== -1) {
      setActiveCommentLine(startLine);
    }
  };

  const handleSelectionHighlight = (text: string, range: Range) => {
    const selection = window.getSelection();
    if (!selection || !containerRef.current) return;

    const lineElements = containerRef.current.querySelectorAll(".transcript-line");
    let startLine = -1;
    let endLine = -1;

    lineElements.forEach((element, index) => {
      if (selection.containsNode(element, true)) {
        if (startLine === -1) startLine = index + 1;
        endLine = index + 1;
      }
    });

    if (startLine !== -1 && endLine !== -1) {
      onAddHighlight(startLine, endLine, text);
    }
  };

  const handleSelectionNote = (text: string, range: Range) => {
    handleSelectionComment(text, range);
  };

  const handleLineComment = (lineNumber: number) => {
    setActiveCommentLine(lineNumber);
  };

  const handleSubmitComment = (content: string) => {
    if (activeCommentLine !== null) {
      onAddComment(activeCommentLine, content);
      setActiveCommentLine(null);
    }
  };

  const handleJumpToComment = (comment: any) => {
    if (!comment.position || !containerRef.current) return;
    
    let targetLine = 0;
    if ("line_number" in comment.position) {
      targetLine = comment.position.line_number;
    } else if ("start_line" in comment.position) {
      targetLine = comment.position.start_line;
    }
    
    const lineElement = containerRef.current.querySelector(`.transcript-line[data-line="${targetLine}"]`);
    if (lineElement) {
      lineElement.scrollIntoView({ behavior: "smooth", block: "center" });
      
      lineElement.classList.add("highlight-flash");
      setTimeout(() => {
        lineElement.classList.remove("highlight-flash");
      }, 2000);
    }
  };

  const handleEditStart = (annotation: Annotation) => {
    setEditingAnnotation(annotation.id);
    setEditContent(annotation.content);
  };

  const handleEditSave = (annotationId: string) => {
    if (onEditAnnotation && editContent.trim()) {
      onEditAnnotation(annotationId, editContent.trim());
    }
    setEditingAnnotation(null);
    setEditContent("");
  };

  const handleEditCancel = () => {
    setEditingAnnotation(null);
    setEditContent("");
  };

  const highlights = annotations.filter((a) => a.type === "highlight");
  const comments = annotations.filter((a) => a.type === "comment");

  return (
    <div className="flex gap-4">
      <div className="flex-1">
        <SelectionPopover
          onComment={handleSelectionComment}
          onHighlight={handleSelectionHighlight}
          onNote={handleSelectionNote}
          containerRef={containerRef as React.RefObject<HTMLElement>}
        />
        
        <div ref={containerRef as React.RefObject<HTMLDivElement>} className="space-y-0">
          {lines.map((line, index) => {
            const lineNumber = index + 1;
            const lineAnnotations = getLineAnnotations(lineNumber);
            const lineComments = lineAnnotations.filter((a) => a.type === "comment");
            const lineHighlights = lineAnnotations.filter((a) => a.type === "highlight");
            const isHighlighted = lineHighlights.length > 0;

            return (
              <div key={index} className="group">
                <div
                  className="flex items-start"
                  onMouseEnter={() => setHoveredLine(lineNumber)}
                  onMouseLeave={() => setHoveredLine(null)}
                >
                  <div className="w-8 flex items-center justify-center py-1">
                    <LineCommentIndicator
                      lineNumber={lineNumber}
                      comments={lineComments.map(a => ({
                        id: a.id,
                        user_info: a.user_info,
                        content: a.content,
                        created_at: a.created_at
                      }))}
                      onAddComment={handleLineComment}
                      isHovered={hoveredLine === lineNumber}
                    />
                  </div>
                  
                  <div
                    className={cn(
                      "transcript-line flex-1 px-3 py-1 transition-all select-text",
                      isHighlighted && "bg-yellow-500/10 border-l-2 border-yellow-500/50",
                      hoveredLine === lineNumber && "bg-white/[0.02]"
                    )}
                    data-line={lineNumber}
                  >
                    <p className="text-sm text-white/80 leading-normal">{line || "\u00A0"}</p>
                  </div>
                </div>

                <AnimatePresence>
                  {activeCommentLine === lineNumber && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="ml-10 my-2"
                    >
                      <CommentInputInline
                        onSubmit={handleSubmitComment}
                        onCancel={() => setActiveCommentLine(null)}
                        userName={currentUserName}
                        userColor={currentUserColor}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>

                {lineComments.length > 0 && (
                  <div className="ml-10 my-2 space-y-2">
                    {lineComments.map((annotation) => (
                      <div
                        key={annotation.id}
                        className="p-3 bg-white/[0.03] rounded-lg border border-white/10"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2 flex-1">
                            <div
                              className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
                              style={{ backgroundColor: annotation.user_info.color }}
                            >
                              {annotation.user_info.name[0].toUpperCase()}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs text-white/60">{annotation.user_info.name}</span>
                                <span className="text-xs text-white/40">
                                  {formatDistanceToNow(new Date(annotation.created_at), { addSuffix: true })}
                                </span>
                              </div>
                              {editingAnnotation === annotation.id ? (
                                <div className="space-y-2">
                                  <input
                                    type="text"
                                    value={editContent}
                                    onChange={(e) => setEditContent(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-sm text-white"
                                    autoFocus
                                  />
                                  <div className="flex gap-2">
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => handleEditSave(annotation.id)}
                                      className="h-7 px-2"
                                    >
                                      <Check className="w-3 h-3" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={handleEditCancel}
                                      className="h-7 px-2"
                                    >
                                      <X className="w-3 h-3" />
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <p className="text-sm text-white/80">{annotation.content}</p>
                              )}
                            </div>
                          </div>
                          {annotation.user_info.sessionId === currentSessionId && !editingAnnotation && (
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              {onEditAnnotation && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleEditStart(annotation)}
                                  className="h-7 w-7 p-0"
                                >
                                  <Edit2 className="w-3 h-3" />
                                </Button>
                              )}
                              {onDeleteAnnotation && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => onDeleteAnnotation(annotation.id)}
                                  className="h-7 w-7 p-0 hover:text-red-400"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {showCommentSidebar && (
        <CommentSidebar
          comments={comments.map(a => ({
            id: a.id,
            user_info: a.user_info,
            content: a.content,
            position: a.position,
            created_at: a.created_at,
            context: lines[(a.position && "line_number" in a.position ? a.position.line_number : 1) - 1]
          }))}
          currentUserName={currentUserName}
          onJumpToComment={handleJumpToComment}
          className="sticky top-0 h-[calc(100vh-200px)]"
        />
      )}
    </div>
  );
}