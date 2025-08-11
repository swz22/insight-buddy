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
        console.log("Could not fetch config");
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
          const transcriptResponse = await fetch("/api/transcribe", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ meetingId: meeting.id }),
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
          <p className="text-white/60">Transform your recording into actionable insights with AI</p>
        </div>

        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-cyan-500/5" />

          <form onSubmit={handleSubmit} className="relative p-8 space-y-6">
            <div className="space-y-6">
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-white/90 mb-2">
                  Meeting Title <span className="text-red-400">*</span>
                </label>
                <Input
                  id="title"
                  name="title"
                  type="text"
                  required
                  placeholder="e.g., Weekly Team Standup, Client Meeting, Project Review..."
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  disabled={isUploading}
                  className={cn(
                    "w-full h-12 text-base",
                    "bg-white/5 border-white/10",
                    "placeholder:text-white/40",
                    "focus:bg-white/10 focus:border-white/20",
                    "transition-all duration-200"
                  )}
                />
                <p className="mt-1.5 text-xs text-white/50">
                  Give your meeting a descriptive title to find it easily later
                </p>
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-white/90 mb-2">
                  Description <span className="text-white/40 font-normal">(optional)</span>
                </label>
                <textarea
                  id="description"
                  name="description"
                  rows={3}
                  placeholder="Add any additional context, key topics discussed, or participants..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  disabled={isUploading}
                  className={cn(
                    "w-full px-4 py-3 text-base rounded-xl",
                    "bg-white/5 border border-white/10",
                    "placeholder:text-white/40 text-white",
                    "focus:bg-white/10 focus:border-white/20 focus:outline-none",
                    "transition-all duration-200 resize-none"
                  )}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white/90 mb-2">
                  Recording File <span className="text-red-400">*</span>
                </label>
                <FileUpload onFileSelect={setSelectedFile} disabled={isUploading} />
                <p className="mt-2 text-xs text-white/50">
                  Supported formats: MP3, WAV, M4A, MP4, WebM • Max size: 500MB
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4">
              <div className="flex items-center gap-2 text-sm text-white/60">
                {transcriptionEnabled && (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>AI transcription enabled</span>
                  </>
                )}
              </div>

              <div className="flex gap-3">
                {isUploading && (
                  <Button type="button" variant="outline" onClick={handleCancel} className="min-w-[100px]">
                    Cancel
                  </Button>
                )}
                <Button
                  type="submit"
                  disabled={isUploading || !selectedFile || !formData.title.trim()}
                  className={cn(
                    "min-w-[140px] relative overflow-hidden",
                    "bg-gradient-to-r from-purple-600 to-cyan-600",
                    "hover:from-purple-700 hover:to-cyan-700",
                    "disabled:from-gray-600 disabled:to-gray-700",
                    "transition-all duration-300"
                  )}
                >
                  {isUploading ? (
                    <>
                      <div className="absolute inset-0 bg-white/10 animate-pulse" />
                      <span className="relative">Uploading...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Upload Meeting
                    </>
                  )}
                </Button>
              </div>
            </div>
          </form>
        </Card>

        {!transcriptionEnabled && (
          <Card className="p-6 bg-yellow-500/5 border-yellow-500/20">
            <div className="flex gap-3">
              <Sparkles className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-yellow-200">AI features not configured</p>
                <p className="text-sm text-yellow-200/70">
                  Transcription and summarization features are currently disabled. Configure your AI API keys in the
                  environment settings to enable these features.
                </p>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
