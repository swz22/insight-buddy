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

    if (!process.env.ASSEMBLYAI_API_KEY) {
      return apiError("Transcription service not configured", 503, "SERVICE_UNAVAILABLE");
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

    if (!meeting.audio_url) {
      return apiError("No audio file found for this meeting", 400, "NO_AUDIO");
    }

    if (meeting.transcript_id) {
      return apiError("Transcription already in progress", 400, "ALREADY_TRANSCRIBING");
    }

    const assemblyAI = new AssemblyAIService();

    const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/assemblyai?meeting_id=${params.id}`;
    const { id: transcriptId } = await assemblyAI.createTranscription({
      audio_url: meeting.audio_url,
      webhook_url: webhookUrl,
      speaker_labels: true,
      language_detection: true,
    });

    const { error: updateError } = await serviceSupabase
      .from("meetings")
      .update({
        transcript_id: transcriptId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", params.id);

    if (updateError) {
      console.error("Failed to update meeting with transcript ID:", updateError);
    }

    return apiSuccess({
      transcriptId,
      message: "Transcription started",
    });
  } catch (error) {
    console.error("Transcription error:", error);
    return apiError(
      "Failed to start transcription",
      500,
      "TRANSCRIPTION_ERROR",
      error instanceof Error ? error.message : undefined
    );
  }
}
