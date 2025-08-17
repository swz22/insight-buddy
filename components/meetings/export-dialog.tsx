"use client";

import { useState } from "react";
import { X, Download, Mail, FileText, FileCode, File, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Database } from "@/types/supabase";
import { ExportFormat, DeliveryMethod, ExportSections } from "@/types/export";

type Meeting = Database["public"]["Tables"]["meetings"]["Row"];

interface ExportDialogProps {
  meeting: Meeting;
  userEmail: string;
  insights?: any;
  isOpen: boolean;
  onClose: () => void;
}

const formats: { value: ExportFormat; label: string; icon: typeof FileText; description: string }[] = [
  { value: "pdf", label: "PDF", icon: FileText, description: "Professional formatted document" },
  { value: "docx", label: "Word", icon: FileCode, description: "Editable document" },
  { value: "txt", label: "Text", icon: File, description: "Plain text file" },
];

export function ExportDialog({ meeting, userEmail, insights, isOpen, onClose }: ExportDialogProps) {
  const toast = useToast();
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>("pdf");
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>("download");
  const [recipientEmail, setRecipientEmail] = useState(userEmail);
  const [customMessage, setCustomMessage] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const [sections, setSections] = useState<ExportSections>({
    metadata: true,
    transcript: true,
    summary: true,
    actionItems: true,
    insights: !!insights,
  });

  const handleExport = async () => {
    setIsExporting(true);

    try {
      if (deliveryMethod === "download") {
        const response = await fetch(`/api/meetings/${meeting.id}/export`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            format: selectedFormat,
            sections,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Export failed");
        }

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${meeting.title.replace(/[^a-zA-Z0-9]/g, "_")}_${
          new Date().toISOString().split("T")[0]
        }.${selectedFormat}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        toast.success("Meeting exported successfully!");
        onClose();
      } else {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(recipientEmail)) {
          throw new Error("Please enter a valid email address");
        }

        const response = await fetch(`/api/meetings/${meeting.id}/export`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            format: selectedFormat,
            sections,
            delivery: "email",
            recipientEmail,
            customMessage,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Failed to send email");
        }

        toast.success("Export sent to " + recipientEmail);
        onClose();
      }
    } catch (error) {
      console.error("Export error:", error);
      toast.error(error instanceof Error ? error.message : "Export failed");
    } finally {
      setIsExporting(false);
    }
  };

  const handleSectionToggle = (section: keyof ExportSections) => {
    setSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
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
          className="relative bg-black/90 backdrop-blur-xl rounded-xl shadow-2xl w-full max-w-2xl border border-white/10 overflow-hidden flex flex-col mt-20"
        >
          <div className="flex items-center justify-between p-4 border-b border-white/10">
            <div>
              <h2 className="text-lg font-semibold font-display text-white flex items-center gap-2">
                <Download className="w-5 h-5" />
                Export <span className="gradient-text">Meeting</span>
              </h2>
              <p className="text-xs text-white/60 mt-0.5">{meeting.title}</p>
            </div>
            <button
              onClick={onClose}
              className="text-white/40 hover:text-white/60 transition-colors p-1 hover:bg-white/5 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-white/90 mb-2">Select Format</h3>
                <div className="grid grid-cols-3 gap-2">
                  {formats.map((format) => {
                    const Icon = format.icon;
                    return (
                      <button
                        key={format.value}
                        onClick={() => setSelectedFormat(format.value)}
                        className={cn(
                          "p-3 rounded-lg border transition-all duration-200 text-center group",
                          selectedFormat === format.value
                            ? "bg-white/[0.08] border-purple-400/60 shadow-lg"
                            : "bg-white/[0.03] border-white/20 hover:border-white/30 hover:bg-white/[0.05]"
                        )}
                      >
                        <Icon
                          className={cn(
                            "w-6 h-6 mx-auto mb-1 transition-colors",
                            selectedFormat === format.value
                              ? "text-purple-400"
                              : "text-white/50 group-hover:text-white/70"
                          )}
                        />
                        <p
                          className={cn(
                            "font-medium text-sm",
                            selectedFormat === format.value ? "text-white" : "text-white/70"
                          )}
                        >
                          {format.label}
                        </p>
                        <p className="text-xs text-white/50 mt-1">{format.description}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-white/90 mb-2">Include Sections</h3>
                <div className="space-y-2">
                  {Object.entries({
                    metadata: "Meeting Details",
                    summary: "Summary",
                    actionItems: "Action Items",
                    transcript: "Full Transcript",
                    insights: "Analytics & Insights",
                  }).map(([key, label]) => {
                    const isDisabled = key === "insights" && !insights;
                    return (
                      <label
                        key={key}
                        className={cn(
                          "flex items-center gap-3 p-2.5 rounded-lg bg-white/[0.03] border border-white/20 cursor-pointer hover:border-white/30 hover:bg-white/[0.05] transition-all",
                          isDisabled && "opacity-50 cursor-not-allowed"
                        )}
                      >
                        <Checkbox
                          checked={sections[key as keyof ExportSections]}
                          onCheckedChange={() => !isDisabled && handleSectionToggle(key as keyof ExportSections)}
                          disabled={isDisabled}
                        />
                        <span className="text-sm text-white/80">
                          {label}
                          {isDisabled && <span className="text-white/40 ml-2">(Not available)</span>}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-white/90 mb-2">Delivery Method</h3>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setDeliveryMethod("download")}
                    className={cn(
                      "p-3 rounded-lg border transition-all duration-200 group",
                      deliveryMethod === "download"
                        ? "bg-white/[0.08] border-purple-400/60 shadow-lg"
                        : "bg-white/[0.03] border-white/20 hover:border-white/30 hover:bg-white/[0.05]"
                    )}
                  >
                    <Download
                      className={cn(
                        "w-5 h-5 mx-auto mb-1 transition-colors",
                        deliveryMethod === "download" ? "text-purple-400" : "text-white/50 group-hover:text-white/70"
                      )}
                    />
                    <p
                      className={cn(
                        "font-medium text-sm",
                        deliveryMethod === "download" ? "text-white" : "text-white/70"
                      )}
                    >
                      Download
                    </p>
                  </button>
                  <button
                    onClick={() => setDeliveryMethod("email")}
                    className={cn(
                      "p-4 rounded-lg border transition-all duration-200 group",
                      deliveryMethod === "email"
                        ? "bg-white/[0.08] border-purple-400/60 shadow-lg"
                        : "bg-white/[0.03] border-white/20 hover:border-white/30 hover:bg-white/[0.05]"
                    )}
                  >
                    <Mail
                      className={cn(
                        "w-5 h-5 mx-auto mb-1 transition-colors",
                        deliveryMethod === "email" ? "text-purple-400" : "text-white/50 group-hover:text-white/70"
                      )}
                    />
                    <p
                      className={cn("font-medium text-sm", deliveryMethod === "email" ? "text-white" : "text-white/70")}
                    >
                      Email
                    </p>
                  </button>
                </div>

                {deliveryMethod === "email" && (
                  <div className="mt-3 space-y-2">
                    <div>
                      <label className="block text-sm text-white/70 mb-2">Email Address</label>
                      <Input
                        type="email"
                        value={recipientEmail}
                        onChange={(e) => setRecipientEmail(e.target.value)}
                        placeholder="recipient@example.com"
                        className="bg-white/[0.03] border-white/20"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-white/70 mb-2">Message (optional)</label>
                      <textarea
                        value={customMessage}
                        onChange={(e) => setCustomMessage(e.target.value)}
                        placeholder="Add a personal message..."
                        rows={2}
                        className="w-full px-3 py-2 rounded-lg bg-white/[0.03] backdrop-blur-sm border border-white/20 text-white placeholder:text-white/40 focus:outline-none focus:border-purple-400/60 focus:bg-white/[0.05] hover:border-white/30 hover:bg-white/[0.04] transition-all duration-200 resize-none"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-2 p-4 border-t border-white/10">
            <Button
              onClick={handleExport}
              variant="glow"
              disabled={isExporting || !Object.values(sections).some(Boolean)}
              className="flex-1 shadow-lg"
            >
              {isExporting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  {deliveryMethod === "download" ? (
                    <Download className="w-4 h-4 mr-2" />
                  ) : (
                    <Mail className="w-4 h-4 mr-2" />
                  )}
                  {deliveryMethod === "download" ? "Export" : "Send Email"}
                </>
              )}
            </Button>
            <Button
              onClick={onClose}
              variant="glass"
              disabled={isExporting}
              className="hover:border-red-400/50 hover:text-red-300"
            >
              Cancel
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
