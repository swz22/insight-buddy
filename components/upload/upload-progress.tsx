"use client";

import { useAppStore } from "@/stores/app-store";
import { Upload } from "lucide-react";

export function UploadProgress() {
  const uploadProgress = useAppStore((state) => state.uploadProgress);

  if (uploadProgress === 0 || uploadProgress === 100) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-lg p-4 min-w-[300px] border">
      <div className="flex items-center gap-3 mb-3">
        <Upload className="w-5 h-5 text-blue-500 animate-pulse" />
        <p className="text-sm font-medium">Uploading audio...</p>
      </div>

      <div className="space-y-2">
        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
          <div
            className="bg-blue-500 h-2 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${uploadProgress}%` }}
          />
        </div>

        <div className="flex justify-between text-xs text-gray-600">
          <span>{uploadProgress}% complete</span>
          <span>{uploadProgress < 100 ? "Processing..." : "Almost done..."}</span>
        </div>
      </div>
    </div>
  );
}
