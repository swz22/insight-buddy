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
    <div className="max-w-2xl mx-auto py-8 px-4">
      <Card>
        <CardHeader>
          <CardTitle>Upload Meeting Recording</CardTitle>
          <CardDescription>Upload an audio or video file from your meeting</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="title" className="block text-sm font-medium mb-2">
                Meeting Title
              </label>
              <Input
                id="title"
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Weekly Team Standup"
              />
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium mb-2">
                Description (optional)
              </label>
              <textarea
                id="description"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of the meeting..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Recording File</label>
              <FileUpload onFileSelect={setSelectedFile} disabled={isUploading} />
            </div>

            <div className="flex gap-4">
              <Button type="submit" disabled={createMeeting.isPending || isUploading || !selectedFile}>
                {isUploading ? "Uploading..." : "Upload Meeting"}
              </Button>
              <Button type="button" variant="outline" onClick={handleCancel} disabled={createMeeting.isPending}>
                {isUploading ? "Cancel Upload" : "Cancel"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
