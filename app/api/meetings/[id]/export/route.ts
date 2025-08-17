import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { apiError, apiSuccess } from "@/lib/api/response";
import { ExportService } from "@/lib/services/export";
import { z } from "zod";
import { validateRequest } from "@/lib/validations/utils";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

const exportRequestSchema = z.object({
  format: z.enum(["pdf", "docx", "txt"]),
  sections: z.object({
    metadata: z.boolean(),
    transcript: z.boolean(),
    summary: z.boolean(),
    actionItems: z.boolean(),
    insights: z.boolean(),
  }),
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
    const validation = validateRequest(exportRequestSchema, body);
    if (!validation.success) {
      return validation.error;
    }

    const serviceSupabase = createServiceRoleClient();

    const { data: meeting, error: meetingError } = await serviceSupabase
      .from("meetings")
      .select("*")
      .eq("id", params.id)
      .eq("user_id", user.id)
      .single();

    if (meetingError || !meeting) {
      return apiError("Meeting not found", 404, "NOT_FOUND");
    }

    let insights = null;
    if (validation.data.sections.insights) {
      const { data: insightsData } = await serviceSupabase
        .from("meeting_insights")
        .select("*")
        .eq("meeting_id", params.id)
        .single();

      insights = insightsData;
    }

    const exportService = new ExportService();
    const blob = await exportService.generateExport(
      meeting,
      validation.data.format,
      validation.data.sections,
      user.email || "user@example.com",
      insights
    );

    const headers = new Headers();
    const filename = `${meeting.title.replace(/[^a-zA-Z0-9]/g, "_")}_${new Date().toISOString().split("T")[0]}.${
      validation.data.format
    }`;

    headers.set("Content-Type", blob.type);
    headers.set("Content-Disposition", `attachment; filename="${filename}"`);
    headers.set("Content-Length", blob.size.toString());

    return new Response(blob, {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error("Export error:", error);
    return apiError(
      "Failed to export meeting",
      500,
      "EXPORT_ERROR",
      error instanceof Error ? error.message : undefined
    );
  }
}
