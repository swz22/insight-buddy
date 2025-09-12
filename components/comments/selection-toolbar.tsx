"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquarePlus, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface SelectionToolbarProps {
  selection: { text: string; rect: DOMRect } | null;
  onAddComment: (text: string) => void;
  onClose: () => void;
}

export function SelectionToolbar({
  selection,
  onAddComment,
  onClose,
}: SelectionToolbarProps) {
  const [showInput, setShowInput] = useState(false);
  const [comment, setComment] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (showInput && inputRef.current) {
      inputRef.current.focus();
    }
  }, [showInput]);

  useEffect(() => {
    setShowInput(false);
    setComment("");
  }, [selection]);

  if (!selection) return null;

  const handleSubmit = () => {
    if (comment.trim()) {
      onAddComment(comment.trim());
      setComment("");
      setShowInput(false);
      onClose();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === "Escape") {
      setShowInput(false);
      onClose();
    }
  };

  const position = {
    left: selection.rect.left + selection.rect.width / 2,
    top: selection.rect.top + window.scrollY,
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 10, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10, scale: 0.9 }}
        transition={{ duration: 0.15, ease: "easeOut" }}
        className="fixed z-50"
        style={{
          left: position.left,
          top: position.top - (showInput ? 120 : 40),
          transform: "translateX(-50%)",
        }}
      >
        <div className="relative">
          {showInput ? (
            <div className="bg-black/95 backdrop-blur-xl rounded-lg shadow-2xl border border-white/10 p-3 w-72">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-white/60">
                  Add comment
                </span>
                <button
                  onClick={() => {
                    setShowInput(false);
                    onClose();
                  }}
                  className="text-white/40 hover:text-white/60 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              
              <textarea
                ref={inputRef}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type your comment..."
                className={cn(
                  "w-full px-2.5 py-2 text-sm bg-white/5 rounded",
                  "border border-white/10 outline-none",
                  "text-white/90 placeholder-white/40",
                  "resize-none focus:border-purple-500/30",
                  "transition-colors"
                )}
                rows={2}
              />
              
              <div className="flex justify-end gap-2 mt-2">
                <button
                  onClick={() => {
                    setShowInput(false);
                    onClose();
                  }}
                  className={cn(
                    "px-3 py-1 text-xs rounded",
                    "bg-white/5 text-white/60",
                    "hover:bg-white/10 transition-colors"
                  )}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!comment.trim()}
                  className={cn(
                    "px-3 py-1 text-xs rounded font-medium",
                    "bg-gradient-to-r from-purple-500 to-purple-600",
                    "text-white shadow-lg",
                    "hover:from-purple-600 hover:to-purple-700",
                    "disabled:opacity-50 disabled:cursor-not-allowed",
                    "transition-all"
                  )}
                >
                  Add
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowInput(true)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5",
                "bg-gradient-to-r from-purple-500 to-purple-600",
                "text-white text-xs font-medium",
                "rounded-full shadow-lg",
                "hover:from-purple-600 hover:to-purple-700",
                "transition-all hover:scale-105"
              )}
            >
              <MessageSquarePlus className="w-3.5 h-3.5" />
              Comment
            </button>
          )}
          
          <div
            className="absolute left-1/2 -translate-x-1/2 -bottom-1 w-2 h-2"
            style={{
              background: showInput ? "rgb(0 0 0 / 0.95)" : "linear-gradient(135deg, #a855f7, #9333ea)",
              border: showInput ? "1px solid rgba(255, 255, 255, 0.1)" : "none",
              borderTop: "none",
              borderLeft: "none",
              transform: "translateX(-50%) rotate(45deg)",
            }}
          />
        </div>
      </motion.div>
    </AnimatePresence>
  );
}