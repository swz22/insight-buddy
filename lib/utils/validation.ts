export const ALLOWED_MIME_TYPES = [
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/x-wav",
  "audio/m4a",
  "audio/x-m4a",
  "audio/webm",
  "video/mp4",
  "video/webm",
  "video/quicktime",
] as const;

export const MAX_FILE_SIZE = 500 * 1024 * 1024;

export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

export function validateUploadedFile(file: { type: string; size: number; name: string }): FileValidationResult {
  if (!ALLOWED_MIME_TYPES.includes(file.type as any)) {
    return {
      valid: false,
      error: `Invalid file type: ${file.type}. Allowed types: audio (MP3, WAV, M4A) and video (MP4, WebM)`,
    };
  }

  if (file.size > MAX_FILE_SIZE) {
    const sizeMB = Math.round(file.size / (1024 * 1024));
    return {
      valid: false,
      error: `File too large: ${sizeMB}MB. Maximum size is 500MB`,
    };
  }

  const extension = file.name.split(".").pop()?.toLowerCase();
  const expectedExtensions: Record<string, string[]> = {
    "audio/mpeg": ["mp3"],
    "audio/mp3": ["mp3"],
    "audio/wav": ["wav"],
    "audio/x-wav": ["wav"],
    "audio/m4a": ["m4a"],
    "audio/x-m4a": ["m4a"],
    "audio/webm": ["webm"],
    "video/mp4": ["mp4"],
    "video/webm": ["webm"],
    "video/quicktime": ["mov"],
  };

  const validExtensions = expectedExtensions[file.type];
  if (validExtensions && extension && !validExtensions.includes(extension)) {
    return {
      valid: false,
      error: `File extension .${extension} doesn't match file type ${file.type}`,
    };
  }

  return { valid: true };
}

export function sanitizeFileName(fileName: string): string {
  return fileName
    .replace(/[^a-zA-Z0-9.-]/g, "_")
    .replace(/\.{2,}/g, ".")
    .substring(0, 255); // Limit length
}
