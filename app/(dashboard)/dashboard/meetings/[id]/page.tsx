import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { MeetingDetail } from "@/components/meetings/meeting-detail";

interface MeetingPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function MeetingPage({ params: paramsPromise }: MeetingPageProps) {
  const params = await paramsPromise;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: meeting, error } = await supabase
    .from("meetings")
    .select("*")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .single();

  if (error || !meeting) {
    redirect("/dashboard");
  }

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <MeetingDetail meeting={meeting} />
    </div>
  );
}
