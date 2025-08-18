"use client";

import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, Circle, Loader2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface GenerationStep {
  id: string;
  label: string;
  status: "pending" | "processing" | "completed" | "error";
  timestamp?: string;
}

interface GenerationStatusProps {
  steps: GenerationStep[];
  className?: string;
}

export function GenerationStatus({ steps, className }: GenerationStatusProps) {
  const getStatusIcon = (status: GenerationStep["status"]) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="w-5 h-5 text-green-400" />;
      case "processing":
        return <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />;
      case "error":
        return <AlertCircle className="w-5 h-5 text-red-400" />;
      default:
        return <Circle className="w-5 h-5 text-white/20" />;
    }
  };

  const getStatusColor = (status: GenerationStep["status"]) => {
    switch (status) {
      case "completed":
        return "text-green-400";
      case "processing":
        return "text-cyan-400";
      case "error":
        return "text-red-400";
      default:
        return "text-white/40";
    }
  };

  return (
    <Card className={cn("bg-white/[0.02] border-white/10", className)}>
      <CardContent className="p-6">
        <h3 className="text-sm font-medium text-white/70 mb-4">AI Processing Status</h3>
        <div className="space-y-3">
          <AnimatePresence mode="wait">
            {steps.map((step, index) => (
              <motion.div
                key={step.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  {getStatusIcon(step.status)}
                  <span className={cn("text-sm", getStatusColor(step.status))}>{step.label}</span>
                </div>
                {step.timestamp && <span className="text-xs text-white/40">{step.timestamp}</span>}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </CardContent>
    </Card>
  );
}
