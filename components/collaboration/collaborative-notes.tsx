"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Edit3, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

interface UserInfo {
  name: string;
  email?: string;
  avatar_url?: string;
  color: string;
  sessionId?: string;
}

interface CollaborativeNotesProps {
  value: string;
  onChange: (value: string) => void;
  lastEditedBy: UserInfo | null;
  currentUserName?: string;
  onFocus?: () => void;
  onBlur?: () => void;
}

export function CollaborativeNotes({
  value,
  onChange,
  lastEditedBy,
  currentUserName,
  onFocus,
  onBlur,
}: CollaborativeNotesProps) {
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
    onChange(localValue);
    setIsEditing(false);
    onBlur?.();
  };

  const handleCancel = () => {
    setLocalValue(value);
    setIsEditing(false);
    onBlur?.();
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setLocalValue(newValue);
    onChange(newValue);
  };

  const handleFocus = () => {
    onFocus?.();
  };

  const handleBlur = () => {
    if (isEditing) {
      handleSave();
    }
    onBlur?.();
  };

  return (
    <Card className="shadow-xl">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-lg">Shared Notes</CardTitle>
          {lastEditedBy && (
            <p className="text-xs text-white/60 mt-1">
              Last edited by <span style={{ color: lastEditedBy.color }}>{lastEditedBy.name}</span>
              {lastEditedBy.name !== currentUserName && " just now"}
            </p>
          )}
        </div>
        {!isEditing && (
          <Button variant="ghost" size="sm" onClick={handleEdit} className="hover:bg-white/10">
            <Edit3 className="w-4 h-4" />
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {isEditing ? (
          <div className="space-y-3">
            <textarea
              ref={textareaRef}
              value={localValue}
              onChange={handleChange}
              onFocus={handleFocus}
              onBlur={handleBlur}
              placeholder="Add notes about this meeting..."
              className={cn(
                "w-full min-h-[200px] p-3 rounded-lg",
                "bg-white/[0.03] border border-white/20",
                "text-white placeholder:text-white/40",
                "focus:outline-none focus:border-purple-400/60",
                "resize-none transition-all duration-200"
              )}
            />
            <div className="flex gap-2">
              <Button variant="glow" size="sm" onClick={handleSave} className="shadow-lg">
                <Save className="w-4 h-4 mr-2" />
                Save
              </Button>
              <Button variant="ghost" size="sm" onClick={handleCancel} className="hover:bg-white/10">
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div
            onClick={handleEdit}
            className={cn(
              "min-h-[200px] p-3 rounded-lg cursor-pointer",
              "bg-white/[0.03] border border-white/20",
              "hover:border-white/30 transition-all duration-200",
              "whitespace-pre-wrap"
            )}
          >
            {localValue || <span className="text-white/40 italic">Click to add notes...</span>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
