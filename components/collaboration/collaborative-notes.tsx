"use client";

import { useState, useEffect, useCallback } from "react";
import { FileText, Save } from "lucide-react";
import { cn } from "@/lib/utils";
import { debounce } from "@/lib/utils/debounce";

interface CollaborativeNotesProps {
  notes: string;
  onNotesChange: (notes: string) => void;
  isTyping?: boolean;
  lastEditedBy?: { name: string; color: string };
}

export function CollaborativeNotes({ notes, onNotesChange, isTyping, lastEditedBy }: CollaborativeNotesProps) {
  const [localNotes, setLocalNotes] = useState(notes);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setLocalNotes(notes);
  }, [notes]);

  const debouncedSave = useCallback(
    debounce((value: string) => {
      setIsSaving(true);
      onNotesChange(value);
      setTimeout(() => setIsSaving(false), 500);
    }, 1000),
    [onNotesChange]
  );

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setLocalNotes(value);
    debouncedSave(value);
  };

  return (
    <div className="bg-white/[0.03] rounded-lg border border-white/20 overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-white/60" />
          <h3 className="font-medium text-white/90">Collaborative Notes</h3>
        </div>

        <div className="flex items-center gap-3">
          {lastEditedBy && (
            <div className="flex items-center gap-2 text-xs text-white/50">
              <span>Last edited by</span>
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: lastEditedBy.color }} />
                <span>{lastEditedBy.name}</span>
              </div>
            </div>
          )}

          {isSaving && (
            <div className="flex items-center gap-1 text-xs text-green-400">
              <Save className="w-3 h-3" />
              <span>Saving...</span>
            </div>
          )}

          {isTyping && !isSaving && (
            <div className="flex items-center gap-1 text-xs text-blue-400">
              <span>Someone is typing...</span>
            </div>
          )}
        </div>
      </div>

      <div className="relative">
        <textarea
          value={localNotes}
          onChange={handleChange}
          placeholder="Add meeting notes here. Changes are saved automatically and visible to everyone..."
          className={cn(
            "w-full h-64 p-4 bg-transparent text-white/90 placeholder:text-white/40",
            "resize-none outline-none",
            "transition-all duration-200"
          )}
        />

        {/* Typing indicator overlay */}
        {isTyping && (
          <div className="absolute bottom-4 left-4 flex items-center gap-2 text-xs text-blue-400">
            <div className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce"
                  style={{ animationDelay: `${i * 0.1}s` }}
                />
              ))}
            </div>
            <span>Someone is typing...</span>
          </div>
        )}
      </div>

      <div className="p-3 border-t border-white/10 text-xs text-white/40">
        💡 Tip: All participants can edit these notes in real-time
      </div>
    </div>
  );
}
