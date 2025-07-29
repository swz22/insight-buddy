import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { apiError, apiSuccess } from "@/lib/api/response";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{
    token: string;
  }>;
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

    const { data: share, error: fetchError } = await serviceSupabase
      .from("shared_meetings")
      .select("*, meetings!inner(user_id)")
      .eq("share_token", params.token)
      .single();

    if (fetchError || !share) {
      return apiError("Share not found", 404, "NOT_FOUND");
    }

    if (share.meetings.user_id !== user.id) {
      return apiError("Unauthorized", 403, "FORBIDDEN");
    }

    const { error: deleteError } = await serviceSupabase
      .from("shared_meetings")
      .delete()
      .eq("share_token", params.token);

    if (deleteError) {
      throw deleteError;
    }

    return apiSuccess({ success: true });
  } catch (error) {
    console.error("Delete share error:", error);
    return apiError(
      "Failed to revoke share link",
      500,
      "DELETE_ERROR",
      error instanceof Error ? error.message : undefined
    );
  }
}
