import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MeetingInsights } from "@/types/meeting-insights";
import { useToast } from "@/hooks/use-toast";

interface UseInsightsOptions {
  meetingId: string;
  enabled?: boolean;
}

export function useInsights({ meetingId, enabled = true }: UseInsightsOptions) {
  const queryClient = useQueryClient();
  const { success: toastSuccess, error: toastError } = useToast();

  const {
    data: insights,
    isLoading,
    error,
  } = useQuery<MeetingInsights | null>({
    queryKey: ["insights", meetingId],
    queryFn: async () => {
      const response = await fetch(`/api/meetings/${meetingId}/insights`);
      if (!response.ok) {
        throw new Error("Failed to fetch insights");
      }
      return response.json();
    },
    enabled,
  });

  const generateInsights = useMutation({
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
      queryClient.setQueryData(["insights", meetingId], data);
      toastSuccess("Meeting insights generated successfully!");
    },
    onError: (error) => {
      toastError(error.message || "Failed to generate insights");
    },
  });

  return {
    insights,
    isLoading,
    error,
    isGenerating: generateInsights.isPending,
    generateInsights: generateInsights.mutate,
    hasInsights: !!insights,
  };
}
