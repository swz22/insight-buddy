import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { HuggingFaceService } from "@/lib/services/huggingface";
import { apiError, apiSuccess } from "@/lib/api/response";
import { MeetingSummary, ActionItem } from "@/types/supabase";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

export async function POST(request: Request, { params: paramsPromise }: RouteParams) {
  const params = (await paramsPromise) as { id: string };

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

    if (meeting.summary) {
      return apiError("Meeting already has a summary", 400, "ALREADY_SUMMARIZED");
    }

    const huggingFace = new HuggingFaceService();

    try {
      // Validate transcript before processing
      if (!meeting.transcript || meeting.transcript.trim().length < 50) {
        throw new Error("Transcript too short for meaningful summarization");
      }

      const summaryText = await huggingFace.summarizeText(meeting.transcript);
      const keyPoints = await huggingFace.extractKeyPoints(meeting.transcript);
      const decisions = huggingFace.extractDecisions(meeting.transcript);
      const nextSteps = huggingFace.extractNextSteps(meeting.transcript);
      const parsedActionItems = huggingFace.parseActionItems(meeting.transcript);

      const actionItems: ActionItem[] = parsedActionItems.map((item, index) => ({
        id: `${meeting.id}-action-${index + 1}`,
        task: item.task,
        assignee: item.assignee,
        due_date: null,
        priority: item.priority,
        completed: false,
      }));

      const summary: MeetingSummary = {
        overview: summaryText,
        key_points: keyPoints,
        decisions: decisions,
        next_steps: nextSteps,
      };

      // Update meeting with AI-generated content
      const { error: updateError } = await serviceSupabase
        .from("meetings")
        .update({
          summary,
          action_items: actionItems.length > 0 ? actionItems : null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", params.id);

      if (updateError) {
        throw updateError;
      }

      return apiSuccess({
        success: true,
        summary,
        actionItems,
      });
    } catch (aiError) {
      console.error("AI processing error:", aiError);

      // More detailed error logging
      const errorMessage = aiError instanceof Error ? aiError.message : "Unknown error";
      console.error("Error details:", errorMessage);

      // Fallback to basic processing if AI fails
      const sentences = meeting.transcript.match(/[^.!?]+[.!?]+/g) || [];
      const cleanedSentences = sentences
        .map((s: string) => s.replace(/\[[\d:]+\]\s*/g, "").trim())
        .filter((s: string) => s.length > 20);

      const firstThreeSentences = cleanedSentences.slice(0, 3).join(" ");

      const fallbackSummary: MeetingSummary = {
        overview:
          firstThreeSentences || "Meeting transcript available. Unable to generate AI summary due to technical issues.",
        key_points: cleanedSentences.slice(0, 3),
        decisions: [],
        next_steps: [],
      };

      const { error: updateError } = await serviceSupabase
        .from("meetings")
        .update({
          summary: fallbackSummary,
          updated_at: new Date().toISOString(),
        })
        .eq("id", params.id);

      if (updateError) {
        throw updateError;
      }

      return apiSuccess({
        success: true,
        summary: fallbackSummary,
        actionItems: [],
        fallback: true,
        aiError: errorMessage,
      });
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
