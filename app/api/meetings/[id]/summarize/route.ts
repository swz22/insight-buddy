import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { apiError, apiSuccess } from "@/lib/api/response";
import { OpenAIService } from "@/lib/services/openai";

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

    try {
      const openai = new OpenAIService(openaiKey);

      const summary = await openai.generateSummary(meeting.transcript, meeting.participants || []);

      const actionItems = await openai.extractActionItems(meeting.transcript, summary, meeting.participants || []);

      const { error: updateError } = await serviceSupabase
        .from("meetings")
        .update({
          summary,
          action_items: actionItems,
          updated_at: new Date().toISOString(),
        })
        .eq("id", params.id);

      if (updateError) {
        console.error("Failed to update meeting:", updateError);
        return apiError("Failed to save summary", 500, "UPDATE_ERROR");
      }

      return apiSuccess({
        summary,
        action_items: actionItems,
        message: "AI-powered summary generated successfully",
      });
    } catch (error) {
      console.error("OpenAI processing failed:", error);
      return apiError(
        "Failed to generate summary",
        500,
        "AI_PROCESSING_ERROR",
        error instanceof Error ? error.message : undefined
      );
    }
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
