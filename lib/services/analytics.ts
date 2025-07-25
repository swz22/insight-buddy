import { Database } from "@/types/supabase";
import { startOfWeek, startOfMonth, format, subDays } from "date-fns";

type Meeting = Database["public"]["Tables"]["meetings"]["Row"];

export interface MeetingAnalytics {
  totalMeetings: number;
  totalDuration: number;
  averageDuration: number;
  meetingsThisWeek: number;
  meetingsThisMonth: number;
  growthRate: number;
  mostFrequentParticipants: ParticipantStats[];
  meetingFrequency: DailyFrequency[];
  topicCloud: TopicFrequency[];
  actionItemStats: ActionItemStats;
  peakMeetingTimes: HourlyDistribution[];
  averageMeetingLength: DurationBucket[];
}

export interface ParticipantStats {
  name: string;
  count: number;
  totalDuration: number;
  lastMeeting: string;
}

export interface DailyFrequency {
  date: string;
  count: number;
  duration: number;
}

export interface TopicFrequency {
  topic: string;
  count: number;
  weight: number;
}

export interface ActionItemStats {
  total: number;
  completed: number;
  pending: number;
  overdue: number;
  completionRate: number;
  byPriority: {
    high: { total: number; completed: number };
    medium: { total: number; completed: number };
    low: { total: number; completed: number };
  };
}

export interface HourlyDistribution {
  hour: number;
  count: number;
  percentage: number;
}

export interface DurationBucket {
  range: string;
  count: number;
  percentage: number;
}

export class AnalyticsService {
  static calculateAnalytics(meetings: Meeting[]): MeetingAnalytics {
    const now = new Date();
    const weekStart = startOfWeek(now);
    const monthStart = startOfMonth(now);
    const lastMonthStart = startOfMonth(subDays(monthStart, 1));

    // Basic stats
    const totalMeetings = meetings.length;
    const totalDuration = meetings.reduce((sum, m) => sum + (m.duration || 0), 0);
    const averageDuration = totalMeetings > 0 ? Math.round(totalDuration / totalMeetings) : 0;

    // Time-based stats
    const meetingsThisWeek = meetings.filter((m) => m.recorded_at && new Date(m.recorded_at) >= weekStart).length;

    const meetingsThisMonth = meetings.filter((m) => m.recorded_at && new Date(m.recorded_at) >= monthStart).length;

    const meetingsLastMonth = meetings.filter(
      (m) => m.recorded_at && new Date(m.recorded_at) >= lastMonthStart && new Date(m.recorded_at) < monthStart
    ).length;

    const growthRate =
      meetingsLastMonth > 0
        ? Math.round(((meetingsThisMonth - meetingsLastMonth) / meetingsLastMonth) * 100)
        : meetingsThisMonth > 0
        ? 100
        : 0;

    const analytics: MeetingAnalytics = {
      totalMeetings,
      totalDuration,
      averageDuration,
      meetingsThisWeek,
      meetingsThisMonth,
      growthRate,
      mostFrequentParticipants: this.calculateParticipantStats(meetings),
      meetingFrequency: this.calculateDailyFrequency(meetings),
      topicCloud: this.extractTopics(meetings),
      actionItemStats: this.calculateActionItemStats(meetings),
      peakMeetingTimes: this.calculateHourlyDistribution(meetings),
      averageMeetingLength: this.calculateDurationBuckets(meetings),
    };

    return analytics;
  }

  private static calculateParticipantStats(meetings: Meeting[]): ParticipantStats[] {
    const participantMap = new Map<string, ParticipantStats>();

    meetings.forEach((meeting) => {
      meeting.participants?.forEach((participant) => {
        const existing = participantMap.get(participant) || {
          name: participant,
          count: 0,
          totalDuration: 0,
          lastMeeting: "",
        };

        existing.count += 1;
        existing.totalDuration += meeting.duration || 0;
        if (
          meeting.recorded_at &&
          (!existing.lastMeeting || new Date(meeting.recorded_at) > new Date(existing.lastMeeting))
        ) {
          existing.lastMeeting = meeting.recorded_at;
        }

        participantMap.set(participant, existing);
      });
    });

    return Array.from(participantMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }

  private static calculateDailyFrequency(meetings: Meeting[]): DailyFrequency[] {
    const last30Days = new Map<string, DailyFrequency>();
    const today = new Date();

    for (let i = 0; i < 30; i++) {
      const date = format(subDays(today, i), "yyyy-MM-dd");
      last30Days.set(date, { date, count: 0, duration: 0 });
    }

    meetings.forEach((meeting) => {
      if (meeting.recorded_at) {
        const date = format(new Date(meeting.recorded_at), "yyyy-MM-dd");
        const existing = last30Days.get(date);
        if (existing) {
          existing.count += 1;
          existing.duration += meeting.duration || 0;
        }
      }
    });

    return Array.from(last30Days.values())
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-30);
  }

