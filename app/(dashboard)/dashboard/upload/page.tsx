"use client";

import { useState, FormEvent, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileUpload } from "@/components/upload/file-upload";
import { useCreateMeeting } from "@/hooks/use-meetings";
import { useToast } from "@/hooks/use-toast";
import { useAppStore } from "@/stores/app-store";
import { uploadFile } from "@/lib/services/upload";
import { meetingFormSchema, type MeetingFormData } from "@/lib/validations/meeting";
import { z } from "zod";
import { TemplateSelector } from "@/components/templates/template-selector";
import { ManageTemplatesDialog } from "@/components/templates/manage-templates-dialog";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

interface FormData {
  title: string;
  description: string;
}

export default function UploadPage() {
  const router = useRouter();
  const toast = useToast();
  const createMeeting = useCreateMeeting();
  const setUploadProgress = useAppStore((state) => state.setUploadProgress);
  const abortControllerRef = useRef<AbortController | null>(null);

  const [formData, setFormData] = useState<FormData>({
    title: "",
    description: "",
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showTemplateManager, setShowTemplateManager] = useState(false);

  const handleTemplateSelect = (title: string, description: string) => {
    setFormData({ title, description });
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!selectedFile) {
      toast.error("Please select an audio or video file");
      return;
    }

    // Validate form data
    try {
      meetingFormSchema.parse(formData);
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.issues[0]?.message || "Validation error");
        return;
      }
    }

    setIsUploading(true);
    abortControllerRef.current = new AbortController();

    try {
      // Upload file with real progress tracking
      const uploadResult = await uploadFile(
        selectedFile,
        (progress) => {
          console.log("Setting upload progress:", progress.percentage);
          setUploadProgress(progress.percentage);
        },
        abortControllerRef.current.signal
      );

      // Create meeting record
      await createMeeting.mutateAsync({
        title: formData.title,
        description: formData.description || null,
        audio_url: uploadResult.url,
        participants: [],
        recorded_at: new Date().toISOString(),
      });

      toast.success("Meeting uploaded successfully!");

      // Reset progress after a delay
      setTimeout(() => setUploadProgress(0), 1000);

      router.push("/dashboard");
    } catch (error) {
      console.error("Failed to create meeting:", error);

      if (error instanceof Error) {
        if (error.message === "Upload cancelled") {
          toast.info("Upload cancelled");
        } else {
          toast.error(error.message || "Failed to create meeting");
        }
      } else {
        toast.error("Failed to create meeting. Please try again.");
      }

      setUploadProgress(0);
    } finally {
      setIsUploading(false);
      abortControllerRef.current = null;
    }
  };

  const handleCancel = () => {
    if (abortControllerRef.current && isUploading) {
      abortControllerRef.current.abort();
    } else {
      router.push("/dashboard");
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-6 animate-fade-in">
        <Link
          href="/dashboard"
          className="inline-flex items-center text-white/60 hover:text-white/90 transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
          Back to dashboard
        </Link>

        <Card className="shadow-2xl">
          <CardHeader className="space-y-1 pb-8">
            <CardTitle className="text-3xl font-display">
              Upload <span className="gradient-text">Meeting Recording</span>
            </CardTitle>
            <CardDescription className="text-white/60 text-base">
              Upload an audio or video file from your meeting
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <TemplateSelector
                onSelect={handleTemplateSelect}
                onManageTemplates={() => setShowTemplateManager(true)}
              />

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
                  placeholder="e.g., Weekly Team Standup"
                  className="bg-white/[0.03] border-white/20 text-white placeholder:text-white/40 focus:border-purple-400/60 hover:bg-white/[0.05]"
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
                  placeholder="Brief description of the meeting..."
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-white/90">Recording File</label>
                <FileUpload onFileSelect={setSelectedFile} disabled={isUploading} />
              </div>

              <div className="flex gap-4 pt-4">
                <Button
                  type="submit"
                  variant="glow"
                  disabled={createMeeting.isPending || isUploading || !selectedFile}
                  className="min-w-[140px] shadow-lg"
                >
                  {isUploading ? "Uploading..." : "Upload Meeting"}
                </Button>
                <Button
                  type="button"
                  variant="glass"
                  onClick={handleCancel}
                  disabled={createMeeting.isPending}
                  className="hover:border-red-400/50 hover:text-red-300"
                >
                  {isUploading ? "Cancel Upload" : "Cancel"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <ManageTemplatesDialog isOpen={showTemplateManager} onClose={() => setShowTemplateManager(false)} />
      </div>
    </div>
  );
}
