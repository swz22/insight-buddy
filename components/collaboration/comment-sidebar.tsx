"use client";

import { useState, useMemo } from "react";
import { MessageCircle, Filter, X, ChevronRight, Clock, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

interface UserInfo {
  name: string;
  color: string;
  avatar_url?: string;
}

interface Comment {
  id: string;
  user_info: UserInfo;
  content: string;
  position?: { line_number: number } | { start_line: number; end_line: number };
  created_at: string;
  resolved?: boolean;
  context?: string;
}

interface CommentSidebarProps {
  comments: Comment[];
  currentUserName?: string;
  onJumpToComment: (comment: Comment) => void;
  onResolveComment?: (commentId: string) => void;
  onDeleteComment?: (commentId: string) => void;
  className?: string;
}

type FilterType = "all" | "mine" | "resolved" | "unresolved";

export function CommentSidebar({
  comments,
  currentUserName,
  onJumpToComment,
  onResolveComment,
  onDeleteComment,
  className
}: CommentSidebarProps) {
  const [filter, setFilter] = useState<FilterType>("all");
  const [isExpanded, setIsExpanded] = useState(true);

  const filteredComments = useMemo(() => {
    return comments.filter(comment => {
      switch (filter) {
        case "mine":
          return comment.user_info.name === currentUserName;
        case "resolved":
          return comment.resolved === true;
        case "unresolved":
          return !comment.resolved;
        default:
          return true;
      }
    });
  }, [comments, filter, currentUserName]);

  const filters: { value: FilterType; label: string }[] = [
    { value: "all", label: "All" },
    { value: "mine", label: "Mine" },
    { value: "unresolved", label: "Open" },
    { value: "resolved", label: "Resolved" }
  ];

  return (
    <motion.div
      initial={{ width: isExpanded ? 320 : 48 }}
      animate={{ width: isExpanded ? 320 : 48 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className={cn(
        "bg-black/40 backdrop-blur-xl border-l border-white/10 h-full overflow-hidden",
        className
      )}
    >
      {isExpanded ? (
        <div className="h-full flex flex-col">
          <div className="p-4 border-b border-white/10">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-purple-400" />
                <h3 className="font-semibold text-white">Comments</h3>
                <span className="text-xs text-white/40 bg-white/10 px-2 py-0.5 rounded-full">
                  {filteredComments.length}
                </span>
              </div>
              <button
                onClick={() => setIsExpanded(false)}
                className="p-1 hover:bg-white/10 rounded transition-colors"
              >
                <ChevronRight className="w-4 h-4 text-white/60" />
              </button>
            </div>

            <div className="flex gap-1">
              {filters.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => setFilter(value)}
                  className={cn(
                    "px-2 py-1 text-xs rounded-md transition-all",
                    filter === value
                      ? "bg-purple-500/20 text-purple-400 border border-purple-500/30"
                      : "text-white/60 hover:text-white hover:bg-white/10"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {filteredComments.length === 0 ? (
              <div className="text-center py-8">
                <MessageCircle className="w-8 h-8 text-white/20 mx-auto mb-2" />
                <p className="text-sm text-white/40">No comments yet</p>
              </div>
            ) : (
              <AnimatePresence>
                {filteredComments.map((comment) => (
                  <motion.div
                    key={comment.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    onClick={() => onJumpToComment(comment)}
                    className={cn(
                      "p-3 rounded-lg border transition-all cursor-pointer group",
                      comment.resolved
                        ? "bg-white/[0.02] border-white/5 opacity-60"
                        : "bg-white/[0.03] border-white/10 hover:bg-white/[0.05] hover:border-white/20"
                    )}
                  >
                    <div className="flex items-start gap-2 mb-2">
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
                        style={{ backgroundColor: comment.user_info.color }}
                      >
                        {comment.user_info.name[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs text-white/60 truncate">
                            {comment.user_info.name}
                          </span>
                          <span className="text-xs text-white/40">
                            {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                          </span>
                        </div>
                      </div>
                    </div>

                    {comment.context && (
                      <div className="mb-2 p-2 bg-white/[0.03] rounded border-l-2 border-purple-500/50">
                        <p className="text-xs text-white/50 italic truncate">
                          &ldquo;{comment.context}&rdquo;
                        </p>
                      </div>
                    )}

                    <p className="text-sm text-white/80 line-clamp-2 pl-8">
                      {comment.content}
                    </p>

                    <div className="flex items-center justify-between mt-2 pl-8">
                      <div className="flex items-center gap-2">
                        {"line_number" in (comment.position || {}) && (
                          <span className="text-xs text-white/40">
                            Line {(comment.position as any).line_number}
                          </span>
                        )}
                      </div>
                      
                      {!comment.resolved && onResolveComment && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onResolveComment(comment.id);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-white/10 rounded transition-all"
                        >
                          <Check className="w-3 h-3 text-green-400" />
                        </button>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>
        </div>
      ) : (
        <div className="h-full flex flex-col items-center py-4">
          <button
            onClick={() => setIsExpanded(true)}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors group"
          >
            <MessageCircle className="w-5 h-5 text-white/60 group-hover:text-purple-400 transition-colors" />
          </button>
          {comments.length > 0 && (
            <span className="mt-2 text-xs text-white/40 bg-white/10 w-6 h-6 rounded-full flex items-center justify-center">
              {comments.length}
            </span>
          )}
        </div>
      )}
    </motion.div>
  );
}