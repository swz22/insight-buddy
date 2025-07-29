import { createServiceRoleClient } from "@/lib/supabase/service";
import { apiError, apiSuccess } from "@/lib/api/response";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return apiError("Unauthorized", 401, "UNAUTHORIZED");
  }

  try {
    const serviceSupabase = createServiceRoleClient();
    const { data, error } = await serviceSupabase
      .from("shared_meetings")
      .delete()
      .lt("expires_at", new Date().toISOString())
      .not("expires_at", "is", null)
      .select();

    if (error) {
      throw error;
    }

    const deletedCount = data?.length || 0;

    return apiSuccess({
      success: true,
      deletedCount,
      message: `Cleaned up ${deletedCount} expired share links`,
    });
  } catch (error) {
    console.error("Cleanup error:", error);
    return apiError(
      "Failed to cleanup expired shares",
      500,
      "CLEANUP_ERROR",
      error instanceof Error ? error.message : undefined
    );
  }
}
