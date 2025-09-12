import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { apiError, apiSuccess } from "@/lib/api/response";
import { z } from "zod";
import { validateRequest } from "@/lib/validations/utils";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{
    id: string;
    commentId: string;
  }>;
}

const updateCommentSchema = z.object({
  text: z.string().min(1).max(1000),
});

export async function PATCH(request: Request, { params: paramsPromise }: RouteParams) {
  const params = await paramsPromise;

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return apiError("Unauthorized", 401, "AUTH_REQUIRED");
    }

    const body = await request.json();
    const validation = validateRequest(updateCommentSchema, body);
    
    if (!validation.success) {
      return validation.error;
    }

    const serviceSupabase = createServiceRoleClient();

    const { data: comment, error } = await serviceSupabase
      .from("meeting_comments")
      .update({
        text: validation.data.text,
        updated_at: new Date().toISOString(),
      })
      .eq("id", params.commentId)
      .eq("meeting_id", params.id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error || !comment) {
      return apiError("Comment not found or unauthorized", 404, "NOT_FOUND");
    }

    return apiSuccess(comment);
  } catch (error) {
    console.error("Update comment error:", error);
    return apiError("Failed to update comment", 500, "INTERNAL_ERROR");
  }
}

export async function DELETE(request: Request, { params: paramsPromise }: RouteParams) {
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

    const { error } = await serviceSupabase
      .from("meeting_comments")
      .delete()
      .eq("id", params.commentId)
      .eq("meeting_id", params.id)
      .eq("user_id", user.id);

    if (error) {
      return apiError("Failed to delete comment", 500, "DELETE_ERROR");
    }

    return apiSuccess({ success: true });
  } catch (error) {
    console.error("Delete comment error:", error);
    return apiError("Failed to delete comment", 500, "INTERNAL_ERROR");
  }
}