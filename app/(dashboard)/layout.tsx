"use client";

import Link from "next/link";
import { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { LogOut, BarChart3, Upload, Home } from "lucide-react";
import { cn } from "@/lib/utils";

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname();
  const isMeetingDetailPage = pathname.includes("/dashboard/meetings/") && pathname.split("/").length > 3;
  const navbarMaxWidth = isMeetingDetailPage ? "max-w-[1600px]" : "max-w-7xl";

  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: Home },
    { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
    { href: "/dashboard/upload", label: "Upload", icon: Upload },
  ];

  return (
    <>
      <div className="min-h-screen bg-black text-white">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-20 left-20 w-72 h-72 bg-purple-600 rounded-full filter blur-[128px] opacity-20 animate-pulse"></div>
          <div
            className="absolute top-40 right-20 w-96 h-96 bg-cyan-600 rounded-full filter blur-[128px] opacity-20 animate-pulse"
            style={{ animationDelay: "2s" }}
          ></div>
          <div
            className="absolute bottom-20 left-1/2 w-80 h-80 bg-blue-600 rounded-full filter blur-[128px] opacity-20 animate-pulse"
            style={{ animationDelay: "4s" }}
          ></div>
        </div>

        <nav className="relative z-20 bg-black/60 backdrop-blur-xl border-b border-white/10">
          <div className={cn(navbarMaxWidth, "mx-auto transition-all duration-300")}>
            <div className="flex items-center justify-between px-4 sm:px-6 lg:px-8 py-4">
              <Link href="/dashboard" className="flex items-center gap-3 group">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-cyan-600 rounded-xl blur-md opacity-60 group-hover:opacity-100 transition-opacity"></div>
                  <div className="relative w-10 h-10 bg-gradient-to-r from-purple-600 to-cyan-600 rounded-xl flex items-center justify-center">
                    <span className="text-white font-bold text-xl">IB</span>
                  </div>
                </div>
                <h1 className="text-2xl font-bold font-display">
                  <span className="text-white">Insight</span> <span className="gradient-text">Buddy</span>
                </h1>
              </Link>

              <div className="hidden md:flex items-center gap-4">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "relative flex items-center gap-2 px-4 py-2 text-sm rounded-lg transition-all duration-200 group",
                        isActive ? "text-white bg-white/[0.08]" : "text-white/60 hover:text-white hover:bg-white/[0.06]"
                      )}
                    >
                      <Icon className={cn("w-4 h-4 transition-all", isActive ? "" : "group-hover:scale-110")} />
                      <span className="hidden sm:inline">{item.label}</span>
                      {isActive && (
                        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-0.5 bg-gradient-to-r from-purple-400 to-cyan-400 rounded-full" />
                      )}
                    </Link>
                  );
                })}

                <form action="/api/auth/signout" method="post">
                  <button
                    type="submit"
                    className="flex items-center gap-2 px-4 py-2 text-sm text-white/60 hover:text-white hover:bg-white/[0.06] rounded-lg transition-all duration-200 group"
                  >
                    <LogOut className="w-4 h-4 group-hover:scale-110 transition-all" />
                    <span className="hidden sm:inline">Sign out</span>
                  </button>
                </form>
              </div>
            </div>
          </div>

          <div className={cn("flex md:hidden px-4 pb-3 gap-2", navbarMaxWidth, "mx-auto")}>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "relative flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm transition-all duration-200 flex-1",
                    isActive ? "text-white bg-white/[0.08]" : "text-white/60 hover:text-white hover:bg-white/[0.06]"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                  {isActive && (
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-gradient-to-r from-purple-400 to-cyan-400 rounded-full" />
                  )}
                </Link>
              );
            })}
          </div>
        </nav>

        <main className="relative z-10">{children}</main>
      </div>
    </>
  );
}