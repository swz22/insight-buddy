import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { apiError, apiSuccess } from "@/lib/api/response";
import { InsightsService } from "@/lib/services/insights";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

export async function POST(request: Request, { params: paramsPromise }: RouteParams) {
  const params = await paramsPromise;

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return apiError("Unauthorized", 401, "AUTH_REQUIRED");
    }

    const serviceSupabase = createServiceRoleClient();

    const { data: meeting, error: fetchError } = await serviceSupabase
      .from("meetings")
      .select("*")
      .eq("id", params.id)
      .eq("user_id", user.id)
      .single();

    if (fetchError || !meeting) {
      return apiError("Meeting not found", 404, "NOT_FOUND");
    }

    if (!meeting.transcript) {
      return apiError("No transcript available for analysis", 400, "NO_TRANSCRIPT");
    }

    // Check for existing insights
    const { data: existingInsights } = await serviceSupabase
      .from("meeting_insights")
      .select("*")
      .eq("meeting_id", params.id)
      .single();

    if (existingInsights) {
      return apiSuccess(existingInsights);
    }

    const openaiKey = process.env.OPENAI_API_KEY;
    if (!openaiKey) {
      return apiError("AI service not configured", 503, "SERVICE_UNAVAILABLE");
    }

    try {
      const insightsService = new InsightsService(openaiKey);

      // Analyze the meeting
      const insights = await insightsService.analyzeMeeting(params.id, {
        text: meeting.transcript,
        audio_duration: meeting.duration || undefined,
      });

      // Store the insights in the database
      const { data: savedInsights, error: saveError } = await serviceSupabase
        .from("meeting_insights")
        .insert({
          meeting_id: params.id,
          speaker_metrics: insights.speakerMetrics,
          sentiment: insights.sentiment,
          dynamics: insights.dynamics,
          key_moments: insights.keyMoments,
          engagement_score: insights.engagementScore,
          generated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (saveError) {
        console.error("Failed to save insights:", saveError);
        // Return insights even if save fails
        return apiSuccess(insights);
      }

      return apiSuccess(savedInsights);
    } catch (error) {
      console.error("Insights generation failed:", error);
      return apiError(
        "Failed to generate insights",
        500,
        "INSIGHTS_ERROR",
        error instanceof Error ? error.message : undefined
      );
    }
  } catch (error) {
    console.error("Insights generation error:", error);
    return apiError(
      "Failed to generate insights",
      500,
      "INSIGHTS_ERROR",
      error instanceof Error ? error.message : undefined
    );
  }
}

export async function GET(request: Request, { params: paramsPromise }: RouteParams) {
  const params = await paramsPromise;

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return apiError("Unauthorized", 401, "AUTH_REQUIRED");
    }

    const serviceSupabase = createServiceRoleClient();

    // Verify the user owns the meeting
    const { data: meeting, error: meetingError } = await serviceSupabase
      .from("meetings")
      .select("id")
      .eq("id", params.id)
      .eq("user_id", user.id)
      .single();

    if (meetingError || !meeting) {
      return apiError("Meeting not found", 404, "NOT_FOUND");
    }

    // Get insights
    const { data: insights, error: insightsError } = await serviceSupabase
      .from("meeting_insights")
      .select("*")
      .eq("meeting_id", params.id)
      .single();

    if (insightsError || !insights) {
      return apiError("No insights found for this meeting", 404, "NO_INSIGHTS");
    }

    return apiSuccess(insights);
  } catch (error) {
    console.error("Get insights error:", error);
    return apiError("Failed to get insights", 500, "FETCH_ERROR", error instanceof Error ? error.message : undefined);
  }
}
