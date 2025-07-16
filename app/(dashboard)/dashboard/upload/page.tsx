"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileUpload } from "@/components/upload/file-upload";
import { useCreateMeeting } from "@/hooks/use-meetings";
import { useToast } from "@/hooks/use-toast";
import { useAppStore } from "@/stores/app-store";

interface FormData {
  title: string;
  description: string;
}

export default function UploadPage() {
  const router = useRouter();
  const toast = useToast();
  const createMeeting = useCreateMeeting();
  const setUploadProgress = useAppStore((state) => state.setUploadProgress);

  const [formData, setFormData] = useState<FormData>({
    title: "",
    description: "",
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const uploadFile = async (file: File): Promise<string | null> => {
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Upload failed");
      }

      const data = await response.json();
      return data.url;
    } catch (error) {
      console.error("Upload error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to upload file");
      return null;
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!selectedFile) {
      toast.error("Please select an audio or video file");
      return;
    }

    setIsUploading(true);

    try {
      // Simulate progress for demo (in production, use chunked uploads)
      setUploadProgress(10);

      // Upload file
      setUploadProgress(30);
      const audioUrl = await uploadFile(selectedFile);

      if (!audioUrl) {
        throw new Error("Failed to upload file");
      }

      setUploadProgress(70);

      // Create meeting record
      await createMeeting.mutateAsync({
        title: formData.title,
        description: formData.description || null,
        audio_url: audioUrl,
        participants: [],
        recorded_at: new Date().toISOString(),
      });

      setUploadProgress(100);
      toast.success("Meeting uploaded successfully!");

      // Reset progress after a delay
      setTimeout(() => setUploadProgress(0), 1000);

      router.push("/dashboard");
    } catch (error) {
      console.error("Failed to create meeting:", error);
      toast.error("Failed to create meeting. Please try again.");
      setUploadProgress(0);
    } finally {
      setIsUploading(false);
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
              <Button type="button" variant="outline" onClick={() => router.push("/dashboard")} disabled={isUploading}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
