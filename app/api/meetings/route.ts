import { createClient } from "@/lib/supabase/server";
import { apiError, apiSuccess } from "@/lib/api/response";
import { validateRequest } from "@/lib/validations/utils";
import { createMeetingSchema } from "@/lib/validations/meeting";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return apiError("Unauthorized", 401, "AUTH_REQUIRED");
    }

    const { data: meetings, error } = await supabase
      .from("meetings")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return apiSuccess(meetings || []);
  } catch (error) {
    console.error("Error fetching meetings:", error);
    return apiError("Failed to fetch meetings", 500, "FETCH_ERROR", error instanceof Error ? error.message : undefined);
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

    // Validate request body
    const validation = validateRequest(createMeetingSchema, body);
    if (!validation.success) {
      return validation.error;
    }

    const { title, description, recorded_at, participants, audio_url } = validation.data;

    const { data: meeting, error } = await supabase
      .from("meetings")
      .insert({
        title,
        description: description || null,
        recorded_at: recorded_at || new Date().toISOString(),
        user_id: user.id,
        participants: participants || [],
        audio_url: audio_url || null,
      })
      .select()
      .single();

    if (error) {
      console.error("Supabase insert error:", error);
      throw error;
    }

    return apiSuccess(meeting, 201);
  } catch (error) {
    console.error("Error creating meeting:", error);
    return apiError(
      "Failed to create meeting",
      500,
      "CREATE_ERROR",
      error instanceof Error ? error.message : undefined
    );
  }
}
