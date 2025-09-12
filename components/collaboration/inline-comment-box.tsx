"use client";

import { useState, useRef, useEffect } from "react";
import { Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface InlineCommentBoxProps {
  position: { x: number; y: number };
  onSubmit: (comment: string, position: { x: number; y: number }) => void;
  onCancel: () => void;
  userName?: string;
  userColor?: string;
}

export function InlineCommentBox({ position, onSubmit, onCancel, userName = "Anonymous", userColor = "#8B5CF6" }: InlineCommentBoxProps) {
  const [comment, setComment] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, []);

  const handleSubmit = () => {
    if (comment.trim()) {
      onSubmit(comment.trim(), position);
      setComment("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === "Escape") {
      onCancel();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: -10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: -10 }}
      className="absolute z-50 w-80"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: "translateX(-50%)",
      }}
    >
      <div className="bg-black/95 backdrop-blur-xl border border-white/20 rounded-lg shadow-2xl overflow-hidden">
        <div className="p-3 border-b border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
                style={{ backgroundColor: userColor }}
              >
                {userName[0].toUpperCase()}
              </div>
              <span className="text-sm text-white/80">{userName}</span>
            </div>
            <button
              onClick={onCancel}
              className="text-white/40 hover:text-white/60 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="p-3">
          <textarea
            ref={textareaRef}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Add your comment..."
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-purple-400/60 resize-none"
            rows={3}
          />
          <div className="flex items-center justify-between mt-3">
            <p className="text-xs text-white/40">
              Press Enter to submit, Shift+Enter for new line
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={onCancel}
                className="text-white/60 hover:text-white hover:bg-white/10"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSubmit}
                disabled={!comment.trim()}
                className="bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-700 hover:to-cyan-700 text-white"
              >
                <Send className="w-3 h-3 mr-1" />
                Send
              </Button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}