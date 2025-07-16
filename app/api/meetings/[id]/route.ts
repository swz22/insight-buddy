import { createClient } from "@/lib/supabase/server";
import { Database } from "@/types/supabase";
import { extractFilePath, STORAGE_BUCKET } from "@/lib/services/storage";
import { apiError, apiSuccess } from "@/lib/api/response";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
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

    const { data: meeting, error } = await supabase
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
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return apiError("Unauthorized", 401, "AUTH_REQUIRED");
    }

    const body = await request.json();

    const { data: meeting, error } = await supabase
      .from("meetings")
      .update(body)
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
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return apiError("Unauthorized", 401, "AUTH_REQUIRED");
    }

    const { data: meeting } = await supabase
      .from("meetings")
      .select("audio_url")
      .eq("id", params.id)
      .eq("user_id", user.id)
      .single();

    const { error } = await supabase.from("meetings").delete().eq("id", params.id).eq("user_id", user.id);

    if (error) {
      return apiError("Failed to delete meeting", 500, "DELETE_ERROR", error.message);
    }

    if (meeting?.audio_url) {
      const filePath = extractFilePath(meeting.audio_url);
      if (filePath) {
        const { error: storageError } = await supabase.storage.from(STORAGE_BUCKET).remove([filePath]);

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
