import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { MeetingsList } from "@/components/meetings/meetings-list";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 sm:px-0">
        <MeetingsList userEmail={user.email || ""} />
      </div>
    </div>
  );
}
