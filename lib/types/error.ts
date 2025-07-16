export interface ApiError {
  error: string;
  code?: string;
  status: number;
  details?: unknown;
}

export class ApiClientError extends Error {
  constructor(message: string, public status: number, public code?: string, public details?: unknown) {
    super(message);
    this.name = "ApiClientError";
  }
}

export function isApiError(error: unknown): error is ApiError {
  return typeof error === "object" && error !== null && "error" in error && "status" in error;
}

export function parseApiError(response: unknown): string {
  if (isApiError(response)) {
    return response.error;
  }
  if (typeof response === "object" && response !== null && "message" in response) {
    return String(response.message);
  }
  return "An unexpected error occurred";
}
