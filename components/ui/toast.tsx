"use client";

import { useToastStore } from "@/hooks/use-toast";
import { X, CheckCircle2, XCircle, Info } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function Toaster() {
  const { toasts, removeToast } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-3 pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => {
          const Icon = toast.type === "success" ? CheckCircle2 : toast.type === "error" ? XCircle : Info;

          const colors = {
            success: {
              icon: "text-green-400",
              border: "border-green-500/30",
              bg: "from-green-500/10 to-green-600/10",
              glow: "shadow-green-500/20",
            },
            error: {
              icon: "text-red-400",
              border: "border-red-500/30",
              bg: "from-red-500/10 to-red-600/10",
              glow: "shadow-red-500/20",
            },
            info: {
              icon: "text-blue-400",
              border: "border-blue-500/30",
              bg: "from-blue-500/10 to-blue-600/10",
              glow: "shadow-blue-500/20",
            },
          }[toast.type];

          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 50, scale: 0.3 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5, transition: { duration: 0.2 } }}
              className="pointer-events-auto"
            >
              <div
                className={`
                  flex items-center gap-3 px-4 py-3 rounded-lg
                  bg-black/80 backdrop-blur-xl
                  border ${colors.border}
                  shadow-xl ${colors.glow}
                  min-w-[300px] max-w-md
                  relative overflow-hidden
                  group
                `}
              >
                {/* Background gradient */}
                <div className={`absolute inset-0 bg-gradient-to-r ${colors.bg} opacity-50`} />

                {/* Content */}
                <div className="relative flex items-center gap-3 flex-1">
                  <Icon className={`w-5 h-5 ${colors.icon} shrink-0`} />
                  <span className="text-sm text-white/90 leading-tight">{toast.message}</span>
                </div>

                {/* Close button */}
                <button
                  onClick={() => removeToast(toast.id)}
                  className="relative ml-2 p-1 rounded-md hover:bg-white/10 transition-colors group-hover:opacity-100 opacity-60"
                >
                  <X className="w-4 h-4 text-white/60 hover:text-white/90" />
                </button>

                {/* Progress bar */}
                <motion.div
                  className="absolute bottom-0 left-0 h-0.5 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                  initial={{ width: "100%" }}
                  animate={{ width: "0%" }}
                  transition={{ duration: 3, ease: "linear" }}
                />
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
