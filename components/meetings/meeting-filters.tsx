"use client";

import { Search, X, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRef, useState } from "react";
import { format } from "date-fns";

interface MeetingFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  dateRange: { start: string; end: string };
  onDateRangeChange: (range: { start: string; end: string }) => void;
  onClearFilters: () => void;
}

export function MeetingFilters({
  searchTerm,
  onSearchChange,
  dateRange,
  onDateRangeChange,
  onClearFilters,
}: MeetingFiltersProps) {
  const hasActiveFilters = searchTerm || dateRange.start || dateRange.end;
  const startInputRef = useRef<HTMLInputElement>(null);
  const endInputRef = useRef<HTMLInputElement>(null);

  const [searchFocused, setSearchFocused] = useState(false);
  const [startDateFocused, setStartDateFocused] = useState(false);
  const [endDateFocused, setEndDateFocused] = useState(false);

  const formatDateDisplay = (dateString: string) => {
    if (!dateString) return "";
    try {
      return format(new Date(dateString), "MMM d, yyyy");
    } catch {
      return dateString;
    }
  };

  return (
    <div className="w-full mb-8 space-y-4">
      <div className="relative group">
        <Search
          className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 pointer-events-none z-10 transition-all duration-300 ${
            searchFocused ? "text-blue-500" : "text-white/60 group-hover:text-blue-500/70"
          }`}
        />
        <input
          type="text"
          placeholder="Search meetings..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
          className="w-full h-12 pl-12 pr-4 rounded-xl bg-black/50 backdrop-blur-sm text-white placeholder:text-white/50 transition-all duration-300 outline-none"
          style={{
            border: "2px solid",
            borderColor: searchFocused ? "rgb(59, 130, 246)" : "rgba(255, 255, 255, 0.4)",
            boxShadow: searchFocused ? "0 0 20px rgba(59, 130, 246, 0.4)" : "none",
          }}
          onMouseEnter={(e) => {
            if (!searchFocused) {
              e.currentTarget.style.borderColor = "rgba(59, 130, 246, 0.6)";
            }
          }}
          onMouseLeave={(e) => {
            if (!searchFocused) {
              e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.4)";
            }
          }}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="relative">
          <button
            onClick={() => startInputRef.current?.showPicker()}
            onFocus={() => setStartDateFocused(true)}
            onBlur={() => setStartDateFocused(false)}
            className="w-full h-12 px-4 rounded-xl bg-black/50 backdrop-blur-sm text-left flex items-center gap-3 transition-all duration-300 outline-none"
            style={{
              border: "2px solid",
              borderColor: startDateFocused ? "rgb(59, 130, 246)" : "rgba(255, 255, 255, 0.4)",
              boxShadow: startDateFocused ? "0 0 20px rgba(59, 130, 246, 0.4)" : "none",
            }}
            onMouseEnter={(e) => {
              if (!startDateFocused) {
                e.currentTarget.style.borderColor = "rgba(59, 130, 246, 0.6)";
              }
            }}
            onMouseLeave={(e) => {
              if (!startDateFocused) {
                e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.4)";
              }
            }}
          >
            <Calendar className="w-5 h-5 text-white/60" />
            <span className={dateRange.start ? "text-white" : "text-white/50"}>
              {dateRange.start ? formatDateDisplay(dateRange.start) : "Start date"}
            </span>
          </button>
          <input
            ref={startInputRef}
            type="date"
            value={dateRange.start}
            onChange={(e) => onDateRangeChange({ ...dateRange, start: e.target.value })}
            className="absolute opacity-0 pointer-events-none"
            tabIndex={-1}
          />
        </div>

        <div className="relative">
          <button
            onClick={() => endInputRef.current?.showPicker()}
            onFocus={() => setEndDateFocused(true)}
            onBlur={() => setEndDateFocused(false)}
            className="w-full h-12 px-4 rounded-xl bg-black/50 backdrop-blur-sm text-left flex items-center gap-3 transition-all duration-300 outline-none"
            style={{
              border: "2px solid",
              borderColor: endDateFocused ? "rgb(59, 130, 246)" : "rgba(255, 255, 255, 0.4)",
              boxShadow: endDateFocused ? "0 0 20px rgba(59, 130, 246, 0.4)" : "none",
            }}
            onMouseEnter={(e) => {
              if (!endDateFocused) {
                e.currentTarget.style.borderColor = "rgba(59, 130, 246, 0.6)";
              }
            }}
            onMouseLeave={(e) => {
              if (!endDateFocused) {
                e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.4)";
              }
            }}
          >
            <Calendar className="w-5 h-5 text-white/60" />
            <span className={dateRange.end ? "text-white" : "text-white/50"}>
              {dateRange.end ? formatDateDisplay(dateRange.end) : "End date"}
            </span>
          </button>
          <input
            ref={endInputRef}
            type="date"
            value={dateRange.end}
            onChange={(e) => onDateRangeChange({ ...dateRange, end: e.target.value })}
            className="absolute opacity-0 pointer-events-none"
            tabIndex={-1}
          />
        </div>
      </div>

      {hasActiveFilters && (
        <div className="flex justify-end pt-2">
          <Button
            variant="glass"
            onClick={onClearFilters}
            className="h-10 px-6 border-2 border-red-400/40 text-red-400 hover:border-red-400/70 hover:text-red-300 hover:bg-red-500/15 hover:shadow-lg hover:shadow-red-500/20 group transition-all duration-300"
          >
            <X className="w-4 h-4 mr-2 group-hover:rotate-90 transition-transform duration-300" />
            Clear all filters
          </Button>
        </div>
      )}
    </div>
  );
}