  private static extractTopics(meetings: Meeting[]): TopicFrequency[] {
    const topicMap = new Map<string, number>();
    const commonWords = new Set([
      "the",
      "a",
      "an",
      "and",
      "or",
      "but",
      "in",
      "on",
      "at",
      "to",
      "for",
      "of",
      "with",
      "by",
      "from",
      "up",
      "about",
      "into",
      "through",
      "after",
      "is",
      "are",
      "was",
      "were",
      "been",
      "be",
      "have",
      "has",
      "had",
      "do",
      "does",
      "did",
      "will",
      "would",
      "should",
      "could",
      "may",
      "might",
      "meeting",
      "call",
      "discussion",
      "talk",
      "chat",
    ]);

    meetings.forEach((meeting) => {
      // Extract from title
      const words = meeting.title
        .toLowerCase()
        .replace(/[^a-z\s]/g, " ")
        .split(/\s+/)
        .filter((word) => word.length > 3 && !commonWords.has(word));

      words.forEach((word) => {
        topicMap.set(word, (topicMap.get(word) || 0) + 2);
      });

      // Extract from description
      if (meeting.description) {
        const descWords = meeting.description
          .toLowerCase()
          .replace(/[^a-z\s]/g, " ")
          .split(/\s+/)
          .filter((word) => word.length > 3 && !commonWords.has(word));

        descWords.forEach((word) => {
          topicMap.set(word, (topicMap.get(word) || 0) + 1);
        });
      }
    });

    const maxCount = Math.max(...topicMap.values());

    return Array.from(topicMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([topic, count]) => ({
        topic,
        count,
        weight: count / maxCount,
      }));
  }

  private static calculateActionItemStats(meetings: Meeting[]): ActionItemStats {
    const stats: ActionItemStats = {
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
    };

    const now = new Date();

    meetings.forEach((meeting) => {
      meeting.action_items?.forEach((item) => {
        stats.total += 1;

        if (item.completed) {
          stats.completed += 1;
        } else {
          stats.pending += 1;
          if (item.due_date && new Date(item.due_date) < now) {
            stats.overdue += 1;
          }
        }

        const priority = item.priority || "low";
        stats.byPriority[priority].total += 1;
        if (item.completed) {
          stats.byPriority[priority].completed += 1;
        }
      });
    });

    stats.completionRate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

    return stats;
  }

  private static calculateHourlyDistribution(meetings: Meeting[]): HourlyDistribution[] {
    const hourCounts = new Array(24).fill(0);
    let totalWithTime = 0;

    meetings.forEach((meeting) => {
      if (meeting.recorded_at) {
        const hour = new Date(meeting.recorded_at).getHours();
        hourCounts[hour] += 1;
        totalWithTime += 1;
      }
    });

    return hourCounts.map((count, hour) => ({
      hour,
      count,
      percentage: totalWithTime > 0 ? Math.round((count / totalWithTime) * 100) : 0,
    }));
  }

  private static calculateDurationBuckets(meetings: Meeting[]): DurationBucket[] {
    const buckets = {
      "0-15 min": 0,
      "15-30 min": 0,
      "30-45 min": 0,
      "45-60 min": 0,
      "60+ min": 0,
    };

    let totalWithDuration = 0;

    meetings.forEach((meeting) => {
      if (meeting.duration) {
        totalWithDuration += 1;
        const minutes = meeting.duration / 60;

        if (minutes <= 15) buckets["0-15 min"] += 1;
        else if (minutes <= 30) buckets["15-30 min"] += 1;
        else if (minutes <= 45) buckets["30-45 min"] += 1;
        else if (minutes <= 60) buckets["45-60 min"] += 1;
        else buckets["60+ min"] += 1;
      }
    });

    return Object.entries(buckets).map(([range, count]) => ({
      range,
      count,
      percentage: totalWithDuration > 0 ? Math.round((count / totalWithDuration) * 100) : 0,
    }));
  }
}
