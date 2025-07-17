"use client";

import { useState, useMemo } from "react";
import { Database } from "@/types/supabase";

type Meeting = Database["public"]["Tables"]["meetings"]["Row"];

export function useMeetingFilters(meetings: Meeting[] | undefined) {
  const [searchTerm, setSearchTerm] = useState("");
  const [dateRange, setDateRange] = useState({ start: "", end: "" });

  const filteredMeetings = useMemo(() => {
    if (!meetings) return [];

    let filtered = [...meetings];

    // Search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (meeting) =>
          meeting.title.toLowerCase().includes(search) ||
          meeting.description?.toLowerCase().includes(search) ||
          meeting.participants?.some((p) => p.toLowerCase().includes(search))
      );
    }

    // Date range filter
    if (dateRange.start || dateRange.end) {
      filtered = filtered.filter((meeting) => {
        if (!meeting.recorded_at) return false;

        const meetingDate = new Date(meeting.recorded_at);
        const startDate = dateRange.start ? new Date(dateRange.start) : null;
        const endDate = dateRange.end ? new Date(dateRange.end) : null;

        if (startDate && meetingDate < startDate) return false;
        if (endDate) {
          // Set end date to end of day
          const endOfDay = new Date(endDate);
          endOfDay.setHours(23, 59, 59, 999);
          if (meetingDate > endOfDay) return false;
        }

        return true;
      });
    }

    return filtered;
  }, [meetings, searchTerm, dateRange]);

  const clearFilters = () => {
    setSearchTerm("");
    setDateRange({ start: "", end: "" });
  };

  return {
    searchTerm,
    setSearchTerm,
    dateRange,
    setDateRange,
    filteredMeetings,
    clearFilters,
    hasActiveFilters: Boolean(searchTerm || dateRange.start || dateRange.end),
  };
}
