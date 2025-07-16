import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { Database } from "@/types/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies });
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: meetings, error } = await supabase
      .from("meetings")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json(meetings || []);
  } catch (error) {
    console.error("Error fetching meetings:", error);
    return NextResponse.json({ error: "Failed to fetch meetings" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies });
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { title, description, recorded_at, participants, audio_url } = body;

    // Ensure required fields
    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    const { data: meeting, error } = await supabase
      .from("meetings")
      .insert({
        title,
        description: description || null,
        recorded_at: recorded_at || new Date().toISOString(),
        user_id: user.id,
        participants: participants || [],
        audio_url: audio_url || null,
      })
      .select()
      .single();

    if (error) {
      console.error("Supabase insert error:", error);
      throw error;
    }

    return NextResponse.json(meeting);
  } catch (error) {
    console.error("Error creating meeting:", error);
    return NextResponse.json(
      {
        error: "Failed to create meeting",
        details: (error as Error).message,
      },
      { status: 500 }
    );
  }
}
