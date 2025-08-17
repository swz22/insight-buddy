import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { apiError, apiSuccess } from "@/lib/api/response";
import { TranslationService } from "@/lib/services/translation";
import { z } from "zod";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

const translateSchema = z.object({
  targetLanguage: z.string().min(2).max(5),
  forceRetranslate: z.boolean().optional(),
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
    const validation = translateSchema.safeParse(body);

    if (!validation.success) {
      return apiError("Invalid request", 400, "VALIDATION_ERROR", validation.error.issues[0].message);
    }

    const { targetLanguage, forceRetranslate } = validation.data;

    const serviceSupabase = createServiceRoleClient();

    const { data: meeting, error: fetchError } = await serviceSupabase
      .from("meetings")
      .select("*")
      .eq("id", params.id)
      .eq("user_id", user.id)
      .single();

    if (fetchError || !meeting) {
      return apiError("Meeting not found", 404, "NOT_FOUND");
    }

    if (!meeting.transcript) {
      return apiError("No transcript available for translation", 400, "NO_TRANSCRIPT");
    }

    // Check for existing translation
    const existingTranslation = meeting.translations?.[targetLanguage];
    if (existingTranslation && !forceRetranslate) {
      return apiSuccess({
        translation: existingTranslation,
        cached: true,
      });
    }

    const openaiKey = process.env.OPENAI_API_KEY;
    if (!openaiKey) {
      return apiError("Translation service not configured", 503, "SERVICE_UNAVAILABLE");
    }

    try {
      const translationService = new TranslationService(openaiKey);

      // Detect source language if not specified
      const sourceLanguage = meeting.language || "en";

      // Translate the meeting content
      const translatedContent = await translationService.translateMeetingContent(
        {
          title: meeting.title,
          description: meeting.description,
          transcript: meeting.transcript,
          summary: meeting.summary,
        },
        targetLanguage,
        sourceLanguage
      );

      // Save the translation
      const updatedTranslations = {
        ...(meeting.translations || {}),
        [targetLanguage]: translatedContent,
      };

      const { error: updateError } = await serviceSupabase
        .from("meetings")
        .update({
          translations: updatedTranslations,
          updated_at: new Date().toISOString(),
        })
        .eq("id", params.id);

      if (updateError) {
        console.error("Failed to save translation:", updateError);
        return apiError("Failed to save translation", 500, "UPDATE_ERROR");
      }

      return apiSuccess({
        translation: translatedContent,
        cached: false,
        message: `Meeting successfully translated to ${targetLanguage}`,
      });
    } catch (error) {
      console.error("Translation processing failed:", error);
      return apiError(
        "Failed to translate meeting",
        500,
        "TRANSLATION_ERROR",
        error instanceof Error ? error.message : undefined
      );
    }
  } catch (error) {
    console.error("Translation error:", error);
    return apiError(
      "Failed to translate meeting",
      500,
      "TRANSLATION_ERROR",
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

    const url = new URL(request.url);
    const language = url.searchParams.get("language");

    const serviceSupabase = createServiceRoleClient();

    const { data: meeting, error } = await serviceSupabase
      .from("meetings")
      .select("translations")
      .eq("id", params.id)
      .eq("user_id", user.id)
      .single();

    if (error || !meeting) {
      return apiError("Meeting not found", 404, "NOT_FOUND");
    }

    if (language && meeting.translations?.[language]) {
      return apiSuccess(meeting.translations[language]);
    }

    return apiSuccess(meeting.translations || {});
  } catch (error) {
    console.error("Get translations error:", error);
    return apiError(
      "Failed to get translations",
      500,
      "FETCH_ERROR",
      error instanceof Error ? error.message : undefined
    );
  }
}
