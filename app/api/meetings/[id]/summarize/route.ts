import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { apiError, apiSuccess } from "@/lib/api/response";

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
      return apiError("No transcript available for summarization", 400, "NO_TRANSCRIPT");
    }

    const openaiKey = process.env.OPENAI_API_KEY;

    if (!openaiKey) {
      return apiError("AI service not configured", 503, "SERVICE_UNAVAILABLE");
    }

    return apiError("Summary generation temporarily unavailable", 503, "SERVICE_UNAVAILABLE");
  } catch (error) {
    console.error("Summarization error:", error);
    return apiError(
      "Failed to generate summary",
      500,
      "SUMMARIZATION_ERROR",
      error instanceof Error ? error.message : undefined
    );
  }
}
