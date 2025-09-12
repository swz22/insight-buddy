"use client";

import { useState, useRef, useEffect } from "react";
import { Send, X } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface CommentInputInlineProps {
  onSubmit: (content: string) => void;
  onCancel: () => void;
  userName?: string;
  userColor?: string;
  placeholder?: string;
  autoFocus?: boolean;
  className?: string;
}

export function CommentInputInline({
  onSubmit,
  onCancel,
  userName = "Anonymous",
  userColor = "#8B5CF6",
  placeholder = "Add a comment...",
  autoFocus = true,
  className
}: CommentInputInlineProps) {
  const [content, setContent] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (content.trim()) {
      onSubmit(content.trim());
      setContent("");
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
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      className={cn("overflow-hidden", className)}
    >
      <form onSubmit={handleSubmit} className="p-3 bg-white/[0.03] rounded-lg border border-white/10">
        <div className="flex items-start gap-2">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white mt-0.5"
            style={{ backgroundColor: userColor }}
          >
            {userName[0].toUpperCase()}
          </div>
          
          <div className="flex-1">
            <input
              ref={inputRef}
              type="text"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder={placeholder}
              className="w-full bg-transparent text-sm text-white placeholder:text-white/40 focus:outline-none"
            />
            
            <div className={cn(
              "flex items-center justify-between mt-2 transition-opacity",
              isFocused || content ? "opacity-100" : "opacity-0"
            )}>
              <span className="text-xs text-white/40">
                Press Enter to submit, Esc to cancel
              </span>
              
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={onCancel}
                  className="p-1.5 text-white/40 hover:text-white/60 hover:bg-white/10 rounded transition-all"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
                <button
                  type="submit"
                  disabled={!content.trim()}
                  className={cn(
                    "p-1.5 rounded transition-all",
                    content.trim()
                      ? "text-purple-400 hover:text-purple-300 hover:bg-purple-500/20"
                      : "text-white/20 cursor-not-allowed"
                  )}
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </form>
    </motion.div>
  );
}