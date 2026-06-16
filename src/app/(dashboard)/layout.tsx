"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { Sidebar } from "@/components/sidebar";
import { GraduationCap, Clock, LogOut } from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, loading, approvalStatus, signOut } = useAuth();

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-sm text-gray-500">Loading...</div>
      </div>
    );
  }

  if (approvalStatus === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-sm text-gray-500">Checking access...</div>
      </div>
    );
  }

  if (approvalStatus === "pending") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-yellow-100">
            <Clock className="h-8 w-8 text-yellow-600" />
          </div>
          <h1 className="mt-6 text-2xl font-bold text-gray-900">Access Pending</h1>
          <p className="mt-3 text-gray-600">
            Your account <strong>{user.email}</strong> is awaiting approval from the administrator.
          </p>
          <p className="mt-2 text-sm text-gray-500">
            You&apos;ll be able to access Yuiri once your request is approved.
          </p>
          <div className="mt-8 flex items-center justify-center gap-2">
            <GraduationCap className="h-5 w-5" style={{ color: "#1e3a5f" }} />
            <span className="text-sm font-medium" style={{ color: "#1e3a5f" }}>
              Yuiri CRM
            </span>
          </div>
          <button
            onClick={async () => {
              await signOut();
              router.push("/login");
            }}
            className="mt-4 inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <main className="lg:pl-[260px]">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>
    </div>
  );
}
