import { NextRequest } from "next/server";
import { apiError } from "@/lib/api/response";

interface RateLimitConfig {
  requests: number;
  window: number;
}

const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rateLimitStore.entries()) {
    if (value.resetAt < now) {
      rateLimitStore.delete(key);
    }
  }
}, 60000);

export function rateLimit(config: RateLimitConfig) {
  return async function checkRateLimit(request: NextRequest, identifier?: string): Promise<Response | null> {
    const clientId =
      identifier || request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "anonymous";

    const now = Date.now();
    const windowMs = config.window * 1000;
    const resetAt = now + windowMs;

    const current = rateLimitStore.get(clientId);

    if (!current || current.resetAt < now) {
      rateLimitStore.set(clientId, { count: 1, resetAt });
      return null;
    }

    if (current.count >= config.requests) {
      const retryAfter = Math.ceil((current.resetAt - now) / 1000);

      return apiError("Too many requests", 429, "RATE_LIMIT_EXCEEDED", {
        retryAfter,
        limit: config.requests,
        window: config.window,
      });
    }

    current.count++;
    return null;
  };
}

export const rateLimiters = {
  publicAnnotations: rateLimit({
    requests: 30,
    window: 60,
  }),

  publicNotes: rateLimit({
    requests: 60,
    window: 60,
  }),

  upload: rateLimit({
    requests: 10,
    window: 3600,
  }),

  transcription: rateLimit({
    requests: 5,
    window: 3600,
  }),

  sharing: rateLimit({
    requests: 20,
    window: 3600,
  }),
};
