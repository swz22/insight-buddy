import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { apiError, apiSuccess } from "@/lib/api/response";
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

    if (!process.env.OPENAI_API_KEY) {
      return apiError("AI service not configured", 503, "SERVICE_UNAVAILABLE");
    }

    // Temporarily return unavailable until OpenAI service is implemented
    return apiError("Insights generation temporarily unavailable", 503, "SERVICE_UNAVAILABLE");
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
