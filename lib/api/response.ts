import { NextResponse } from "next/server";
import { ApiError } from "@/lib/types/error";

export function apiError(
  error: string,
  status: number = 500,
  code?: string,
  details?: unknown
): NextResponse<ApiError> {
  return NextResponse.json(
    {
      error,
      status,
      code,
      details,
    },
    { status }
  );
}

export function apiSuccess<T>(data: T, status: number = 200): NextResponse<T> {
  return NextResponse.json(data, { status });
}
