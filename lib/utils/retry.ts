interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  shouldRetry?: (error: unknown) => boolean;
}

export async function withRetry<T>(fn: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    backoffMultiplier = 2,
    shouldRetry = (error) => {
      if (error instanceof Error) {
        return (
          error.message.includes("fetch failed") ||
          error.message.includes("socket") ||
          error.message.includes("ECONNRESET") ||
          error.message.includes("timeout")
        );
      }
      return false;
    },
  } = options;

  let lastError: unknown;
  let delay = initialDelay;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt === maxRetries || !shouldRetry(error)) {
        throw error;
      }

      await new Promise((resolve) => setTimeout(resolve, delay));

      delay = Math.min(delay * backoffMultiplier, maxDelay);
    }
  }

  throw lastError;
}
