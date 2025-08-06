"use client";

import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface UserInfo {
  name: string;
  email?: string;
  avatar_url?: string;
  color: string;
  sessionId?: string;
}

interface PresenceAvatarsProps {
  users: UserInfo[];
  currentUserId?: string;
  maxDisplay?: number;
}

export function PresenceAvatars({ users, currentUserId, maxDisplay = 5 }: PresenceAvatarsProps) {
  const currentUser = users.find((user) => user.sessionId === currentUserId);
  const otherUsers = users.filter((user) => user.sessionId !== currentUserId);

  const displayUsers = otherUsers.slice(0, maxDisplay);
  const remainingCount = Math.max(0, otherUsers.length - maxDisplay);

  return (
    <div className="flex items-center gap-2">
      {otherUsers.length > 0 && (
        <span className="text-sm text-white/60">
          {otherUsers.length} {otherUsers.length === 1 ? "other person" : "other people"} viewing
        </span>
      )}

      <div className="flex -space-x-3">
        {currentUser && (
          <motion.div
            initial={{ scale: 0, opacity: 0, x: -20 }}
            animate={{ scale: 1, opacity: 1, x: 0 }}
            className="relative group"
            style={{ zIndex: users.length }}
          >
            {currentUser.avatar_url ? (
              <img
                src={currentUser.avatar_url}
                alt={currentUser.name}
                className="w-8 h-8 rounded-full ring-2 ring-purple-500 object-cover"
              />
            ) : (
              <div
                className="w-8 h-8 rounded-full ring-2 ring-purple-500 flex items-center justify-center text-xs font-medium text-white select-none"
                style={{
                  background: `linear-gradient(135deg, ${currentUser.color} 0%, ${currentUser.color}dd 100%)`,
                }}
              >
                {currentUser.name.charAt(0).toUpperCase()}
              </div>
            )}

            <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black/90 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
              {currentUser.name} (You)
            </div>
          </motion.div>
        )}

        <AnimatePresence mode="popLayout">
          {displayUsers.map((user, index) => (
            <motion.div
              key={user.sessionId || index}
              initial={{ scale: 0, opacity: 0, x: -20 }}
              animate={{ scale: 1, opacity: 1, x: 0 }}
              exit={{ scale: 0, opacity: 0, x: 20 }}
              transition={{ type: "spring", stiffness: 500, damping: 25 }}
              className="relative group"
              style={{ zIndex: displayUsers.length - index }}
            >
              {user.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt={user.name}
                  className="w-8 h-8 rounded-full ring-2 ring-black object-cover"
                />
              ) : (
                <div
                  className="w-8 h-8 rounded-full ring-2 ring-black flex items-center justify-center text-xs font-medium text-white select-none"
                  style={{
                    background: `linear-gradient(135deg, ${user.color} 0%, ${user.color}dd 100%)`,
                  }}
                >
                  {user.name.charAt(0).toUpperCase()}
                </div>
              )}

              {/* Tooltip */}
              <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black/90 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                {user.name}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {remainingCount > 0 && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-8 h-8 rounded-full bg-white/10 border-2 border-white/20 flex items-center justify-center text-xs font-medium text-white/60 ring-2 ring-black relative z-0"
          >
            +{remainingCount}
          </motion.div>
        )}
      </div>
    </div>
  );
}
