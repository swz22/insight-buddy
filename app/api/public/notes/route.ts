import { NextRequest } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { apiError, apiSuccess } from "@/lib/api/response";
import { rateLimiters } from "@/lib/api/rate-limit";
import { z } from "zod";

export const dynamic = "force-dynamic";

const MAX_NOTES_LENGTH = 50000; // 50KB limit

const updateNotesSchema = z.object({
  meeting_id: z.string().uuid(),
  share_token: z.string().min(8).max(8),
  content: z.string().max(MAX_NOTES_LENGTH),
  last_edited_by: z.object({
    name: z.string(),
    color: z.string(),
    sessionId: z.string(),
  }),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const rateLimitResponse = await rateLimiters.publicNotes(request, body.share_token);
    if (rateLimitResponse) return rateLimitResponse;

    const validation = updateNotesSchema.safeParse(body);
    if (!validation.success) {
      return apiError("Invalid request data", 400, "VALIDATION_ERROR", validation.error.issues);
    }

    const data = validation.data;
    const serviceSupabase = createServiceRoleClient();

    const { data: share, error: shareError } = await serviceSupabase
      .from("shared_meetings")
      .select("meeting_id, expires_at")
      .eq("share_token", data.share_token)
      .single();

    if (shareError || !share) {
      return apiError("Invalid share token", 404, "INVALID_SHARE");
    }

    if (share.expires_at && new Date(share.expires_at) < new Date()) {
      return apiError("Share link has expired", 410, "EXPIRED_SHARE");
    }

    if (share.meeting_id !== data.meeting_id) {
      return apiError("Meeting ID mismatch", 400, "INVALID_MEETING");
    }

    const { data: notes, error: upsertError } = await serviceSupabase
      .from("meeting_notes")
      .upsert({
        meeting_id: data.meeting_id,
        share_token: data.share_token,
        content: data.content,
        last_edited_by: data.last_edited_by,
        version: 1,
        updated_at: new Date().toISOString(),
      })
      .eq("meeting_id", data.meeting_id)
      .eq("share_token", data.share_token)
      .select()
      .single();

    if (upsertError) {
      console.error("Failed to update notes:", upsertError);
      return apiError("Failed to update notes", 500, "UPDATE_ERROR");
    }

    return apiSuccess(notes);
  } catch (error) {
    console.error("Notes update error:", error);
    return apiError("Internal server error", 500, "INTERNAL_ERROR");
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const meetingId = searchParams.get("meeting_id");
    const shareToken = searchParams.get("share_token");

    if (!meetingId || !shareToken) {
      return apiError("Missing required parameters", 400, "MISSING_PARAMS");
    }

    const serviceSupabase = createServiceRoleClient();

    const { data: share, error: shareError } = await serviceSupabase
      .from("shared_meetings")
      .select("meeting_id, expires_at")
      .eq("share_token", shareToken)
      .single();

    if (shareError || !share) {
      return apiError("Invalid share token", 404, "INVALID_SHARE");
    }

    if (share.expires_at && new Date(share.expires_at) < new Date()) {
      return apiError("Share link has expired", 410, "EXPIRED_SHARE");
    }

    if (share.meeting_id !== meetingId) {
      return apiError("Meeting ID mismatch", 400, "INVALID_MEETING");
    }

    const { data: notes, error: notesError } = await serviceSupabase
      .from("meeting_notes")
      .select("*")
      .eq("meeting_id", meetingId)
      .eq("share_token", shareToken)
      .single();

    if (notesError && notesError.code !== "PGRST116") {
      console.error("Failed to fetch notes:", notesError);
      return apiError("Failed to fetch notes", 500, "FETCH_ERROR");
    }

    return apiSuccess(notes || { content: "", last_edited_by: null });
  } catch (error) {
    console.error("Notes fetch error:", error);
    return apiError("Internal server error", 500, "INTERNAL_ERROR");
  }
}
