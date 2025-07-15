"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useCreateMeeting } from "@/hooks/use-meetings";

interface FormData {
  title: string;
  description: string;
}

export default function UploadPage() {
  const router = useRouter();
  const createMeeting = useCreateMeeting();
  const [formData, setFormData] =
    useState <
    FormData >
    {
      title: "",
      description: "",
    };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    try {
      await createMeeting.mutateAsync({
        title: formData.title,
        description: formData.description,
        recordedAt: new Date().toISOString(),
      });

      router.push("/dashboard");
    } catch (error) {
      console.error("Failed to create meeting:", error);
      alert("Failed to create meeting. Please try again.");
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <Card>
        <CardHeader>
          <CardTitle>Create New Meeting</CardTitle>
          <CardDescription>Add meeting details (audio upload coming in Phase 2)</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
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

            <div className="flex gap-4">
              <Button type="submit" disabled={createMeeting.isPending}>
                {createMeeting.isPending ? "Creating..." : "Create Meeting"}
              </Button>
              <Button type="button" variant="outline" onClick={() => router.push("/dashboard")}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
