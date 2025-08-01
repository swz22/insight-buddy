import { NextRequest } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { apiError, apiSuccess } from "@/lib/api/response";
import { rateLimiters } from "@/lib/api/rate-limit";
import { z } from "zod";

export const dynamic = "force-dynamic";

const createAnnotationSchema = z.object({
  meeting_id: z.string().uuid(),
  share_token: z.string().min(8).max(8),
  user_info: z.object({
    name: z.string(),
    color: z.string(),
    sessionId: z.string(),
    email: z.string().optional(),
    avatar_url: z.string().optional(),
  }),
  type: z.enum(["highlight", "comment", "note"]),
  content: z.string().max(5000),
  position: z.any().optional(),
  parent_id: z.string().uuid().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const rateLimitResponse = await rateLimiters.publicAnnotations(request, body.share_token);
    if (rateLimitResponse) return rateLimitResponse;

    const validation = createAnnotationSchema.safeParse(body);
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

    const { data: annotation, error: insertError } = await serviceSupabase
      .from("meeting_annotations")
      .insert({
        meeting_id: data.meeting_id,
        share_token: data.share_token,
        user_info: data.user_info,
        type: data.type,
        content: data.content,
        position: data.position,
        parent_id: data.parent_id,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Failed to create annotation:", insertError);
      return apiError("Failed to create annotation", 500, "CREATE_ERROR");
    }

    return apiSuccess(annotation, 201);
  } catch (error) {
    console.error("Annotation creation error:", error);
    return apiError("Internal server error", 500, "INTERNAL_ERROR");
  }
}

const updateAnnotationSchema = z.object({
  id: z.string().uuid(),
  share_token: z.string().min(8).max(8),
  sessionId: z.string(),
  content: z.string().max(5000),
});

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const rateLimitResponse = await rateLimiters.publicAnnotations(request, body.share_token);
    if (rateLimitResponse) return rateLimitResponse;

    const validation = updateAnnotationSchema.safeParse(body);
    if (!validation.success) {
      return apiError("Invalid request data", 400, "VALIDATION_ERROR", validation.error.issues);
    }

    const data = validation.data;
    const serviceSupabase = createServiceRoleClient();

    const { data: annotation, error: updateError } = await serviceSupabase
      .from("meeting_annotations")
      .update({ content: data.content })
      .eq("id", data.id)
      .eq("share_token", data.share_token)
      .eq("user_info->sessionId", data.sessionId)
      .select()
      .single();

    if (updateError || !annotation) {
      return apiError("Annotation not found or unauthorized", 404, "NOT_FOUND");
    }

    return apiSuccess(annotation);
  } catch (error) {
    console.error("Annotation update error:", error);
    return apiError("Internal server error", 500, "INTERNAL_ERROR");
  }
}

const deleteAnnotationSchema = z.object({
  id: z.string().uuid(),
  share_token: z.string().min(8).max(8),
  sessionId: z.string(),
});

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const rateLimitResponse = await rateLimiters.publicAnnotations(request, body.share_token);
    if (rateLimitResponse) return rateLimitResponse;

    const validation = deleteAnnotationSchema.safeParse(body);
    if (!validation.success) {
      return apiError("Invalid request data", 400, "VALIDATION_ERROR", validation.error.issues);
    }

    const data = validation.data;
    const serviceSupabase = createServiceRoleClient();

    const { error: deleteError } = await serviceSupabase
      .from("meeting_annotations")
      .delete()
      .eq("id", data.id)
      .eq("share_token", data.share_token)
      .eq("user_info->sessionId", data.sessionId);

    if (deleteError) {
      return apiError("Failed to delete annotation", 500, "DELETE_ERROR");
    }

    return apiSuccess({ success: true });
  } catch (error) {
    console.error("Annotation deletion error:", error);
    return apiError("Internal server error", 500, "INTERNAL_ERROR");
  }
}
