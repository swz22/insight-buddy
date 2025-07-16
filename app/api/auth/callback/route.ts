import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");

  if (code) {
    try {
      const supabase = await createClient();

      const { error } = await supabase.auth.exchangeCodeForSession(code);

      if (error) {
        console.error("Error exchanging code for session:", error);
        return NextResponse.redirect(`${requestUrl.origin}/login?error=auth_failed`);
      }
    } catch (error) {
      console.error("Callback error:", error);
      return NextResponse.redirect(`${requestUrl.origin}/login?error=callback_error`);
    }
  }

  // Always redirect to dashboard after processing
  return NextResponse.redirect(`${requestUrl.origin}/dashboard`);
}
