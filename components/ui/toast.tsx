"use client";

import { useToastStore } from "@/hooks/use-toast";
import { X } from "lucide-react";

export function Toaster() {
  const { toasts, removeToast } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`
            flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg
            ${toast.type === "success" ? "bg-green-500 text-white" : ""}
            ${toast.type === "error" ? "bg-red-500 text-white" : ""}
            ${toast.type === "info" ? "bg-blue-500 text-white" : ""}
          `}
        >
          <span>{toast.message}</span>
          <button onClick={() => removeToast(toast.id)} className="ml-2 hover:opacity-80">
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
