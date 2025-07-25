"use client";

import { CheckCircle2, Circle, AlertCircle } from "lucide-react";
import type { ActionItemStats } from "@/lib/services/analytics";
import { cn } from "@/lib/utils";

interface ActionItemsChartProps {
  stats?: ActionItemStats;
}

export function ActionItemsChart({ stats }: ActionItemsChartProps) {
  if (!stats || stats.total === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-white/40">
        <CheckCircle2 className="w-12 h-12 mb-2" />
        <p>No action items tracked yet</p>
      </div>
    );
  }

  const priorities = [
    { key: "high" as const, label: "High", color: "from-red-500 to-red-600", textColor: "text-red-400" },
    { key: "medium" as const, label: "Medium", color: "from-yellow-500 to-yellow-600", textColor: "text-yellow-400" },
    { key: "low" as const, label: "Low", color: "from-green-500 to-green-600", textColor: "text-green-400" },
  ];

  return (
    <div className="space-y-6">
      {/* Overall Progress */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-white/70">Overall Completion</span>
          <span className="text-2xl font-bold gradient-text">{stats.completionRate}%</span>
        </div>
        <div className="h-3 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-purple-500 to-cyan-500 transition-all duration-500"
            style={{ width: `${stats.completionRate}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-white/50 mt-1">
          <span>{stats.completed} completed</span>
          <span>{stats.pending} pending</span>
        </div>
      </div>

      {/* By Priority */}
      <div className="space-y-4">
        {priorities.map((priority) => {
          const data = stats.byPriority[priority.key];
          const percentage = data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0;

          return (
            <div key={priority.key}>
              <div className="flex justify-between items-center mb-1">
                <span className={cn("text-sm font-medium", priority.textColor)}>{priority.label} Priority</span>
                <span className="text-xs text-white/50">
                  {data.completed}/{data.total}
                </span>
              </div>
              <div className="h-8 bg-white/5 rounded-lg overflow-hidden relative">
                <div
                  className={cn("h-full bg-gradient-to-r transition-all duration-500", priority.color)}
                  style={{ width: `${percentage}%` }}
                />
                <span className="absolute inset-0 flex items-center justify-center text-xs font-medium text-white/70">
                  {percentage}%
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Status Summary */}
      <div className="grid grid-cols-3 gap-4 pt-4 border-t border-white/10">
        <div className="text-center">
          <CheckCircle2 className="w-8 h-8 text-green-400 mx-auto mb-1" />
          <p className="text-2xl font-bold text-white/90">{stats.completed}</p>
          <p className="text-xs text-white/50">Completed</p>
        </div>
        <div className="text-center">
          <Circle className="w-8 h-8 text-yellow-400 mx-auto mb-1" />
          <p className="text-2xl font-bold text-white/90">{stats.pending - stats.overdue}</p>
          <p className="text-xs text-white/50">In Progress</p>
        </div>
        <div className="text-center">
          <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-1" />
          <p className="text-2xl font-bold text-white/90">{stats.overdue}</p>
          <p className="text-xs text-white/50">Overdue</p>
        </div>
      </div>
    </div>
  );
}
