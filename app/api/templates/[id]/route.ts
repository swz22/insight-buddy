import { createClient } from "@/lib/supabase/server";
import { apiError, apiSuccess } from "@/lib/api/response";
import { z } from "zod";
import { validateRequest } from "@/lib/validations/utils";
import { validateTemplate } from "@/lib/utils/templates";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

const updateTemplateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  title_template: z.string().min(1).max(255).optional(),
  description_template: z.string().max(500).nullable().optional(),
  participants: z.array(z.string()).optional(),
  is_default: z.boolean().optional(),
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
    const validation = validateRequest(updateTemplateSchema, body);
    if (!validation.success) {
      return validation.error;
    }

    // Validate template syntax if provided
    if (validation.data.title_template) {
      const titleValidation = validateTemplate(validation.data.title_template);
      if (!titleValidation.valid) {
        return apiError(`Title template error: ${titleValidation.error}`, 400, "INVALID_TEMPLATE");
      }
    }

    if (validation.data.description_template) {
      const descValidation = validateTemplate(validation.data.description_template);
      if (!descValidation.valid) {
        return apiError(`Description template error: ${descValidation.error}`, 400, "INVALID_TEMPLATE");
      }
    }

    const { data: template, error } = await supabase
      .from("meeting_templates")
      .update(validation.data)
      .eq("id", params.id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error || !template) {
      return apiError("Template not found or update failed", 404, "UPDATE_FAILED");
    }

    return apiSuccess(template);
  } catch (error) {
    console.error("Error updating template:", error);
    return apiError(
      "Failed to update template",
      500,
      "UPDATE_ERROR",
      error instanceof Error ? error.message : undefined
    );
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

    const { error } = await supabase.from("meeting_templates").delete().eq("id", params.id).eq("user_id", user.id);

    if (error) {
      return apiError("Failed to delete template", 500, "DELETE_ERROR", error.message);
    }

    return apiSuccess({ success: true });
  } catch (error) {
    console.error("Error deleting template:", error);
    return apiError(
      "Failed to delete template",
      500,
      "DELETE_ERROR",
      error instanceof Error ? error.message : undefined
    );
  }
}
