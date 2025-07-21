import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ReactNode } from "react";

interface DashboardLayoutProps {
  children: ReactNode;
}

export default async function DashboardLayout({ children }: DashboardLayoutProps) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <>
      <div className="min-h-screen bg-black relative">
        <nav className="glass border-b border-white/[0.05] sticky top-0 z-50 backdrop-blur-md">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center">
                <h1 className="text-xl font-bold font-display">
                  <span className="text-white">Insight</span> <span className="gradient-text glow-text">Buddy</span>
                </h1>
              </div>
              <div className="flex items-center">
                <form action="/api/auth/signout" method="post">
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm text-white/60 hover:text-white/90 hover:bg-white/5 rounded-lg transition-all duration-200"
                  >
                    Sign out
                  </button>
                </form>
              </div>
            </div>
          </div>
        </nav>
        <main className="relative z-10">{children}</main>
      </div>
    </>
  );
}
