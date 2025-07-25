"use client";

import { useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Database } from "@/types/supabase";
import { MeetingCard } from "./meeting-card";

type Meeting = Database["public"]["Tables"]["meetings"]["Row"];

interface VirtualMeetingsListProps {
  meetings: Meeting[];
  onView: (meeting: Meeting) => void;
  onEdit: (meeting: Meeting) => void;
  onDelete: (id: string) => void;
}

export function VirtualMeetingsList({ meetings, onView, onEdit, onDelete }: VirtualMeetingsListProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  const columnCount = 3; // Default to 3 columns, could be made responsive
  const rowCount = Math.ceil(meetings.length / columnCount);

  const rowVirtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 320, // Estimated row height
    overscan: 2,
  });

  return (
    <div
      ref={parentRef}
      className="h-[calc(100vh-16rem)] overflow-auto"
      style={{
        contain: "strict",
      }}
    >
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          width: "100%",
          position: "relative",
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const startIndex = virtualRow.index * columnCount;
          const endIndex = Math.min(startIndex + columnCount, meetings.length);
          const rowMeetings = meetings.slice(startIndex, endIndex);

          return (
            <div
              key={virtualRow.key}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 h-full">
                {rowMeetings.map((meeting) => (
                  <div key={meeting.id} className="stagger-animation">
                    <MeetingCard meeting={meeting} onView={onView} onEdit={onEdit} onDelete={onDelete} />
                  </div>
                ))}
                {Array(columnCount - rowMeetings.length)
                  .fill(null)
                  .map((_, index) => (
                    <div key={`empty-${virtualRow.index}-${index}`} />
                  ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
