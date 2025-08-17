"use client";

import { useState, FormEvent, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { FileUpload } from "@/components/upload/file-upload";
import { useCreateMeeting } from "@/hooks/use-meetings";
import { useToast } from "@/hooks/use-toast";
import { useAppStore } from "@/stores/app-store";
import { uploadFile } from "@/lib/services/upload";
import { ArrowLeft, Sparkles, Upload } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

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
  const [transcriptionEnabled, setTranscriptionEnabled] = useState(false);

  useEffect(() => {
    fetch("/api/config")
      .then((res) => res.json())
      .then((config) => {
        setTranscriptionEnabled(config.transcriptionEnabled);
      })
      .catch(() => {
        // Silently fail if config endpoint is not available
        setTranscriptionEnabled(false);
      });
  }, []);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!selectedFile) {
      toast.error("Please select a file to upload");
      return;
    }

    if (!formData.title.trim()) {
      toast.error("Please enter a meeting title");
      return;
    }

    setIsUploading(true);
    abortControllerRef.current = new AbortController();

    try {
      const uploadResult = await uploadFile(
        selectedFile,
        (progress) => {
          setUploadProgress(progress.percentage);
        },
        abortControllerRef.current.signal
      );

      const meetingData = {
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        audio_url: uploadResult.url,
        recorded_at: new Date().toISOString(),
        participants: [],
      };

      const meeting = await createMeeting.mutateAsync(meetingData);

      const shouldTranscribe = transcriptionEnabled && meeting.audio_url;
      if (shouldTranscribe) {
        try {
          const transcriptResponse = await fetch(`/api/meetings/${meeting.id}/transcribe`, {
            method: "POST",
          });

          if (!transcriptResponse.ok) {
            console.error("Failed to start transcription");
          }
        } catch (error) {
          console.error("Error starting transcription:", error);
        }
      }

      setUploadProgress(0);
      toast.success("Meeting uploaded successfully!");
      router.push(`/dashboard/meetings/${meeting.id}`);
    } catch (error: any) {
      console.error("Upload error:", error);
      setUploadProgress(0);

      if (error.name === "AbortError") {
        toast.info("Upload cancelled");
      } else {
        toast.error(error.message || "Failed to upload meeting");
      }
    } finally {
      setIsUploading(false);
      abortControllerRef.current = null;
    }
  };

  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setUploadProgress(0);
    }
  };

  return (
    <div className="container max-w-4xl mx-auto py-6 sm:px-6 lg:px-8 animate-fade-in">
      <Link
        href="/dashboard"
        className="inline-flex items-center text-white/60 hover:text-white/90 transition-colors group mb-6"
      >
        <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
        Back to dashboard
      </Link>

      <div className="space-y-8">
        <div>
          <h1 className="text-4xl font-bold font-display text-white mb-2">
            Upload <span className="gradient-text">Meeting</span>
          </h1>
          <p className="text-white/60">Transform your recordings into actionable insights</p>
        </div>

        <Card className="relative overflow-hidden bg-white/[0.02] backdrop-blur-sm border-white/10 shadow-2xl">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-cyan-500/5" />
          <form onSubmit={handleSubmit} className="relative p-8 space-y-6">
            <div className="space-y-2">
              <label htmlFor="title" className="block text-sm font-medium text-white/90">
                Meeting Title
              </label>
              <Input
                id="title"
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Weekly Team Standup"
                required
                disabled={isUploading}
                className="bg-white/[0.03] border-white/20 focus:border-purple-400/60 text-white placeholder:text-white/30"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="description" className="block text-sm font-medium text-white/90">
                Description
                <span className="text-white/40 text-xs ml-2">(optional)</span>
              </label>
              <Input
                id="description"
                type="text"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of the meeting"
                disabled={isUploading}
                className="bg-white/[0.03] border-white/20 focus:border-purple-400/60 text-white placeholder:text-white/30"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-white/90">Audio/Video File</label>
              <FileUpload onFileSelect={setSelectedFile} accept="audio/*,video/*" disabled={isUploading} />
            </div>

            <div className="flex gap-3">
              <Button
                type="submit"
                variant="glow"
                size="lg"
                disabled={!selectedFile || !formData.title || isUploading}
                className="flex-1 shadow-lg"
              >
                {isUploading ? (
                  <>
                    <Upload className="w-4 h-4 mr-2 animate-pulse" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Upload Meeting
                  </>
                )}
              </Button>

              {isUploading && (
                <Button type="button" variant="outline" onClick={handleCancel}>
                  Cancel
                </Button>
              )}
            </div>
          </form>
        </Card>

        <div className="text-center text-sm text-white/40">
          {transcriptionEnabled ? (
            <p>✨ AI transcription and analysis will begin automatically after upload</p>
          ) : (
            <p>📝 Configure AI services in settings to enable automatic transcription</p>
          )}
        </div>
      </div>
    </div>
  );
}
