"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Edit3, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface UserInfo {
  name: string;
  email?: string;
  avatar_url?: string;
  color: string;
  sessionId?: string;
}

interface CollaborativeNotesProps {
  value?: string;
  notes?: string;
  onChange?: (value: string) => void;
  onUpdateNotes?: (value: string) => void;
  lastEditedBy?: UserInfo | null;
  currentUserName?: string;
  currentUserColor?: string;
  onFocus?: () => void;
  onBlur?: () => void;
}

export function CollaborativeNotes({
  value: valueProp,
  notes,
  onChange,
  onUpdateNotes,
  lastEditedBy,
  currentUserName,
  currentUserColor,
  onFocus,
  onBlur,
}: CollaborativeNotesProps) {
  const value = valueProp ?? notes ?? "";
  const handleChange = onChange ?? onUpdateNotes ?? (() => {});

  const [isEditing, setIsEditing] = useState(false);
  const [localValue, setLocalValue] = useState(value);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lastReceivedValue = useRef(value);

  useEffect(() => {
    if (value !== lastReceivedValue.current && value !== localValue) {
      setLocalValue(value);
      lastReceivedValue.current = value;
    }
  }, [value, localValue]);

  const handleEdit = () => {
    setIsEditing(true);
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 0);
  };

  const handleSave = () => {
    handleChange(localValue);
    setIsEditing(false);
    onBlur?.();
  };

  const handleCancel = () => {
    setLocalValue(value);
    setIsEditing(false);
    onBlur?.();
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setLocalValue(newValue);
    handleChange(newValue);
  };

  const handleTextFocus = () => {
    onFocus?.();
  };

  const handleTextBlur = () => {
    if (isEditing) {
      handleSave();
    }
    onBlur?.();
  };

  const formatRelativeTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);

    if (seconds < 60) return "just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} minute${minutes > 1 ? "s" : ""} ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
    const days = Math.floor(hours / 24);
    return `${days} day${days > 1 ? "s" : ""} ago`;
  };

  return (
    <div className="space-y-4">
      {lastEditedBy && (
        <p className="text-xs text-white/60">
          Last edited by <span style={{ color: lastEditedBy.color }}>{lastEditedBy.name}</span>
          {lastEditedBy.name !== currentUserName && " just now"}
        </p>
      )}

      {isEditing ? (
        <div className="space-y-2">
          <textarea
            ref={textareaRef}
            value={localValue}
            onChange={handleTextChange}
            onFocus={handleTextFocus}
            onBlur={handleTextBlur}
            className="w-full min-h-[200px] p-4 bg-white/[0.03] border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/20 resize-none"
            placeholder="Add your notes here..."
          />
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" size="sm" onClick={handleCancel}>
              <X className="w-4 h-4 mr-1" />
              Cancel
            </Button>
            <Button variant="glow" size="sm" onClick={handleSave}>
              <Save className="w-4 h-4 mr-1" />
              Save
            </Button>
          </div>
        </div>
      ) : (
        <div
          onClick={handleEdit}
          className={cn(
            "min-h-[200px] p-4 bg-white/[0.03] border border-white/20 rounded-lg cursor-text hover:bg-white/[0.04] transition-colors",
            !localValue && "text-white/40"
          )}
        >
          {localValue || "Click to add notes..."}
        </div>
      )}
    </div>
  );
}
