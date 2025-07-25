"use client";

import { ArrowLeft, TrendingUp, TrendingDown, Users, Clock, Calendar, Target } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAnalytics } from "@/hooks/use-analytics";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { FrequencyChart } from "@/components/analytics/frequency-chart";
import { TopicCloud } from "@/components/analytics/topic-cloud";
import { ParticipantsList } from "@/components/analytics/participants-list";
import { ActionItemsChart } from "@/components/analytics/action-items-chart";
import { TimeDistributionChart } from "@/components/analytics/time-distribution-chart";
import { DurationChart } from "@/components/analytics/duration-chart";

export default function AnalyticsPage() {
  const { data: analytics, isLoading } = useAnalytics();

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 sm:px-0 space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <Link
              href="/dashboard"
              className="inline-flex items-center text-white/60 hover:text-white/90 transition-colors group mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
              Back to dashboard
            </Link>
            <h1 className="text-4xl font-bold font-display text-white">
              Meeting <span className="gradient-text">Analytics</span>
            </h1>
            <p className="text-white/60 mt-2">Insights from your meeting history</p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent" />
            <CardHeader className="relative pb-2">
              <CardDescription className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Total Meetings
              </CardDescription>
            </CardHeader>
            <CardContent className="relative">
              {isLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <>
                  <p className="text-3xl font-bold gradient-text">{analytics?.totalMeetings || 0}</p>
                  <p className="text-sm text-white/50 mt-1">{analytics?.meetingsThisMonth || 0} this month</p>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-transparent" />
            <CardHeader className="relative pb-2">
              <CardDescription className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Total Duration
              </CardDescription>
            </CardHeader>
            <CardContent className="relative">
              {isLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <>
                  <p className="text-3xl font-bold text-cyan-400">{formatDuration(analytics?.totalDuration || 0)}</p>
                  <p className="text-sm text-white/50 mt-1">Avg: {formatDuration(analytics?.averageDuration || 0)}</p>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-transparent" />
            <CardHeader className="relative pb-2">
              <CardDescription className="flex items-center gap-2">
                {analytics?.growthRate !== undefined && analytics.growthRate >= 0 ? (
                  <TrendingUp className="w-4 h-4" />
                ) : (
                  <TrendingDown className="w-4 h-4" />
                )}
                Growth Rate
              </CardDescription>
            </CardHeader>
            <CardContent className="relative">
              {isLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <>
                  <p
                    className={cn(
                      "text-3xl font-bold",
                      analytics?.growthRate !== undefined && analytics.growthRate >= 0
                        ? "text-green-400"
                        : "text-red-400"
                    )}
                  >
                    {analytics?.growthRate || 0}%
                  </p>
                  <p className="text-sm text-white/50 mt-1">vs last month</p>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 to-transparent" />
            <CardHeader className="relative pb-2">
              <CardDescription className="flex items-center gap-2">
                <Target className="w-4 h-4" />
                Action Items
              </CardDescription>
            </CardHeader>
            <CardContent className="relative">
              {isLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <>
                  <p className="text-3xl font-bold text-yellow-400">
                    {analytics?.actionItemStats.completionRate || 0}%
                  </p>
                  <p className="text-sm text-white/50 mt-1">
                    {analytics?.actionItemStats.completed || 0} of {analytics?.actionItemStats.total || 0} completed
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="shadow-xl">
            <CardHeader>
              <CardTitle className="text-xl font-display">Meeting Frequency</CardTitle>
              <CardDescription>Daily meeting count over the last 30 days</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-64 w-full" />
              ) : (
                <FrequencyChart data={analytics?.meetingFrequency || []} />
              )}
            </CardContent>
          </Card>

          <Card className="shadow-xl">
            <CardHeader>
              <CardTitle className="text-xl font-display">Action Items</CardTitle>
              <CardDescription>Task completion by priority</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-64 w-full" />
              ) : (
                <ActionItemsChart stats={analytics?.actionItemStats} />
              )}
            </CardContent>
          </Card>
        </div>

        {/* Charts Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="shadow-xl">
            <CardHeader>
              <CardTitle className="text-xl font-display">Top Participants</CardTitle>
              <CardDescription>Most frequent meeting attendees</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-64 w-full" />
              ) : (
                <ParticipantsList participants={analytics?.mostFrequentParticipants || []} />
              )}
            </CardContent>
          </Card>

          <Card className="shadow-xl">
            <CardHeader>
              <CardTitle className="text-xl font-display">Peak Meeting Times</CardTitle>
              <CardDescription>When meetings typically occur</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-64 w-full" />
              ) : (
                <TimeDistributionChart distribution={analytics?.peakMeetingTimes || []} />
              )}
            </CardContent>
          </Card>

          <Card className="shadow-xl">
            <CardHeader>
              <CardTitle className="text-xl font-display">Meeting Duration</CardTitle>
              <CardDescription>Distribution of meeting lengths</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-64 w-full" />
              ) : (
                <DurationChart buckets={analytics?.averageMeetingLength || []} />
              )}
            </CardContent>
          </Card>
        </div>

        {/* Topic Cloud */}
        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle className="text-xl font-display">Topic Cloud</CardTitle>
            <CardDescription>Most discussed topics across all meetings</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-48 w-full" /> : <TopicCloud topics={analytics?.topicCloud || []} />}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
