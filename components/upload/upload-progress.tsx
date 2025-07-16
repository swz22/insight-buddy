"use client";

import { useAppStore } from "@/stores/app-store";

export function UploadProgress() {
  const uploadProgress = useAppStore((state) => state.uploadProgress);

  if (uploadProgress === 0 || uploadProgress === 100) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-lg p-4 min-w-[300px]">
      <p className="text-sm font-medium mb-2">Uploading audio...</p>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className="bg-blue-500 h-2 rounded-full transition-all duration-300"
          style={{ width: `${uploadProgress}%` }}
        />
      </div>
      <p className="text-xs text-gray-500 mt-1">{uploadProgress}%</p>
    </div>
  );
}
