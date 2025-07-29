import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { apiError, apiSuccess } from "@/lib/api/response";
import { z } from "zod";
import { validateRequest } from "@/lib/validations/utils";
import crypto from "crypto";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

const createShareSchema = z.object({
  password: z.string().min(6).optional().nullable(),
  expiresIn: z.enum(["1h", "24h", "7d", "30d", "never"]).default("7d"),
});

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
    const validation = validateRequest(createShareSchema, body);
    if (!validation.success) {
      return validation.error;
    }

    const serviceSupabase = createServiceRoleClient();

    const { data: meeting, error: meetingError } = await serviceSupabase
      .from("meetings")
      .select("id")
      .eq("id", params.id)
      .eq("user_id", user.id)
      .single();

    if (meetingError || !meeting) {
      return apiError("Meeting not found", 404, "NOT_FOUND");
    }

    let expiresAt: string | null = null;
    if (validation.data.expiresIn !== "never") {
      const expirationHours = {
        "1h": 1,
        "24h": 24,
        "7d": 24 * 7,
        "30d": 24 * 30,
      };
      const hours = expirationHours[validation.data.expiresIn];
      expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
    }

    const shareToken = crypto.randomBytes(4).toString("hex");

    let hashedPassword = null;
    if (validation.data.password) {
      hashedPassword = crypto.createHash("sha256").update(validation.data.password).digest("hex");
    }

    const { data: share, error: shareError } = await serviceSupabase
      .from("shared_meetings")
      .insert({
        meeting_id: params.id,
        share_token: shareToken,
        password: hashedPassword,
        expires_at: expiresAt,
        created_by: user.id,
      })
      .select()
      .single();

    if (shareError) {
      console.error("Share creation error:", shareError);
      return apiError("Failed to create share link", 500, "CREATE_ERROR");
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `https://${request.headers.get("host")}`;
    const shareUrl = `${baseUrl}/share/${shareToken}`;

    return apiSuccess({
      shareUrl,
      shareToken: share.share_token,
      expiresAt: share.expires_at,
      hasPassword: !!share.password,
    });
  } catch (error) {
    console.error("Share error:", error);
    return apiError(
      "Failed to create share link",
      500,
      "SHARE_ERROR",
      error instanceof Error ? error.message : undefined
    );
  }
}

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

    const { data: shares, error } = await serviceSupabase
      .from("shared_meetings")
      .select("*")
      .eq("meeting_id", params.id)
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    const { data: meeting } = await serviceSupabase.from("meetings").select("user_id").eq("id", params.id).single();

    if (!meeting || meeting.user_id !== user.id) {
      return apiError("Unauthorized", 403, "FORBIDDEN");
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `https://${request.headers.get("host")}`;

    const sharesWithUrls = shares.map((share) => ({
      ...share,
      shareUrl: `${baseUrl}/share/${share.share_token}`,
      hasPassword: !!share.password,
      isExpired: share.expires_at ? new Date(share.expires_at) < new Date() : false,
    }));

    return apiSuccess(sharesWithUrls);
  } catch (error) {
    console.error("Get shares error:", error);
    return apiError("Failed to get share links", 500, "GET_ERROR", error instanceof Error ? error.message : undefined);
  }
}
