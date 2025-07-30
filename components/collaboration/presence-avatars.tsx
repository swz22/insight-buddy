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
  maxDisplay?: number;
}

export function PresenceAvatars({ presence, maxDisplay = 5 }: PresenceAvatarsProps) {
  const presenceArray = Object.values(presence);
  const displayUsers = presenceArray.slice(0, maxDisplay);
  const remainingCount = Math.max(0, presenceArray.length - maxDisplay);

  console.log("Presence data:", presence);
  console.log("Presence array:", presenceArray);
  console.log("Display users:", displayUsers);

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-white/60">Viewing now:</span>

      <div className="flex -space-x-3">
        <AnimatePresence mode="popLayout">
          {displayUsers.map((user, index) => (
            <motion.div
              key={`${user.user_info.email || user.user_info.name}-${index}`}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: "spring", stiffness: 500, damping: 25 }}
              className="relative group"
            >
              {user.user_info.avatar_url ? (
                <img
                  src={user.user_info.avatar_url}
                  alt={user.user_info.name}
                  className={cn(
                    "w-8 h-8 rounded-full border-2 ring-2 ring-black",
                    user.status === "active" && "border-green-400",
                    user.status === "idle" && "border-yellow-400",
                    user.status === "typing" && "border-blue-400"
                  )}
                  style={{ borderColor: user.user_info.color }}
                />
              ) : (
                <div
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium text-white ring-2 ring-black",
                    user.status === "idle" && "opacity-60"
                  )}
                  style={{ backgroundColor: user.user_info.color }}
                >
                  {user.user_info.name.charAt(0).toUpperCase()}
                </div>
              )}

              {/* Status indicator */}
              {user.status === "typing" && (
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
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

              {/* Tooltip */}
              <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black/90 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
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
            className="w-8 h-8 rounded-full bg-white/10 border-2 border-white/20 flex items-center justify-center text-xs font-medium text-white/60 ring-2 ring-black"
          >
            +{remainingCount}
          </motion.div>
        )}
      </div>

      {presenceArray.length === 0 && <span className="text-xs text-white/40">No one else viewing</span>}
    </div>
  );
}
