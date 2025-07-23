"use client";

import { useAppStore } from "@/stores/app-store";
import { Upload, Loader2, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";

export function UploadProgress() {
  const uploadProgress = useAppStore((state) => state.uploadProgress);
  const [showComplete, setShowComplete] = useState(false);

  useEffect(() => {
    if (uploadProgress === 100) {
      setShowComplete(true);
      const timer = setTimeout(() => {
        setShowComplete(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [uploadProgress]);

  if (uploadProgress === 0 || (uploadProgress === 100 && !showComplete)) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 100, scale: 0.8 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 100, scale: 0.8 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="fixed bottom-4 left-4 z-50"
      >
        <div className="bg-black/80 backdrop-blur-xl rounded-xl shadow-2xl p-5 min-w-[320px] border border-white/10 relative overflow-hidden">
          {/* Animated background gradient */}
          <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 via-cyan-500/10 to-purple-500/10 animate-gradient-shift opacity-50" />

          {/* Content */}
          <div className="relative space-y-4">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500/20 to-cyan-500/20 flex items-center justify-center">
                  <Upload className="w-5 h-5 text-purple-400 animate-pulse" />
                </div>
                <div className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-500 to-cyan-500 animate-spin opacity-20 blur-md" />
              </div>

              <div className="flex-1">
                <p className="text-sm font-medium text-white/90">
                  {uploadProgress === 100 ? "Upload complete!" : "Uploading audio..."}
                </p>
                <p className="text-xs text-white/60">
                  {uploadProgress === 100
                    ? "Processing your meeting..."
                    : uploadProgress < 50
                    ? "Processing file..."
                    : uploadProgress < 90
                    ? "Almost there..."
                    : "Finalizing..."}
                </p>
              </div>

              <div className="text-2xl font-bold">
                {uploadProgress === 100 ? (
                  <CheckCircle2 className="w-8 h-8 text-green-400" />
                ) : (
                  <span className="gradient-text">{uploadProgress}%</span>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <div className="relative w-full h-2 bg-white/10 rounded-full overflow-hidden">
                {/* Background shimmer */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer" />

                {/* Progress bar */}
                <motion.div
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-purple-500 to-cyan-500 rounded-full"
                  initial={{ width: "0%" }}
                  animate={{ width: `${uploadProgress}%` }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                >
                  {/* Glow effect on progress */}
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-400 to-cyan-400 blur-sm opacity-70" />
                </motion.div>

                {/* Edge glow */}
                <motion.div
                  className="absolute top-0 bottom-0 w-4 bg-gradient-to-r from-transparent to-white/30 blur-md"
                  animate={{ left: `${uploadProgress}%` }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                />
              </div>

              <div className="flex justify-between text-xs text-white/40">
                <span className="flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  {uploadProgress < 100 ? "Uploading..." : "Almost done..."}
                </span>
                <span>Please wait</span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
