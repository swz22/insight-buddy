import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { apiError, apiSuccess } from "@/lib/api/response";
import { z } from "zod";
import { validateRequest } from "@/lib/validations/utils";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

const createCommentSchema = z.object({
  text: z.string().min(1).max(1000),
  selection: z.object({
    start: z.number(),
    end: z.number(),
    text: z.string(),
    contextBefore: z.string().optional(),
    contextAfter: z.string().optional(),
    paragraphId: z.string().optional(),
    speakerName: z.string().optional(),
  }),
  parentId: z.string().uuid().optional(),
});

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

    const { data: meeting } = await serviceSupabase
      .from("meetings")
      .select("id")
      .eq("id", params.id)
      .eq("user_id", user.id)
      .single();

    if (!meeting) {
      return apiError("Meeting not found", 404, "NOT_FOUND");
    }

    const { data: comments, error } = await serviceSupabase
      .from("meeting_comments")
      .select("*")
      .eq("meeting_id", params.id)
      .order("created_at", { ascending: true });

    if (error) {
      return apiError("Failed to fetch comments", 500, "FETCH_ERROR");
    }

    return apiSuccess({ comments: comments || [] });
  } catch (error) {
    console.error("Get comments error:", error);
    return apiError("Failed to get comments", 500, "INTERNAL_ERROR");
  }
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

    const body = await request.json();
    const validation = validateRequest(createCommentSchema, body);
    
    if (!validation.success) {
      return validation.error;
    }

    const serviceSupabase = createServiceRoleClient();

    const { data: meeting } = await serviceSupabase
      .from("meetings")
      .select("id")
      .eq("id", params.id)
      .eq("user_id", user.id)
      .single();

    if (!meeting) {
      return apiError("Meeting not found", 404, "NOT_FOUND");
    }

    const { data: comment, error } = await serviceSupabase
      .from("meeting_comments")
      .insert({
        meeting_id: params.id,
        user_id: user.id,
        text: validation.data.text,
        selection_start: validation.data.selection.start,
        selection_end: validation.data.selection.end,
        selection_text: validation.data.selection.text,
        context_before: validation.data.selection.contextBefore,
        context_after: validation.data.selection.contextAfter,
        paragraph_id: validation.data.selection.paragraphId,
        speaker_name: validation.data.selection.speakerName,
        parent_id: validation.data.parentId,
        user_name: user.email?.split("@")[0] || "Anonymous",
        user_color: "#a855f7",
      })
      .select()
      .single();

    if (error) {
      console.error("Create comment error:", error);
      return apiError("Failed to create comment", 500, "CREATE_ERROR");
    }

    return apiSuccess(comment);
  } catch (error) {
    console.error("Create comment error:", error);
    return apiError("Failed to create comment", 500, "INTERNAL_ERROR");
  }
}