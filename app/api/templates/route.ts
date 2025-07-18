import { createClient } from "@/lib/supabase/server";
import { apiError, apiSuccess } from "@/lib/api/response";
import { z } from "zod";
import { validateRequest } from "@/lib/validations/utils";
import { validateTemplate } from "@/lib/utils/templates";

export const dynamic = "force-dynamic";

const createTemplateSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  title_template: z.string().min(1, "Title template is required").max(255),
  description_template: z.string().max(500).nullable().optional(),
  participants: z.array(z.string()).default([]),
  is_default: z.boolean().default(false),
});

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return apiError("Unauthorized", 401, "AUTH_REQUIRED");
    }

    const { data: templates, error } = await supabase
      .from("meeting_templates")
      .select("*")
      .eq("user_id", user.id)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) throw error;

    return apiSuccess(templates || []);
  } catch (error) {
    console.error("Error fetching templates:", error);
    return apiError(
      "Failed to fetch templates",
      500,
      "FETCH_ERROR",
      error instanceof Error ? error.message : undefined
    );
  }
}

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
    const validation = validateRequest(createTemplateSchema, body);
    if (!validation.success) {
      return validation.error;
    }

    // Validate template syntax
    const titleValidation = validateTemplate(validation.data.title_template);
    if (!titleValidation.valid) {
      return apiError(`Title template error: ${titleValidation.error}`, 400, "INVALID_TEMPLATE");
    }

    if (validation.data.description_template) {
      const descValidation = validateTemplate(validation.data.description_template);
      if (!descValidation.valid) {
        return apiError(`Description template error: ${descValidation.error}`, 400, "INVALID_TEMPLATE");
      }
    }

    const { data: template, error } = await supabase
      .from("meeting_templates")
      .insert({
        ...validation.data,
        user_id: user.id,
      })
      .select()
      .single();

    if (error) throw error;

    return apiSuccess(template, 201);
  } catch (error) {
    console.error("Error creating template:", error);
    return apiError(
      "Failed to create template",
      500,
      "CREATE_ERROR",
      error instanceof Error ? error.message : undefined
    );
  }
}
