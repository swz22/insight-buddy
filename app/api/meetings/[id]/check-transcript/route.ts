import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { AssemblyAIService } from "@/lib/services/assemblyai";
import { apiError, apiSuccess } from "@/lib/api/response";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
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
    const { data: meeting, error: fetchError } = await serviceSupabase
      .from("meetings")
      .select("*")
      .eq("id", params.id)
      .eq("user_id", user.id)
      .single();

    if (fetchError || !meeting) {
      return apiError("Meeting not found", 404, "NOT_FOUND");
    }

    if (meeting.transcript) {
      return apiSuccess({ status: "completed", hasTranscript: true });
    }

    const url = new URL(request.url);
    const transcriptId = url.searchParams.get("transcriptId");

    if (!transcriptId) {
      return apiSuccess({ status: "no_transcript_id", hasTranscript: false });
    }

    const assemblyAI = new AssemblyAIService();
    const transcript = await assemblyAI.getTranscription(transcriptId);

    if (transcript.status === "completed" && transcript.text) {
      const speakers = assemblyAI.extractSpeakers(transcript);
      const formattedTranscript = assemblyAI.formatTranscriptText(transcript);

      const { error: updateError } = await serviceSupabase
        .from("meetings")
        .update({
          transcript: formattedTranscript,
          transcript_id: null,
          duration: transcript.audio_duration ? Math.round(transcript.audio_duration) : null,
          participants: speakers.length > 0 ? speakers : ["Unknown Speaker"],
          updated_at: new Date().toISOString(),
        })
        .eq("id", params.id);

      if (updateError) {
        console.error("Failed to update meeting:", updateError);
        return apiError("Failed to update meeting", 500);
      }

      return apiSuccess({
        status: "completed",
        hasTranscript: true,
        transcript: formattedTranscript,
      });
    }

    return apiSuccess({
      status: transcript.status,
      hasTranscript: false,
      error: transcript.error,
    });
  } catch (error) {
    console.error("Check transcript error:", error);
    return apiError(
      "Failed to check transcript status",
      500,
      "CHECK_ERROR",
      error instanceof Error ? error.message : undefined
    );
  }
}
