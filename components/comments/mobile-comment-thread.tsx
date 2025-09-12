"use client";

import { useEffect, useState } from "react";
import { Comment } from "@/types/comments";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { CommentThread } from "./comment-thread";
import { cn } from "@/lib/utils";

interface MobileCommentThreadProps {
  comments: Comment[];
  currentUserId: string;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (commentId: string, newText: string) => void;
  onDelete: (commentId: string) => void;
  onResolve: (commentId: string) => void;
}

export function MobileCommentThread({
  comments,
  currentUserId,
  isOpen,
  onClose,
  onEdit,
  onDelete,
  onResolve,
}: MobileCommentThreadProps) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  if (!isOpen || !isMobile) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm md:hidden"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 30, stiffness: 300 }}
          className="absolute bottom-0 left-0 right-0 bg-black/95 backdrop-blur-xl rounded-t-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto mt-3 mb-2" />
          
          <div className="px-4 pb-4 max-h-[70vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-white/80">
                {comments.length} {comments.length === 1 ? "Comment" : "Comments"}
              </h3>
              <button
                onClick={onClose}
                className="text-white/40 hover:text-white/60 transition-colors p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-3">
              {comments.map((comment) => (
                <div
                  key={comment.id}
                  className="bg-white/5 rounded-lg p-3"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold"
                      style={{ background: comment.userColor }}
                    >
                      {comment.userName[0].toUpperCase()}
                    </div>
                    <span className="text-xs text-white/60">
                      {comment.userName}
                    </span>
                  </div>
                  <p className="text-sm text-white/90">
                    {comment.text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}