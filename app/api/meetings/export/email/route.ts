import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { apiError, apiSuccess } from "@/lib/api/response";
import { ExportService } from "@/lib/services/export";
import { z } from "zod";
import { validateRequest } from "@/lib/validations/utils";

export const dynamic = "force-dynamic";

const emailExportSchema = z.object({
  meetingId: z.string().uuid(),
  recipientEmails: z.array(z.string().email()).min(1).max(5),
  format: z.enum(["pdf", "docx", "txt"]),
  sections: z.object({
    metadata: z.boolean(),
    transcript: z.boolean(),
    summary: z.boolean(),
    actionItems: z.boolean(),
    insights: z.boolean(),
  }),
  customMessage: z.string().max(500).optional(),
  exportedBy: z.object({
    email: z.string().email(),
    name: z.string().optional(),
  }),
});

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return apiError("Unauthorized", 401, "AUTH_REQUIRED");
    }

    const body = await request.json();
    const validation = validateRequest(emailExportSchema, body);
    if (!validation.success) {
      return validation.error;
    }

    const serviceSupabase = createServiceRoleClient();

    const { data: meeting, error: meetingError } = await serviceSupabase
      .from("meetings")
      .select("*")
      .eq("id", validation.data.meetingId)
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
        .eq("meeting_id", validation.data.meetingId)
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

    const filename = `${meeting.title.replace(/[^a-zA-Z0-9]/g, "_")}_${new Date().toISOString().split("T")[0]}.${
      validation.data.format
    }`;

    try {
      await exportService.sendEmailExport(validation.data, blob, filename, user.id);
      return apiSuccess({ success: true, message: "Export sent successfully" });
    } catch (emailError) {
      console.error("Email sending error:", emailError);
      return apiError(
        "Failed to send email",
        500,
        "EMAIL_ERROR",
        emailError instanceof Error ? emailError.message : undefined
      );
    }
  } catch (error) {
    console.error("Email export error:", error);
    return apiError(
      "Failed to process email export",
      500,
      "EXPORT_ERROR",
      error instanceof Error ? error.message : undefined
    );
  }
}
