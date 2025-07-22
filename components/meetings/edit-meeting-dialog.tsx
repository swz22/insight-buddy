"use client";

import { useState } from "react";
import { X, Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Database } from "@/types/supabase";
import { meetingFormSchema, type MeetingFormData } from "@/lib/validations/meeting";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";

type Meeting = Database["public"]["Tables"]["meetings"]["Row"];

interface EditMeetingDialogProps {
  meeting: Meeting;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (updatedMeeting: Meeting) => void;
}

export function EditMeetingDialog({ meeting, isOpen, onClose, onUpdate }: EditMeetingDialogProps) {
  const toast = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: meeting.title,
    description: meeting.description || "",
  });

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate form data
    try {
      meetingFormSchema.parse(formData);
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.issues[0]?.message || "Validation error");
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/meetings/${meeting.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description || null,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update meeting");
      }

      const updatedMeeting = await response.json();
      onUpdate(updatedMeeting);
      toast.success("Meeting updated successfully");
      onClose();
    } catch (error) {
      console.error("Error updating meeting:", error);
      toast.error(error instanceof Error ? error.message : "Failed to update meeting");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: "spring", duration: 0.3 }}
          className="relative bg-black/90 backdrop-blur-xl rounded-xl shadow-2xl w-full max-w-md border border-white/10 overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-white/10">
            <h2 className="text-xl font-semibold font-display text-white">
              Edit <span className="gradient-text">Meeting</span>
            </h2>
            <button
              onClick={onClose}
              className="text-white/40 hover:text-white/60 transition-colors p-1 hover:bg-white/5 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            <div className="space-y-2">
              <label htmlFor="title" className="block text-sm font-medium text-white/90">
                Meeting Title
              </label>
              <Input
                id="title"
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Meeting title"
                className="bg-white/[0.03] border-white/20 text-white placeholder:text-white/40 focus:border-purple-400/60"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="description" className="block text-sm font-medium text-white/90">
                Description <span className="text-white/40">(optional)</span>
              </label>
              <textarea
                id="description"
                className="w-full px-3 py-2 rounded-lg bg-white/[0.03] backdrop-blur-sm border border-white/20 text-white placeholder:text-white/40 focus:outline-none focus:border-purple-400/60 focus:bg-white/[0.05] hover:border-white/30 hover:bg-white/[0.04] transition-all duration-200 min-h-[100px] resize-none"
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description..."
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <Button type="submit" variant="glow" disabled={isSubmitting} className="flex-1 shadow-lg">
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="glass"
                onClick={onClose}
                disabled={isSubmitting}
                className="hover:border-red-400/50 hover:text-red-300"
              >
                Cancel
              </Button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
