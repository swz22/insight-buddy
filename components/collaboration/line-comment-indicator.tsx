"use client";

import { useState } from "react";
import { Plus, MessageCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface Comment {
  id: string;
  user_info: {
    name: string;
    color: string;
    avatar_url?: string;
  };
  content: string;
  created_at: string;
}

interface LineCommentIndicatorProps {
  lineNumber: number;
  comments?: Comment[];
  onAddComment: (lineNumber: number) => void;
  isHovered?: boolean;
  className?: string;
}

export function LineCommentIndicator({
  lineNumber,
  comments = [],
  onAddComment,
  isHovered = false,
  className
}: LineCommentIndicatorProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const hasComments = comments.length > 0;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (hasComments) {
      setShowTooltip(!showTooltip);
    } else {
      onAddComment(lineNumber);
    }
  };

  return (
    <div className={cn("relative", className)}>
      <AnimatePresence mode="wait">
        {(isHovered || hasComments) && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.1 }}
            onClick={handleClick}
            onMouseEnter={() => hasComments && setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
            className={cn(
              "w-6 h-6 rounded-full flex items-center justify-center transition-all",
              hasComments
                ? "bg-gradient-to-r from-purple-500 to-cyan-500 hover:scale-110"
                : "bg-white/10 hover:bg-white/20"
            )}
          >
            {hasComments ? (
              <>
                <MessageCircle className="w-3 h-3 text-white" />
                {comments.length > 1 && (
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 text-white text-[8px] rounded-full flex items-center justify-center font-bold">
                    {comments.length > 9 ? "9+" : comments.length}
                  </span>
                )}
              </>
            ) : (
              <Plus className="w-3 h-3 text-white/60" />
            )}
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showTooltip && hasComments && (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            className="absolute left-full ml-2 top-1/2 -translate-y-1/2 z-50 pointer-events-none"
          >
            <div className="bg-black/95 backdrop-blur-xl border border-white/20 rounded-lg shadow-2xl p-3 min-w-[250px] max-w-[350px]">
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {comments.map((comment, idx) => (
                  <div key={comment.id} className="space-y-1">
                    {idx > 0 && <div className="border-t border-white/10 pt-2" />}
                    <div className="flex items-center gap-2">
                      <div
                        className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                        style={{ backgroundColor: comment.user_info.color }}
                      >
                        {comment.user_info.name[0].toUpperCase()}
                      </div>
                      <span className="text-xs text-white/60">{comment.user_info.name}</span>
                    </div>
                    <p className="text-xs text-white/80 pl-7">{comment.content}</p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}