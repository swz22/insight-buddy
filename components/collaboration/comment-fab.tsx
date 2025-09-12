"use client";

import { useState, useEffect } from "react";
import { MessageSquarePlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface CommentFABProps {
  onAddComment: (position?: { x: number; y: number }) => void;
  commentCount?: number;
  disabled?: boolean;
  className?: string;
}

export function CommentFAB({ onAddComment, commentCount = 0, disabled = false, className }: CommentFABProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [hasBeenUsed, setHasBeenUsed] = useState(false);

  useEffect(() => {
    const used = localStorage.getItem("comment-fab-used");
    if (used) {
      setHasBeenUsed(true);
    } else {
      const timer = setTimeout(() => setShowTooltip(true), 3000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleClick = () => {
    onAddComment();
    if (!hasBeenUsed) {
      localStorage.setItem("comment-fab-used", "true");
      setHasBeenUsed(true);
      setShowTooltip(false);
    }
  };

  return (
    <>
      <AnimatePresence>
        {showTooltip && !hasBeenUsed && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="fixed bottom-28 right-6 z-40 pointer-events-none"
          >
            <div className="relative">
              <div className="bg-gradient-to-r from-purple-600 to-cyan-600 text-white px-4 py-2 rounded-lg shadow-xl">
                <p className="text-sm font-medium">Click here to add comments!</p>
                <div className="absolute -bottom-2 right-8 w-4 h-4 bg-gradient-to-r from-purple-600 to-cyan-600 rotate-45" />
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowTooltip(false);
                  localStorage.setItem("comment-fab-used", "true");
                }}
                className="absolute -top-2 -right-2 w-6 h-6 bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white/20 transition-colors pointer-events-auto"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        className={cn("fixed bottom-6 right-6 z-50", className)}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 20 }}
      >
        <motion.button
          onClick={handleClick}
          disabled={disabled}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          className={cn(
            "relative group w-14 h-14 rounded-full",
            "bg-gradient-to-r from-purple-600 to-cyan-600",
            "shadow-lg hover:shadow-xl transition-all duration-200",
            "flex items-center justify-center",
            "hover:scale-110 active:scale-95",
            disabled && "opacity-50 cursor-not-allowed",
            !hasBeenUsed && "animate-pulse"
          )}
          whileTap={{ scale: 0.95 }}
        >
          <MessageSquarePlus className="w-6 h-6 text-white" />
          
          {commentCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
              {commentCount > 9 ? "9+" : commentCount}
            </span>
          )}

          <AnimatePresence>
            {isHovered && (
              <motion.div
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="absolute right-full mr-3 whitespace-nowrap"
              >
                <div className="bg-black/90 text-white px-3 py-1.5 rounded-lg text-sm font-medium">
                  Add Comment
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.button>
      </motion.div>
    </>
  );
}