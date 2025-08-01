"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { FileText, Save, AlertCircle, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { debounce } from "@/lib/utils/debounce";
import { Button } from "@/components/ui/button";

interface CollaborativeNotesProps {
  notes: string;
  onNotesChange: (notes: string) => void;
  isTyping?: boolean;
  lastEditedBy?: { name: string; color: string } | null;
}

export function CollaborativeNotes({ notes, onNotesChange, isTyping, lastEditedBy }: CollaborativeNotesProps) {
  const [localNotes, setLocalNotes] = useState(notes);
  const [isSaving, setIsSaving] = useState(false);
  const [hasConflict, setHasConflict] = useState(false);
  const [conflictNotes, setConflictNotes] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lastReceivedNotesRef = useRef(notes);
  const isLocalEditRef = useRef(false);

  useEffect(() => {
    if (!isLocalEditRef.current && notes !== localNotes && notes !== lastReceivedNotesRef.current) {
      lastReceivedNotesRef.current = notes;

      if (localNotes !== notes && localNotes !== "") {
        setHasConflict(true);
        setConflictNotes(notes);
      } else {
        setLocalNotes(notes);
      }
    }
    isLocalEditRef.current = false;
  }, [notes, localNotes]);

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
    isLocalEditRef.current = true;
    setLocalNotes(value);
    setHasConflict(false);
    debouncedSave(value);
  };

  const handleResolveConflict = (resolution: "keep" | "discard" | "merge") => {
    if (resolution === "keep") {
      isLocalEditRef.current = true;
      onNotesChange(localNotes);
    } else if (resolution === "discard") {
      setLocalNotes(conflictNotes);
      lastReceivedNotesRef.current = conflictNotes;
    } else if (resolution === "merge") {
      const merged = `${localNotes}\n\n--- Changes from ${
        lastEditedBy?.name || "another user"
      } ---\n\n${conflictNotes}`;
      isLocalEditRef.current = true;
      setLocalNotes(merged);
      onNotesChange(merged);
    }
    setHasConflict(false);
    setConflictNotes("");
  };

  const autoResizeTextarea = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  };

  useEffect(() => {
    autoResizeTextarea();
  }, [localNotes]);

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

      {/* Conflict resolution banner */}
      {hasConflict && (
        <div className="bg-yellow-500/10 border-y border-yellow-500/20 p-3">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-yellow-400 mb-1">Conflicting changes detected</p>
              <p className="text-xs text-white/60 mb-3">
                {lastEditedBy?.name || "Another user"} made changes while you were editing.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="glass"
                  onClick={() => handleResolveConflict("keep")}
                  className="text-xs hover:bg-yellow-500/10 hover:border-yellow-400/50"
                >
                  Keep my changes
                </Button>
                <Button
                  size="sm"
                  variant="glass"
                  onClick={() => handleResolveConflict("discard")}
                  className="text-xs hover:bg-red-500/10 hover:border-red-400/50"
                >
                  Use their changes
                </Button>
                <Button
                  size="sm"
                  variant="glass"
                  onClick={() => handleResolveConflict("merge")}
                  className="text-xs hover:bg-green-500/10 hover:border-green-400/50"
                >
                  Merge both
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="relative">
        <textarea
          ref={textareaRef}
          value={localNotes}
          onChange={handleChange}
          placeholder="Add meeting notes here. Changes are saved automatically and visible to everyone..."
          className={cn(
            "w-full min-h-[300px] p-4 bg-transparent text-white/90 placeholder:text-white/40",
            "resize-none outline-none",
            "transition-all duration-200"
          )}
          style={{ overflow: "hidden" }}
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

      <div className="p-3 border-t border-white/10 flex items-center justify-between">
        <p className="text-xs text-white/40">💡 Tip: All participants can edit these notes in real-time</p>
        {hasConflict && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => window.location.reload()}
            className="text-xs text-white/60 hover:text-white"
          >
            <RefreshCw className="w-3 h-3 mr-1" />
            Refresh page
          </Button>
        )}
      </div>
    </div>
  );
}
