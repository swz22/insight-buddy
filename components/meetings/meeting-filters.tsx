"use client";

import { Search, Calendar, X } from "lucide-react";
import { Button } from "@/components/ui/button";

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

  return (
    <div className="w-full mb-8 space-y-4">
      {/* Search Bar */}
      <div className="relative group">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-cyan-500/10 rounded-xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 w-5 h-5 pointer-events-none z-10" />
          <input
            type="text"
            placeholder="Search meetings..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full h-12 pl-12 pr-4 rounded-xl bg-white/[0.03] backdrop-blur-sm text-white placeholder:text-white/40 focus:bg-white/[0.05] transition-all duration-200 focus-ring-cyan smooth-border"
          />
        </div>
      </div>

      {/* Date Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Start Date */}
        <div className="relative group">
          <div className="absolute inset-0 bg-purple-500/10 rounded-xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="relative">
            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 w-5 h-5 pointer-events-none z-10" />
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => onDateRangeChange({ ...dateRange, start: e.target.value })}
              onMouseDown={(e) => {
                // Prevent text selection but allow normal date picker behavior
                const input = e.target as HTMLInputElement;
                setTimeout(() => {
                  if (document.activeElement !== input) {
                    input.focus();
                  }
                }, 0);
              }}
              className="w-full h-12 pl-12 pr-4 rounded-xl bg-white/[0.03] backdrop-blur-sm text-white focus:bg-white/[0.05] transition-all duration-200 cursor-pointer focus-ring-cyan smooth-border"
              style={{ colorScheme: "dark" }}
            />
            {!dateRange.start && (
              <span className="absolute inset-y-0 left-12 right-4 flex items-center text-sm text-white/40 pointer-events-none">
                Start date
              </span>
            )}
          </div>
        </div>

        {/* End Date */}
        <div className="relative group">
          <div className="absolute inset-0 bg-cyan-500/10 rounded-xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="relative">
            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 w-5 h-5 pointer-events-none z-10" />
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => onDateRangeChange({ ...dateRange, end: e.target.value })}
              onMouseDown={(e) => {
                // Prevent text selection but allow normal date picker behavior
                const input = e.target as HTMLInputElement;
                setTimeout(() => {
                  if (document.activeElement !== input) {
                    input.focus();
                  }
                }, 0);
              }}
              className="w-full h-12 pl-12 pr-4 rounded-xl bg-white/[0.03] backdrop-blur-sm text-white focus:bg-white/[0.05] transition-all duration-200 cursor-pointer focus-ring-cyan smooth-border"
              style={{ colorScheme: "dark" }}
            />
            {!dateRange.end && (
              <span className="absolute inset-y-0 left-12 right-4 flex items-center text-sm text-white/40 pointer-events-none">
                End date
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Clear Filters Button */}
      {hasActiveFilters && (
        <div className="flex justify-end pt-2">
          <Button
            variant="glass"
            onClick={onClearFilters}
            className="h-10 px-6 hover:border-red-400/50 hover:text-red-300 hover:bg-red-500/10 group"
          >
            <X className="w-4 h-4 mr-2 group-hover:rotate-90 transition-transform duration-300" />
            Clear all filters
          </Button>
        </div>
      )}
    </div>
  );
}
