import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { validateUploadedFile, sanitizeFileName } from "@/lib/utils/validation";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const validation = validateUploadedFile({
      type: file.type,
      size: file.size,
      name: file.name,
    });

    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
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
      return NextResponse.json({ error: "Failed to upload file" }, { status: 500 });
    }

    const { data: signedUrlData, error: urlError } = await supabase.storage
      .from("meeting-recordings")
      .createSignedUrl(filePath, 60 * 60 * 24 * 365); // 1 year

    if (urlError || !signedUrlData?.signedUrl) {
      return NextResponse.json({ error: "Failed to generate URL" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      url: signedUrlData.signedUrl,
      path: filePath,
      fileName: fileName,
      originalName: sanitizedName,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
