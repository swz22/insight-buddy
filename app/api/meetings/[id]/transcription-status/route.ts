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
      .select("transcript_id, transcript")
      .eq("id", params.id)
      .eq("user_id", user.id)
      .single();

    if (fetchError || !meeting) {
      return apiError("Meeting not found", 404, "NOT_FOUND");
    }

    if (meeting.transcript) {
      return apiSuccess({ status: "completed", hasTranscript: true });
    }

    if (!meeting.transcript_id) {
      return apiSuccess({ status: "not_started", hasTranscript: false });
    }

    if (!process.env.ASSEMBLYAI_API_KEY) {
      return apiError("Transcription service not configured", 503, "SERVICE_UNAVAILABLE");
    }

    const assemblyAI = new AssemblyAIService();
    const transcript = await assemblyAI.getTranscription(meeting.transcript_id);

    if (transcript.status === "completed" && transcript.text) {
      const speakers = assemblyAI.extractSpeakers(transcript);
      const formattedTranscript = assemblyAI.formatTranscriptText(transcript);
      const languageInfo = assemblyAI.extractLanguageInfo(transcript);

      await serviceSupabase
        .from("meetings")
        .update({
          transcript: formattedTranscript,
          transcript_id: null,
          duration: transcript.audio_duration ? Math.round(transcript.audio_duration) : null,
          participants: speakers.length > 0 ? speakers : ["Unknown Speaker"],
          language: languageInfo?.code || "en",
          updated_at: new Date().toISOString(),
        })
        .eq("id", params.id);

      if (process.env.OPENAI_API_KEY) {
        fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/meetings/${params.id}/summarize`, {
          method: "POST",
        }).catch((err) => console.error("Failed to trigger summary:", err));
      }

      return apiSuccess({
        status: "completed",
        hasTranscript: true,
        language: languageInfo?.code || "en",
      });
    }

    return apiSuccess({
      status: transcript.status,
      hasTranscript: false,
      error: transcript.error,
    });
  } catch (error) {
    console.error("Transcription status error:", error);
    return apiError(
      "Failed to check transcription status",
      500,
      "STATUS_ERROR",
      error instanceof Error ? error.message : undefined
    );
  }
}
