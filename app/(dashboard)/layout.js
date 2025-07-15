import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";

export default async function DashboardLayout({ children }) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold">Insight Buddy</h1>
            </div>
            <div className="flex items-center">
              <form action="/api/auth/signout" method="post">
                <button className="text-gray-500 hover:text-gray-700">Sign out</button>
              </form>
            </div>
          </div>
        </div>
      </nav>
      {children}
    </div>
  );
}
