import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { apiError, apiSuccess } from "@/lib/api/response";
import { InsightsService } from "@/lib/services/insights";
import { AssemblyAIService } from "@/lib/services/assemblyai";

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

    if (!meeting.transcript_id && !meeting.transcript) {
      return apiError("No transcript available for analysis", 400, "NO_TRANSCRIPT");
    }

    const { data: existingInsights } = await serviceSupabase
      .from("meeting_insights")
      .select("*")
      .eq("meeting_id", params.id)
      .single();

    if (existingInsights) {
      return apiSuccess(existingInsights);
    }

    if (!process.env.ASSEMBLYAI_API_KEY || !process.env.HUGGINGFACE_API_KEY) {
      return apiError("AI services not configured", 503, "SERVICE_UNAVAILABLE");
    }

    const assemblyAI = new AssemblyAIService(process.env.ASSEMBLYAI_API_KEY);
    const insightsService = new InsightsService(process.env.HUGGINGFACE_API_KEY);

    let transcript;
    if (meeting.transcript_id) {
      try {
        transcript = await assemblyAI.getTranscription(meeting.transcript_id);
      } catch (error) {
        console.error("Failed to get AssemblyAI transcript:", error);
        transcript = {
          id: meeting.transcript_id,
          status: "completed" as const,
          text: meeting.transcript,
          utterances: [],
          audio_duration: meeting.duration || 0,
        };
      }
    } else {
      transcript = {
        id: "stored",
        status: "completed" as const,
        text: meeting.transcript,
        utterances: [],
        audio_duration: meeting.duration || 0,
      };
    }

    const insights = await insightsService.analyzeMeeting(params.id, {
      text: transcript.text || "",
      utterances: transcript.utterances || [],
      audio_duration: transcript.audio_duration,
    });

    const { error: insertError } = await serviceSupabase.from("meeting_insights").insert({
      meeting_id: params.id,
      speaker_metrics: insights.speakerMetrics,
      sentiment: insights.sentiment,
      dynamics: insights.dynamics,
      key_moments: insights.keyMoments,
      engagement_score: insights.engagementScore,
    });

    if (insertError) {
      console.error("Failed to save insights:", insertError);
      return apiSuccess({
        ...insights,
        warning: "Insights generated but not saved",
      });
    }

    await serviceSupabase.from("meetings").update({ insights_generated: true }).eq("id", params.id);

    return apiSuccess(insights);
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

    const { data: insights, error } = await serviceSupabase
      .from("meeting_insights")
      .select("*")
      .eq("meeting_id", params.id)
      .single();

    if (error && error.code !== "PGRST116") {
      throw error;
    }

    if (!insights) {
      const { data: meeting } = await serviceSupabase.from("meetings").select("user_id").eq("id", params.id).single();

      if (!meeting || meeting.user_id !== user.id) {
        return apiError("Meeting not found", 404, "NOT_FOUND");
      }

      return apiSuccess(null);
    }

    return apiSuccess(insights);
  } catch (error) {
    console.error("Get insights error:", error);
    return apiError("Failed to get insights", 500, "FETCH_ERROR", error instanceof Error ? error.message : undefined);
  }
}
