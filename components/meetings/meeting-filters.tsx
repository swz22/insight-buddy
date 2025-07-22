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
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/60 w-5 h-5 pointer-events-none z-10" />
          <input
            type="text"
            placeholder="Search meetings..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full h-12 pl-12 pr-4 rounded-xl bg-white/5 backdrop-blur-md border-2 border-white/20 text-white placeholder:text-white/50 focus:outline-none focus:border-cyan-500 focus:bg-white/8 hover:border-white/30 hover:bg-white/6 transition-all duration-200"
          />
        </div>
      </div>

      {/* Date Filters - Using inline grid styles to ensure it works */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: "1rem",
          width: "100%",
        }}
      >
        {/* Start Date */}
        <div style={{ gridColumn: "1" }}>
          <div className="relative group">
            <div className="absolute inset-0 bg-purple-500/10 rounded-xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="relative">
              <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-white/60 w-5 h-5 pointer-events-none z-10" />
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => onDateRangeChange({ ...dateRange, start: e.target.value })}
                onFocus={(e) => {
                  e.target.blur();
                  setTimeout(() => {
                    e.target.showPicker?.();
                  }, 10);
                }}
                className="w-full h-12 pl-12 pr-4 rounded-xl bg-white/5 backdrop-blur-md border-2 border-white/20 text-white focus:outline-none focus:border-cyan-500 focus:bg-white/8 hover:border-white/30 hover:bg-white/6 transition-all duration-200 cursor-pointer select-none"
                style={{ colorScheme: "dark" }}
              />
              {!dateRange.start && (
                <span className="absolute inset-y-0 right-4 flex items-center text-sm text-white/40 pointer-events-none select-none">
                  Start date
                </span>
              )}
            </div>
          </div>
        </div>

        {/* End Date */}
        <div style={{ gridColumn: "2" }}>
          <div className="relative group">
            <div className="absolute inset-0 bg-cyan-500/10 rounded-xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="relative">
              <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-white/60 w-5 h-5 pointer-events-none z-10" />
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => onDateRangeChange({ ...dateRange, end: e.target.value })}
                onFocus={(e) => {
                  e.target.blur();
                  setTimeout(() => {
                    e.target.showPicker?.();
                  }, 10);
                }}
                className="w-full h-12 pl-12 pr-4 rounded-xl bg-white/5 backdrop-blur-md border-2 border-white/20 text-white focus:outline-none focus:border-cyan-500 focus:bg-white/8 hover:border-white/30 hover:bg-white/6 transition-all duration-200 cursor-pointer select-none"
                style={{ colorScheme: "dark" }}
              />
              {!dateRange.end && (
                <span className="absolute inset-y-0 right-4 flex items-center text-sm text-white/40 pointer-events-none select-none">
                  End date
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Clear Filters Button */}
      {hasActiveFilters && (
        <div className="flex justify-end">
          <Button
            variant="outline"
            onClick={onClearFilters}
            className="h-10 px-6 rounded-xl bg-white/5 backdrop-blur-md border-2 border-white/20 text-white hover:text-white hover:border-cyan-500/60 hover:bg-white/8 group transition-all duration-200"
          >
            <X className="w-4 h-4 mr-2 group-hover:rotate-90 transition-transform duration-300" />
            Clear all filters
          </Button>
        </div>
      )}
    </div>
  );
}
