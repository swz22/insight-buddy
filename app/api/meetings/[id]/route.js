import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export async function GET(request, { params }) {
  try {
    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const meeting = await prisma.meeting.findFirst({
      where: {
        id: params.id,
        userId: user.id,
      },
    });

    if (!meeting) {
      return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
    }

    return NextResponse.json(meeting);
  } catch (error) {
    console.error("Error fetching meeting:", error);
    return NextResponse.json({ error: "Failed to fetch meeting" }, { status: 500 });
  }
}

export async function PATCH(request, { params }) {
  try {
    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    const meeting = await prisma.meeting.updateMany({
      where: {
        id: params.id,
        userId: user.id,
      },
      data: body,
    });

    if (meeting.count === 0) {
      return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
    }

    const updatedMeeting = await prisma.meeting.findUnique({
      where: { id: params.id },
    });

    return NextResponse.json(updatedMeeting);
  } catch (error) {
    console.error("Error updating meeting:", error);
    return NextResponse.json({ error: "Failed to update meeting" }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const meeting = await prisma.meeting.deleteMany({
      where: {
        id: params.id,
        userId: user.id,
      },
    });

    if (meeting.count === 0) {
      return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting meeting:", error);
    return NextResponse.json({ error: "Failed to delete meeting" }, { status: 500 });
  }
}
