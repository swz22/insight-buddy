"use client";

import { useAuth } from "@/hooks/use-auth";
import { MeetingsList } from "@/components/meetings/meetings-list";
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardPage() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black">
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <Skeleton className="h-10 w-48 mb-8" />
          <div className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Background gradient effects */}
      <div className="absolute inset-0">
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
      
      <div className="relative z-10 max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <MeetingsList userEmail={user.email || ""} />
      </div>
    </div>
  );
}