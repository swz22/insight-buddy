import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { validateUploadedFile, sanitizeFileName } from "@/lib/utils/validation";
import { apiError, apiSuccess } from "@/lib/api/response";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return apiError("Unauthorized", 401, "AUTH_REQUIRED");
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return apiError("No file provided", 400, "NO_FILE");
    }

    const validation = validateUploadedFile({
      type: file.type,
      size: file.size,
      name: file.name,
    });

    if (!validation.valid) {
      return apiError(validation.error || "Invalid file", 400, "INVALID_FILE");
    }

    const fileExt = file.name.split(".").pop() || "bin";
    const sanitizedName = sanitizeFileName(file.name);
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(7);
    const fileName = `${timestamp}-${randomId}.${fileExt}`;
    const filePath = `${user.id}/${fileName}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    const { error: uploadError, data } = await supabase.storage.from("meeting-recordings").upload(filePath, buffer, {
      contentType: file.type,
      cacheControl: "3600",
      upsert: false,
    });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return apiError("Failed to upload file", 500, "UPLOAD_ERROR", uploadError.message);
    }

    const { data: signedUrlData, error: urlError } = await supabase.storage
      .from("meeting-recordings")
      .createSignedUrl(filePath, 60 * 60 * 24 * 365); // 1 year

    if (urlError || !signedUrlData?.signedUrl) {
      return apiError("Failed to generate URL", 500, "URL_ERROR", urlError?.message);
    }

    return apiSuccess({
      success: true,
      url: signedUrlData.signedUrl,
      path: filePath,
      fileName: fileName,
      originalName: sanitizedName,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return apiError("Internal server error", 500, "INTERNAL_ERROR", error instanceof Error ? error.message : undefined);
  }
}
