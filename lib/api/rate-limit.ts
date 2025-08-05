import { NextRequest, NextResponse } from "next/server";
import { apiError } from "./response";

interface RateLimitConfig {
  interval: number;
  maxRequests: number;
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

class RateLimiter {
  private limits: Map<string, RateLimitEntry> = new Map();
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = config;
  }

  check(key: string): boolean {
    const now = Date.now();
    const entry = this.limits.get(key);

    if (!entry || now > entry.resetTime) {
      this.limits.set(key, {
        count: 1,
        resetTime: now + this.config.interval,
      });
      return true;
    }

    if (entry.count >= this.config.maxRequests) {
      return false;
    }

    entry.count++;
    return true;
  }

  cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.limits.entries()) {
      if (now > entry.resetTime) {
        this.limits.delete(key);
      }
    }
  }
}

const limiters = {
  // Public endpoints
  publicAnnotations: new RateLimiter({ interval: 60000, maxRequests: 30 }),
  publicNotes: new RateLimiter({ interval: 60000, maxRequests: 60 }),
  publicShares: new RateLimiter({ interval: 60000, maxRequests: 10 }),

  // Authenticated endpoints
  meetings: new RateLimiter({ interval: 60000, maxRequests: 60 }),
  upload: new RateLimiter({ interval: 300000, maxRequests: 10 }),
  transcribe: new RateLimiter({ interval: 3600000, maxRequests: 20 }),
};

setInterval(() => {
  Object.values(limiters).forEach((limiter) => limiter.cleanup());
}, 300000);

export const rateLimiters = {
  publicAnnotations: async (request: NextRequest, shareToken: string) => {
    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
    const key = `${ip}-${shareToken}`;

    if (!limiters.publicAnnotations.check(key)) {
      return apiError("Rate limit exceeded", 429, "RATE_LIMIT");
    }
    return null;
  },

  publicNotes: async (request: NextRequest, shareToken: string) => {
    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
    const key = `${ip}-${shareToken}`;

    if (!limiters.publicNotes.check(key)) {
      return apiError("Rate limit exceeded", 429, "RATE_LIMIT");
    }
    return null;
  },

  publicShares: async (request: NextRequest, shareToken: string) => {
    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
    const key = `${ip}-${shareToken}`;

    if (!limiters.publicShares.check(key)) {
      return apiError("Rate limit exceeded", 429, "RATE_LIMIT");
    }
    return null;
  },

  meetings: async (request: NextRequest, userId: string) => {
    const key = `user-${userId}`;

    if (!limiters.meetings.check(key)) {
      return apiError("Rate limit exceeded", 429, "RATE_LIMIT");
    }
    return null;
  },

  upload: async (request: NextRequest, userId: string) => {
    const key = `upload-${userId}`;

    if (!limiters.upload.check(key)) {
      return apiError("Upload rate limit exceeded", 429, "RATE_LIMIT");
    }
    return null;
  },

  transcribe: async (request: NextRequest, userId: string) => {
    const key = `transcribe-${userId}`;

    if (!limiters.transcribe.check(key)) {
      return apiError("Transcription rate limit exceeded", 429, "RATE_LIMIT");
    }
    return null;
  },
};
