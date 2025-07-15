import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { Database } from "@/types/supabase";

export async function POST(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const cookieStore = await cookies();
  const supabase = createRouteHandlerClient < Database > { cookies: () => cookieStore };

  await supabase.auth.signOut();

  return NextResponse.redirect(`${requestUrl.origin}/login`, {
    status: 301,
  });
}
