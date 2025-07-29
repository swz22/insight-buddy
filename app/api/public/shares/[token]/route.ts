import { createServiceRoleClient } from "@/lib/supabase/service";
import { apiError, apiSuccess } from "@/lib/api/response";
import { z } from "zod";
import crypto from "crypto";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{
    token: string;
  }>;
}

const verifyPasswordSchema = z.object({
  password: z.string(),
});

export async function GET(request: Request, { params: paramsPromise }: RouteParams) {
  const params = await paramsPromise;

  try {
    const serviceSupabase = createServiceRoleClient();

    const { data: share, error: shareError } = await serviceSupabase
      .from("shared_meetings")
      .select("*, meetings!inner(*)")
      .eq("share_token", params.token)
      .single();

    if (shareError || !share) {
      return apiError("Share link not found", 404, "NOT_FOUND");
    }

    if (share.expires_at && new Date(share.expires_at) < new Date()) {
      return apiError("Share link has expired", 410, "EXPIRED");
    }

    if (share.password) {
      return apiSuccess({
        requiresPassword: true,
        meeting: null,
      });
    }

    await serviceSupabase
      .from("shared_meetings")
      .update({
        access_count: share.access_count + 1,
        last_accessed_at: new Date().toISOString(),
      })
      .eq("share_token", params.token);

    const meeting = {
      id: share.meetings.id,
      title: share.meetings.title,
      description: share.meetings.description,
      recorded_at: share.meetings.recorded_at,
      duration: share.meetings.duration,
      participants: share.meetings.participants,
      transcript: share.meetings.transcript,
      summary: share.meetings.summary,
      action_items: share.meetings.action_items,
      audio_url: share.meetings.audio_url,
    };

    return apiSuccess({
      requiresPassword: false,
      meeting,
      share: {
        created_at: share.created_at,
        expires_at: share.expires_at,
        access_count: share.access_count + 1,
      },
    });
  } catch (error) {
    console.error("Get shared meeting error:", error);
    return apiError(
      "Failed to access shared meeting",
      500,
      "ACCESS_ERROR",
      error instanceof Error ? error.message : undefined
    );
  }
}

export async function POST(request: Request, { params: paramsPromise }: RouteParams) {
  const params = await paramsPromise;

  try {
    const body = await request.json();
    const validation = verifyPasswordSchema.safeParse(body);
    if (!validation.success) {
      return apiError("Password is required", 400, "VALIDATION_ERROR");
    }

    const serviceSupabase = createServiceRoleClient();

    // Get share details
    const { data: share, error: shareError } = await serviceSupabase
      .from("shared_meetings")
      .select("*, meetings!inner(*)")
      .eq("share_token", params.token)
      .single();

    if (shareError || !share) {
      return apiError("Share link not found", 404, "NOT_FOUND");
    }

    // Check if expired
    if (share.expires_at && new Date(share.expires_at) < new Date()) {
      return apiError("Share link has expired", 410, "EXPIRED");
    }

    // Verify password
    if (!share.password) {
      return apiError("This share link does not require a password", 400, "NO_PASSWORD");
    }

    const hashedPassword = crypto.createHash("sha256").update(validation.data.password).digest("hex");
    if (hashedPassword !== share.password) {
      return apiError("Incorrect password", 401, "INVALID_PASSWORD");
    }

    // Update access count and last accessed
    await serviceSupabase
      .from("shared_meetings")
      .update({
        access_count: share.access_count + 1,
        last_accessed_at: new Date().toISOString(),
      })
      .eq("share_token", params.token);

    // Return meeting data
    const meeting = {
      id: share.meetings.id,
      title: share.meetings.title,
      description: share.meetings.description,
      recorded_at: share.meetings.recorded_at,
      duration: share.meetings.duration,
      participants: share.meetings.participants,
      transcript: share.meetings.transcript,
      summary: share.meetings.summary,
      action_items: share.meetings.action_items,
      audio_url: share.meetings.audio_url,
    };

    return apiSuccess({
      requiresPassword: false,
      meeting,
      share: {
        created_at: share.created_at,
        expires_at: share.expires_at,
        access_count: share.access_count + 1,
      },
    });
  } catch (error) {
    console.error("Verify password error:", error);
    return apiError(
      "Failed to verify password",
      500,
      "VERIFY_ERROR",
      error instanceof Error ? error.message : undefined
    );
  }
}
