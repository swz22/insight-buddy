"use client";

import { Search, X, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRef } from "react";
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
      {/* Search Bar */}
      <div className="relative group">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-400/10 to-blue-500/10 rounded-xl blur-xl opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-300" />
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 w-5 h-5 pointer-events-none z-10 transition-all duration-300 group-focus-within:text-blue-400/70 group-focus-within:scale-110" />
          <input
            type="text"
            placeholder="Search meetings..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full h-12 pl-12 pr-4 rounded-xl text-white placeholder:text-white/40 transition-all duration-300 smooth-border"
          />
        </div>
      </div>

      {/* Date Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Start Date */}
        <div className="relative">
          <button
            onClick={() => startInputRef.current?.showPicker()}
            className="w-full h-12 px-4 rounded-xl text-left flex items-center gap-3 transition-all duration-300 smooth-border focus:border-blue-400/50 focus:bg-white/[0.05]"
          >
            <Calendar className="w-5 h-5 text-white/40" />
            <span className={dateRange.start ? "text-white" : "text-white/40"}>
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

        {/* End Date */}
        <div className="relative">
          <button
            onClick={() => endInputRef.current?.showPicker()}
            className="w-full h-12 px-4 rounded-xl text-left flex items-center gap-3 transition-all duration-300 smooth-border focus:border-blue-400/50 focus:bg-white/[0.05]"
          >
            <Calendar className="w-5 h-5 text-white/40" />
            <span className={dateRange.end ? "text-white" : "text-white/40"}>
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

      {/* Clear Filters Button */}
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
