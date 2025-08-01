interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

export class RateLimiter {
  private limits: Map<string, RateLimitEntry> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(private config: RateLimitConfig) {
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60000);
  }

  canMakeRequest(key: string): boolean {
    const now = Date.now();
    const entry = this.limits.get(key);

    if (!entry || now >= entry.resetTime) {
      this.limits.set(key, {
        count: 1,
        resetTime: now + this.config.windowMs,
      });
      return true;
    }

    if (entry.count >= this.config.maxRequests) {
      return false;
    }

    entry.count++;
    return true;
  }

  getRemainingRequests(key: string): number {
    const entry = this.limits.get(key);
    if (!entry || Date.now() >= entry.resetTime) {
      return this.config.maxRequests;
    }
    return Math.max(0, this.config.maxRequests - entry.count);
  }

  getResetTime(key: string): number {
    const entry = this.limits.get(key);
    return entry ? entry.resetTime : Date.now();
  }

  private cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.limits.entries()) {
      if (now >= entry.resetTime) {
        this.limits.delete(key);
      }
    }
  }

  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.limits.clear();
  }
}

export const rateLimiters = {
  annotations: new RateLimiter({
    maxRequests: 30,
    windowMs: 60000,
  }),

  presence: new RateLimiter({
    maxRequests: 120,
    windowMs: 60000,
  }),

  notes: new RateLimiter({
    maxRequests: 60,
    windowMs: 60000,
  }),
};

if (typeof window !== "undefined") {
  window.addEventListener("beforeunload", () => {
    Object.values(rateLimiters).forEach((limiter) => limiter.destroy());
  });
}
