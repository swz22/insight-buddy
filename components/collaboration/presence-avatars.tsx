"use client";

import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface UserInfo {
  name: string;
  email?: string;
  avatar_url?: string;
  color: string;
}

interface Presence {
  user_info: UserInfo;
  status: "active" | "idle" | "typing";
  joined_at: string;
}

interface PresenceAvatarsProps {
  presence: Record<string, Presence>;
  currentUser?: string;
  maxDisplay?: number;
}

export function PresenceAvatars({ presence, currentUser, maxDisplay = 5 }: PresenceAvatarsProps) {
  const presenceArray = Object.entries(presence)
    .filter(([_, p]) => p.user_info?.name !== currentUser)
    .map(([key, p]) => ({ key, ...p }))
    .sort((a, b) => new Date(b.joined_at).getTime() - new Date(a.joined_at).getTime());

  const displayUsers = presenceArray.slice(0, maxDisplay);
  const remainingCount = Math.max(0, presenceArray.length - maxDisplay);

  if (presenceArray.length === 0) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-white/40">No one else viewing</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-white/60">
        {presenceArray.length} {presenceArray.length === 1 ? "person" : "people"} viewing:
      </span>

      <div className="flex -space-x-3">
        <AnimatePresence mode="popLayout">
          {displayUsers.map((user) => (
            <motion.div
              key={user.key}
              initial={{ scale: 0, opacity: 0, x: -20 }}
              animate={{ scale: 1, opacity: 1, x: 0 }}
              exit={{ scale: 0, opacity: 0, x: 20 }}
              transition={{ type: "spring", stiffness: 500, damping: 25 }}
              className="relative group"
              style={{ zIndex: displayUsers.length - displayUsers.indexOf(user) }}
            >
              {user.user_info.avatar_url ? (
                <img
                  src={user.user_info.avatar_url}
                  alt={user.user_info.name}
                  className={cn(
                    "w-8 h-8 rounded-full ring-2 ring-black",
                    "transition-all duration-200",
                    "group-hover:ring-4 group-hover:z-50",
                    user.status === "idle" && "opacity-60",
                    user.status === "typing" && "ring-blue-400"
                  )}
                  style={{ borderColor: user.user_info.color, borderWidth: "2px" }}
                />
              ) : (
                <div
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center",
                    "text-xs font-medium text-white ring-2 ring-black",
                    "transition-all duration-200",
                    "group-hover:ring-4 group-hover:z-50 group-hover:scale-110",
                    user.status === "idle" && "opacity-60"
                  )}
                  style={{
                    backgroundColor: user.user_info.color,
                    borderColor: user.status === "typing" ? "#60A5FA" : user.user_info.color,
                    borderWidth: user.status === "typing" ? "2px" : "0",
                    borderStyle: "solid",
                  }}
                >
                  {user.user_info.name.charAt(0).toUpperCase()}
                </div>
              )}

              {/* Status indicator */}
              {user.status === "typing" && (
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center ring-2 ring-black">
                  <motion.div className="flex gap-0.5" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    {[0, 1, 2].map((i) => (
                      <motion.div
                        key={i}
                        className="w-1 h-1 bg-white rounded-full"
                        animate={{ y: [0, -3, 0] }}
                        transition={{
                          duration: 0.6,
                          repeat: Infinity,
                          delay: i * 0.1,
                        }}
                      />
                    ))}
                  </motion.div>
                </div>
              )}

              {user.status === "idle" && (
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-yellow-500 rounded-full ring-2 ring-black" />
              )}

              {/* Tooltip */}
              <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black/90 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                {user.user_info.name}
                {user.status === "idle" && " (idle)"}
                {user.status === "typing" && " (typing...)"}
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
