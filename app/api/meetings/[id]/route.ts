import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { extractFilePath, STORAGE_BUCKET } from "@/lib/services/storage";
import { apiError, apiSuccess } from "@/lib/api/response";
import { validateRequest } from "@/lib/validations/utils";
import { updateMeetingSchema } from "@/lib/validations/meeting";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(request: Request, { params: paramsPromise }: RouteParams) {
  const params = await paramsPromise;
  try {
    // Use regular client to check authentication
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return apiError("Unauthorized", 401, "AUTH_REQUIRED");
    }

    // Use service role client for database operations
    const serviceSupabase = createServiceRoleClient();

    const { data: meeting, error } = await serviceSupabase
      .from("meetings")
      .select("*")
      .eq("id", params.id)
      .eq("user_id", user.id)
      .single();

    if (error || !meeting) {
      return apiError("Meeting not found", 404, "NOT_FOUND");
    }

    return apiSuccess(meeting);
  } catch (error) {
    console.error("Error fetching meeting:", error);
    return apiError("Failed to fetch meeting", 500, "FETCH_ERROR", error instanceof Error ? error.message : undefined);
  }
}

export async function PATCH(request: Request, { params: paramsPromise }: RouteParams) {
  const params = await paramsPromise;
  try {
    // Use regular client to check authentication
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return apiError("Unauthorized", 401, "AUTH_REQUIRED");
    }

    const body = await request.json();

    // Validate request body
    const validation = validateRequest(updateMeetingSchema, body);
    if (!validation.success) {
      return validation.error;
    }

    // Use service role client for database operations
    const serviceSupabase = createServiceRoleClient();

    const { data: meeting, error } = await serviceSupabase
      .from("meetings")
      .update(validation.data)
      .eq("id", params.id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error || !meeting) {
      return apiError("Meeting not found or update failed", 404, "UPDATE_FAILED");
    }

    return apiSuccess(meeting);
  } catch (error) {
    console.error("Error updating meeting:", error);
    return apiError(
      "Failed to update meeting",
      500,
      "UPDATE_ERROR",
      error instanceof Error ? error.message : undefined
    );
  }
}

export async function DELETE(request: Request, { params: paramsPromise }: RouteParams) {
  const params = await paramsPromise;
  try {
    // Use regular client to check authentication
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return apiError("Unauthorized", 401, "AUTH_REQUIRED");
    }

    // Use service role client for database operations
    const serviceSupabase = createServiceRoleClient();

    const { data: meeting } = await serviceSupabase
      .from("meetings")
      .select("audio_url")
      .eq("id", params.id)
      .eq("user_id", user.id)
      .single();

    const { error } = await serviceSupabase.from("meetings").delete().eq("id", params.id).eq("user_id", user.id);

    if (error) {
      return apiError("Failed to delete meeting", 500, "DELETE_ERROR", error.message);
    }

    if (meeting?.audio_url) {
      const filePath = extractFilePath(meeting.audio_url);
      if (filePath) {
        const { error: storageError } = await serviceSupabase.storage.from(STORAGE_BUCKET).remove([filePath]);

        if (storageError) {
          console.error("Failed to delete audio file:", storageError);
        }
      }
    }

    return apiSuccess({ success: true });
  } catch (error) {
    console.error("Error deleting meeting:", error);
    return apiError(
      "Failed to delete meeting",
      500,
      "DELETE_ERROR",
      error instanceof Error ? error.message : undefined
    );
  }
}
