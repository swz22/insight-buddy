import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ReactNode } from "react";
import { Home, Upload, BarChart3, LogOut } from "lucide-react";
import Link from "next/link";

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

  const navItems = [
    { href: "/dashboard", icon: Home, label: "Dashboard" },
    { href: "/dashboard/analytics", icon: BarChart3, label: "Analytics" },
    { href: "/dashboard/upload", icon: Upload, label: "Upload" },
  ];

  return (
    <>
      <div className="min-h-screen bg-black relative">
        <div className="fixed inset-0 bg-gradient-to-br from-purple-900/5 via-black to-cyan-900/5 pointer-events-none" />

        {/* Navigation */}
        <nav className="sticky top-0 z-50 bg-black/50 backdrop-blur-xl border-b border-white/[0.06]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center gap-8">
                {/* Logo */}
                <Link href="/dashboard" className="flex items-center group">
                  <h1 className="text-xl font-bold font-display">
                    <span className="text-white group-hover:text-white/90 transition-colors">Insight</span>{" "}
                    <span className="gradient-text">Buddy</span>
                  </h1>
                </Link>

                {/* Navigation Items */}
                <div className="hidden md:flex items-center gap-1">
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-white/60 hover:text-white hover:bg-white/[0.06] transition-all duration-200 group"
                      >
                        <Icon className="w-4 h-4 group-hover:scale-110 transition-transform" />
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>

              {/* User menu */}
              <div className="flex items-center gap-4">
                {/* User email */}
                <div className="hidden sm:block">
                  <p className="text-sm text-white/40">{user.email}</p>
                </div>

                {/* Sign out button */}
                <form action="/api/auth/signout" method="post">
                  <button
                    type="submit"
                    className="flex items-center gap-2 px-4 py-2 text-sm text-white/60 hover:text-white hover:bg-white/[0.06] rounded-lg transition-all duration-200 group"
                  >
                    <LogOut className="w-4 h-4 group-hover:scale-110 group-hover:rotate-12 transition-all" />
                    <span className="hidden sm:inline">Sign out</span>
                  </button>
                </form>
              </div>
            </div>
          </div>

          {/* Mobile navigation */}
          <div className="flex md:hidden px-4 pb-3 gap-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm text-white/60 hover:text-white hover:bg-white/[0.06] transition-all duration-200 flex-1"
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Main content */}
        <main className="relative z-10">{children}</main>
      </div>
    </>
  );
}
