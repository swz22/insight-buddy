"use client";

import { CommentPresence } from "@/types/comments";
import { motion, AnimatePresence } from "framer-motion";
import { getUserInitials } from "@/lib/utils/comments";
import { cn } from "@/lib/utils";

interface CommentPresenceIndicatorProps {
  presence: CommentPresence[];
  currentUserId: string;
}

export function CommentPresenceIndicator({
  presence,
  currentUserId,
}: CommentPresenceIndicatorProps) {
  const otherUsers = presence.filter((p) => p.userId !== currentUserId);
  const activeUsers = otherUsers.filter(
    (p) => new Date().getTime() - new Date(p.lastActive).getTime() < 30000
  );

  if (activeUsers.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-40">
      <div className="flex items-center gap-2">
        <AnimatePresence mode="popLayout">
          <div className="flex -space-x-2">
            {activeUsers.slice(0, 3).map((user, index) => (
              <motion.div
                key={user.userId}
                initial={{ opacity: 0, scale: 0.8, x: -10 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.8, x: -10 }}
                transition={{ delay: index * 0.05 }}
                className="relative group"
              >
                <div
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center",
                    "text-xs font-semibold text-white",
                    "border-2 border-black shadow-lg",
                    "transition-transform hover:scale-110 hover:z-10"
                  )}
                  style={{
                    background: `linear-gradient(135deg, ${user.userColor}, ${user.userColor}dd)`,
                  }}
                >
                  {user.userAvatar ? (
                    <img
                      src={user.userAvatar}
                      alt={user.userName}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    getUserInitials(user.userName)
                  )}
                </div>
                
                {user.isTyping && (
                  <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-purple-500 rounded-full animate-pulse" />
                )}
                
                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  <div className="bg-black/95 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                    {user.userName}
                    {user.isTyping && " is typing..."}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
          
          {activeUsers.length > 3 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center",
                "text-xs font-semibold text-white/80",
                "bg-white/10 backdrop-blur-sm border-2 border-black"
              )}
            >
              +{activeUsers.length - 3}
            </motion.div>
          )}
        </AnimatePresence>
        
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="text-xs text-white/50 ml-2"
        >
          {activeUsers.length === 1 ? "1 person" : `${activeUsers.length} people`} viewing
        </motion.div>
      </div>
    </div>
  );
}