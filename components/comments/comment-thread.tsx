"use client";

import { useState, useRef, useEffect } from "react";
import { Comment } from "@/types/comments";
import { motion, AnimatePresence } from "framer-motion";
import { X, Edit2, Trash2, Check, MoreVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import { getRelativeTime, getUserInitials } from "@/lib/utils/comments";

interface CommentThreadProps {
  comments: Comment[];
  currentUserId: string;
  onClose: () => void;
  onEdit: (commentId: string, newText: string) => void;
  onDelete: (commentId: string) => void;
  onResolve: (commentId: string) => void;
  position?: { x: number; y: number };
}

export function CommentThread({
  comments,
  currentUserId,
  onClose,
  onEdit,
  onDelete,
  onResolve,
  position,
}: CommentThreadProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const editInputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingId]);

  const handleStartEdit = (comment: Comment) => {
    setEditingId(comment.id);
    setEditText(comment.text);
    setMenuOpenId(null);
  };

  const handleSaveEdit = () => {
    if (editingId && editText.trim()) {
      onEdit(editingId, editText.trim());
      setEditingId(null);
      setEditText("");
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditText("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSaveEdit();
    } else if (e.key === "Escape") {
      handleCancelEdit();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: -10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: -10 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      className="fixed z-50 w-80 max-h-96 overflow-hidden"
      style={{
        left: position?.x || 0,
        top: position?.y || 0,
      }}
    >
      <div className="bg-black/95 backdrop-blur-xl rounded-lg shadow-2xl border border-white/10 overflow-hidden">
        <div className="flex items-center justify-between px-3 py-2 border-b border-white/10">
          <span className="text-xs font-medium text-white/60">
            {comments.length} {comments.length === 1 ? "Comment" : "Comments"}
          </span>
          <button
            onClick={onClose}
            className="text-white/40 hover:text-white/60 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="max-h-80 overflow-y-auto custom-scrollbar">
          <AnimatePresence mode="popLayout">
            {comments.map((comment, index) => {
              const isOwn = comment.userId === currentUserId;
              const isEditing = editingId === comment.id;

              return (
                <motion.div
                  key={comment.id}
                  layout
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ delay: index * 0.05 }}
                  className={cn(
                    "relative px-3 py-2.5 border-b border-white/5",
                    "hover:bg-white/[0.02] transition-colors"
                  )}
                >
                  <div className="flex items-start gap-2.5">
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 mt-0.5"
                      style={{
                        background: `linear-gradient(135deg, ${comment.userColor}, ${comment.userColor}dd)`,
                      }}
                    >
                      {getUserInitials(comment.userName)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium text-white/80">
                          {comment.userName}
                        </span>
                        <span className="text-xs text-white/40">
                          {getRelativeTime(comment.updatedAt)}
                        </span>
                        {comment.isEditing && comment.userId !== currentUserId && (
                          <span className="text-xs text-purple-400 animate-pulse">
                            editing...
                          </span>
                        )}
                      </div>

                      {isEditing ? (
                        <div className="space-y-2">
                          <textarea
                            ref={editInputRef}
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            onKeyDown={handleKeyDown}
                            className={cn(
                              "w-full px-2 py-1.5 text-sm bg-white/5 rounded",
                              "border border-purple-500/30 outline-none",
                              "text-white/90 placeholder-white/30",
                              "resize-none"
                            )}
                            rows={2}
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={handleSaveEdit}
                              className={cn(
                                "px-2 py-1 text-xs rounded",
                                "bg-purple-500/20 text-purple-400",
                                "hover:bg-purple-500/30 transition-colors"
                              )}
                            >
                              Save
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              className={cn(
                                "px-2 py-1 text-xs rounded",
                                "bg-white/5 text-white/60",
                                "hover:bg-white/10 transition-colors"
                              )}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-white/85 leading-relaxed break-words">
                          {comment.text}
                        </p>
                      )}
                    </div>

                    {isOwn && !isEditing && (
                      <div className="relative">
                        <button
                          onClick={() => setMenuOpenId(menuOpenId === comment.id ? null : comment.id)}
                          className="text-white/30 hover:text-white/50 transition-colors"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>

                        <AnimatePresence>
                          {menuOpenId === comment.id && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.9 }}
                              className={cn(
                                "absolute right-0 top-6 z-10",
                                "bg-black/95 backdrop-blur-xl rounded-md",
                                "border border-white/10 shadow-xl",
                                "py-1 w-32"
                              )}
                            >
                              <button
                                onClick={() => handleStartEdit(comment)}
                                className={cn(
                                  "w-full px-3 py-1.5 text-left text-xs",
                                  "text-white/80 hover:bg-white/5",
                                  "flex items-center gap-2"
                                )}
                              >
                                <Edit2 className="w-3 h-3" />
                                Edit
                              </button>
                              <button
                                onClick={() => {
                                  onDelete(comment.id);
                                  setMenuOpenId(null);
                                }}
                                className={cn(
                                  "w-full px-3 py-1.5 text-left text-xs",
                                  "text-red-400 hover:bg-red-500/10",
                                  "flex items-center gap-2"
                                )}
                              >
                                <Trash2 className="w-3 h-3" />
                                Delete
                              </button>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}