import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { MeetingsList } from "@/components/meetings/meetings-list";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function DashboardPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Sync user to Prisma database
  let dbUser = await prisma.user.findUnique({
    where: { id: user.id },
  });

  if (!dbUser) {
    dbUser = await prisma.user.create({
      data: {
        id: user.id,
        email: user.email,
      },
    });
  }

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 sm:px-0">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Your Meetings</h1>
            <p className="mt-2 text-gray-600">Welcome back, {user.email}!</p>
          </div>
          <Link href="/dashboard/upload">
            <Button>Upload Recording</Button>
          </Link>
        </div>

        <MeetingsList />
      </div>
    </div>
  );
}
