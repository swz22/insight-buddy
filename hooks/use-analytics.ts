import { useQuery } from "@tanstack/react-query";
import { useMeetings } from "./use-meetings";
import { AnalyticsService, MeetingAnalytics } from "@/lib/services/analytics";

export function useAnalytics() {
  const { data: meetings } = useMeetings();

  return useQuery<MeetingAnalytics>({
    queryKey: ["analytics", meetings?.length],
    queryFn: () => {
      if (!meetings || meetings.length === 0) {
        return {
          totalMeetings: 0,
          totalDuration: 0,
          averageDuration: 0,
          meetingsThisWeek: 0,
          meetingsThisMonth: 0,
          growthRate: 0,
          mostFrequentParticipants: [],
          meetingFrequency: [],
          topicCloud: [],
          actionItemStats: {
            total: 0,
            completed: 0,
            pending: 0,
            overdue: 0,
            completionRate: 0,
            byPriority: {
              high: { total: 0, completed: 0 },
              medium: { total: 0, completed: 0 },
              low: { total: 0, completed: 0 },
            },
          },
          peakMeetingTimes: [],
          averageMeetingLength: [],
        };
      }

      return AnalyticsService.calculateAnalytics(meetings);
    },
    enabled: !!meetings,
    staleTime: 30 * 1000,
  });
}
