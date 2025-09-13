"use client";

import { useState, useRef, useEffect } from "react";
import { MessageSquarePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CommentThread } from "./comment-thread";
import { motion, AnimatePresence } from "framer-motion";

interface Comment {
  id: string;
  text: string;
  paragraphId: string;
  timestamp: string;
  userName: string;
  userColor: string;
  replies?: Comment[];
}

interface CommentableTranscriptProps {
  transcript?: string;
  parsedTranscript?: { speaker: string; text: string }[];
  meetingId: string;
  isDemo?: boolean;
  enabled?: boolean;
  className?: string;
}

export function CommentableTranscript({
  transcript,
  parsedTranscript,
  meetingId,
  isDemo = false,
  enabled = true,
  className,
}: CommentableTranscriptProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [hoveredParagraph, setHoveredParagraph] = useState<string | null>(null);
  const [activeComment, setActiveComment] = useState<string | null>(null);
  const [commentInput, setCommentInput] = useState("");
  const [showCommentBox, setShowCommentBox] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!isDemo) {
      const stored = localStorage.getItem(`comments-${meetingId}`);
      if (stored) setComments(JSON.parse(stored));
    }
  }, [meetingId, isDemo]);

  useEffect(() => {
    if (!isDemo && comments.length > 0) {
      localStorage.setItem(`comments-${meetingId}`, JSON.stringify(comments));
    }
  }, [comments, meetingId, isDemo]);

  // Format the transcript content
  let content = "";
  let paragraphs: string[] = [];
  
  if (parsedTranscript) {
    paragraphs = parsedTranscript.map(segment => `${segment.speaker}: ${segment.text}`);
    content = paragraphs.join('\n\n');
  } else if (transcript) {
    paragraphs = transcript.split("\n\n").filter(p => p.trim());
    content = transcript;
  }

  if (!content) {
    return <div className={cn("prose prose-invert max-w-none", className)}>No transcript available</div>;
  }

  if (!enabled) {
    return <div className={cn("prose prose-invert max-w-none whitespace-pre-wrap", className)}>{content}</div>;
  }

  const handleAddComment = (paragraphId: string) => {
    if (!commentInput.trim()) return;
    
    const newComment: Comment = {
      id: crypto.randomUUID(),
      text: commentInput,
      paragraphId,
      timestamp: new Date().toISOString(),
      userName: isDemo ? "Demo User" : "You",
      userColor: "#a855f7",
    };

    setComments(prev => [...prev, newComment]);
    setCommentInput("");
    setShowCommentBox(null);
    setActiveComment(newComment.id);
  };

  const handleDeleteComment = (commentId: string) => {
    setComments(prev => prev.filter(c => c.id !== commentId));
    if (activeComment === commentId) setActiveComment(null);
  };

  const getCommentsForParagraph = (paragraphId: string) => 
    comments.filter(c => c.paragraphId === paragraphId);

  return (
    <div className={cn("relative space-y-4", className)}>
      {paragraphs.map((paragraph, index) => {
        const paragraphId = `p-${index}`;
        const paragraphComments = getCommentsForParagraph(paragraphId);
        const hasComments = paragraphComments.length > 0;
        const isHovered = hoveredParagraph === paragraphId;
        const isAddingComment = showCommentBox === paragraphId;

        return (
          <div
            key={paragraphId}
            className="group relative"
            onMouseEnter={() => setHoveredParagraph(paragraphId)}
            onMouseLeave={() => setHoveredParagraph(null)}
          >
            <div className={cn(
              "relative pl-12 pr-4 py-2 rounded-lg transition-all duration-200",
              isHovered && "bg-white/[0.02]",
              hasComments && "bg-purple-500/5 border-l-2 border-purple-500/30",
              isAddingComment && "bg-purple-500/10 border-l-2 border-purple-500"
            )}>
              <AnimatePresence>
                {(isHovered || hasComments || isAddingComment) && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="absolute left-2 top-2"
                  >
                    {!isAddingComment && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setShowCommentBox(paragraphId);
                          setTimeout(() => inputRef.current?.focus(), 100);
                        }}
                        className={cn(
                          "w-8 h-8 p-0 rounded-full transition-all",
                          hasComments 
                            ? "bg-purple-500/20 hover:bg-purple-500/30 text-purple-400" 
                            : "hover:bg-white/10 text-white/40 hover:text-white/80"
                        )}
                      >
                        {hasComments ? (
                          <span className="text-xs font-bold">{paragraphComments.length}</span>
                        ) : (
                          <MessageSquarePlus className="w-4 h-4" />
                        )}
                      </Button>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              <p className="text-white/80 leading-relaxed whitespace-pre-wrap">
                {paragraph}
              </p>

              {hasComments && (
                <div className="mt-3 space-y-2">
                  {paragraphComments.map(comment => (
                    <CommentThread
                      key={comment.id}
                      comment={comment}
                      isActive={activeComment === comment.id}
                      onClick={() => setActiveComment(comment.id)}
                      onDelete={() => handleDeleteComment(comment.id)}
                      isDemo={isDemo}
                    />
                  ))}
                </div>
              )}

              <AnimatePresence>
                {isAddingComment && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="mt-3 bg-black/30 rounded-lg p-3 border border-purple-500/30"
                  >
                    <textarea
                      ref={inputRef}
                      value={commentInput}
                      onChange={(e) => setCommentInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleAddComment(paragraphId);
                        }
                        if (e.key === "Escape") {
                          setShowCommentBox(null);
                          setCommentInput("");
                        }
                      }}
                      placeholder="Add a comment..."
                      className="w-full bg-transparent text-white placeholder-white/40 resize-none focus:outline-none text-sm"
                      rows={2}
                    />
                    <div className="flex justify-end gap-2 mt-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setShowCommentBox(null);
                          setCommentInput("");
                        }}
                        className="text-white/60 hover:text-white"
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleAddComment(paragraphId)}
                        disabled={!commentInput.trim()}
                        className="bg-purple-500 hover:bg-purple-600 text-white"
                      >
                        Comment
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        );
      })}

      {enabled && (
        <div className="mt-6 p-4 bg-white/5 rounded-lg border border-white/10">
          <p className="text-sm text-white/60">
            💡 <strong>Tip:</strong> Hover over any paragraph and click the comment icon to add your thoughts
          </p>
        </div>
      )}
    </div>
  );
}