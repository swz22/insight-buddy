import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { MeetingInsights } from "@/types/meeting-insights";

interface UseInsightsOptions {
  meetingId: string;
  enabled?: boolean;
}

export function useInsights({ meetingId, enabled = true }: UseInsightsOptions) {
  const queryClient = useQueryClient();
  const { success: toastSuccess, error: toastError } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);

  const {
    data: insights,
    isLoading,
    error,
    refetch,
  } = useQuery<MeetingInsights | null>({
    queryKey: ["insights", meetingId],
    queryFn: async () => {
      const response = await fetch(`/api/meetings/${meetingId}/insights`);
      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error("Failed to fetch insights");
      }
      const data = await response.json();
      return data || null;
    },
    enabled: enabled && !!meetingId,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const generateInsightsMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/meetings/${meetingId}/insights`, {
        method: "POST",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to generate insights");
      }

      return response.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData<MeetingInsights>(["insights", meetingId], data);
      toastSuccess("Insights generated successfully!");
    },
    onError: (error) => {
      toastError(error.message || "Failed to generate insights");
    },
  });

  const generateInsights = async () => {
    if (isGenerating) return;

    setIsGenerating(true);
    try {
      await generateInsightsMutation.mutateAsync();
    } finally {
      setIsGenerating(false);
    }
  };

  return {
    insights,
    isLoading,
    error,
    isGenerating,
    generateInsights,
    hasInsights: !!insights,
    refetch,
  };
}
