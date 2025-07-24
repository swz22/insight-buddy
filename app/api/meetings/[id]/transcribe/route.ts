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

    if (!meeting.audio_url) {
      return apiError("No audio file attached to meeting", 400, "NO_AUDIO");
    }

    if (meeting.transcript) {
      return apiError("Meeting already has a transcript", 400, "ALREADY_TRANSCRIBED");
    }

    if (!process.env.ASSEMBLYAI_API_KEY) {
      console.error("AssemblyAI API key not found");
      return apiError("AssemblyAI API key not configured", 500, "MISSING_API_KEY");
    }

    const assemblyAI = new AssemblyAIService();

    // Create transcript with webhook
    const isDevelopment = process.env.NODE_ENV === "development";
    const webhookUrl = isDevelopment ? undefined : `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/assemblyai`;

    const transcript = await assemblyAI.createTranscript(meeting.audio_url, {
      webhook_url: webhookUrl,
      webhook_auth_header_name: webhookUrl ? "x-meeting-id" : undefined,
      webhook_auth_header_value: webhookUrl ? meeting.id : undefined,
      speaker_labels: true,
      punctuate: true,
      format_text: true,
    });

    const { error: updateError } = await serviceSupabase
      .from("meetings")
      .update({
        updated_at: new Date().toISOString(),
      })
      .eq("id", params.id);

    if (updateError) {
      console.error("Failed to update meeting:", updateError);
    }

    return apiSuccess({
      success: true,
      transcriptId: transcript.id,
      status: transcript.status,
      message: "Transcription started. You'll be notified when it's complete.",
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
