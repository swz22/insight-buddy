import { NextRequest } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { transcriptSchema } from "@/lib/services/assemblyai";
import { apiError, apiSuccess } from "@/lib/api/response";
import { AssemblyAIService } from "@/lib/services/assemblyai";

export async function POST(request: NextRequest) {
  try {
    const contentLength = request.headers.get("content-length");

    if (!contentLength || contentLength === "0") {
      return apiSuccess({ received: true, status: "ping" });
    }

    const body = await request.json();
    const transcript = transcriptSchema.parse(body);

    if (transcript.status === "error") {
      console.error("Transcription error:", transcript.error);
      return apiSuccess({ received: true, status: "error", error: transcript.error });
    }

    if (transcript.status !== "completed") {
      return apiSuccess({ received: true, status: transcript.status });
    }

    const meetingId = request.headers.get("x-meeting-id") || request.nextUrl.searchParams.get("meeting_id");
    if (!meetingId) {
      console.error("No meeting ID in webhook request");
      return apiError("Missing meeting ID", 400);
    }

    const supabase = createServiceRoleClient();
    const assemblyAI = new AssemblyAIService();
    const speakers = assemblyAI.extractSpeakers(transcript);
    const formattedTranscript = assemblyAI.formatTranscriptText(transcript);
    const languageInfo = assemblyAI.extractLanguageInfo(transcript);

    const { error: updateError } = await supabase
      .from("meetings")
      .update({
        transcript: formattedTranscript,
        transcript_id: null,
        duration: transcript.audio_duration ? Math.round(transcript.audio_duration) : null,
        participants: speakers.length > 0 ? speakers : ["Unknown Speaker"],
        language: languageInfo?.code || "en",
        updated_at: new Date().toISOString(),
      })
      .eq("id", meetingId);

    if (updateError) {
      console.error("Failed to update meeting:", updateError);
      return apiError("Failed to update meeting", 500);
    }

    return apiSuccess({
      received: true,
      status: "completed",
      meetingId,
      transcriptId: transcript.id,
      language: languageInfo?.code || "en",
    });
  } catch (error) {
    console.error("Webhook processing error:", error);
    return apiError(
      "Failed to process webhook",
      500,
      "WEBHOOK_ERROR",
      error instanceof Error ? error.message : undefined
    );
  }
}
