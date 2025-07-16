import { createClient } from "@/lib/supabase/client";
import { createClient as createServerClient } from "@/lib/supabase/server";

export const STORAGE_BUCKET = "meeting-recordings";
export const SIGNED_URL_EXPIRY = 60 * 60 * 24 * 7; // 7 days

// Get a signed URL for a file in storage (client-side)
export async function getSignedUrl(filePath: string): Promise<string | null> {
  const supabase = createClient();

  const { data, error } = await supabase.storage.from(STORAGE_BUCKET).createSignedUrl(filePath, SIGNED_URL_EXPIRY);

  if (error || !data?.signedUrl) {
    console.error("Error getting signed URL:", error);
    return null;
  }

  return data.signedUrl;
}

// Get a signed URL for a file in storage (server-side)
export async function getSignedUrlServer(filePath: string): Promise<string | null> {
  const supabase = await createServerClient();

  const { data, error } = await supabase.storage.from(STORAGE_BUCKET).createSignedUrl(filePath, SIGNED_URL_EXPIRY);

  if (error || !data?.signedUrl) {
    console.error("Error getting signed URL:", error);
    return null;
  }

  return data.signedUrl;
}

export async function deleteFile(filePath: string): Promise<boolean> {
  const supabase = createClient();

  const { error } = await supabase.storage.from(STORAGE_BUCKET).remove([filePath]);

  if (error) {
    console.error("Error deleting file:", error);
    return false;
  }

  return true;
}

export function extractFilePath(url: string): string | null {
  try {
    const urlObj = new URL(url);
    const pathMatch = urlObj.pathname.match(
      /\/storage\/v1\/object\/(?:public|sign)\/meeting-recordings\/(.+?)(?:\?|$)/
    );
    return pathMatch ? pathMatch[1] : null;
  } catch {
    return null;
  }
}
