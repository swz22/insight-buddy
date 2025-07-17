import { z } from "zod";
import { apiError } from "@/lib/api/response";
import { NextResponse } from "next/server";

export function validateRequest<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: NextResponse } {
  try {
    const validated = schema.parse(data);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const message = error.issues.map((e) => `${e.path.join(".")}: ${e.message}`).join(", ");
      return {
        success: false,
        error: apiError(message, 400, "VALIDATION_ERROR", error.issues),
      };
    }
    return {
      success: false,
      error: apiError("Invalid request data", 400, "VALIDATION_ERROR"),
    };
  }
}

export function parseApiResponse<T>(schema: z.ZodSchema<T>, data: unknown): T {
  try {
    return schema.parse(data);
  } catch (error) {
    console.error("API response validation failed:", error);
    throw new Error("Invalid API response format");
  }
}
