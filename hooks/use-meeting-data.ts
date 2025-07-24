"use client";

import { useMemo } from "react";
import { useMeetings } from "./use-meetings";

export function useMeetingData() {
  const { data: meetings } = useMeetings();

  const previousParticipants = useMemo(() => {
    if (!meetings) return [];

    const participantSet = new Set<string>();
    meetings.forEach((meeting) => {
      meeting.participants?.forEach((participant) => {
        if (participant) participantSet.add(participant);
      });
    });

    return Array.from(participantSet).sort();
  }, [meetings]);

  const previousProjects = useMemo(() => {
    if (!meetings) return [];

    const projectSet = new Set<string>();
    meetings.forEach((meeting) => {
      const projectPattern = /project[:\s]+([^-,]+)/i;
      const titleMatch = meeting.title.match(projectPattern);
      const descMatch = meeting.description?.match(projectPattern);

      if (titleMatch?.[1]) projectSet.add(titleMatch[1].trim());
      if (descMatch?.[1]) projectSet.add(descMatch[1].trim());
    });

    return Array.from(projectSet).sort();
  }, [meetings]);

  return {
    previousParticipants,
    previousProjects,
  };
}
