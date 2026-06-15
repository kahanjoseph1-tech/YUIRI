"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  LayoutDashboard,
  Users,
  Calendar,
  ClipboardList,
  DollarSign,
  BarChart3,
  Settings,
  GraduationCap,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import type { UserRole } from "@/lib/types";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  readOnly?: boolean;
}

const allNavItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Clients", href: "/clients", icon: Users },
  { label: "Scheduling", href: "/scheduling", icon: Calendar },
  { label: "Evaluations", href: "/evaluations", icon: ClipboardList },
  { label: "Billing", href: "/billing", icon: DollarSign },
  { label: "Reports", href: "/reports", icon: BarChart3 },
  { label: "Settings", href: "/settings/users", icon: Settings },
];

function getNavItemsForRole(role: UserRole): NavItem[] {
  switch (role) {
    case "ADMIN":
      return allNavItems;
    case "SCHEDULER":
      return allNavItems.filter((item) =>
        ["Dashboard", "Clients", "Scheduling"].includes(item.label)
      );
    case "EVALUATOR":
      return allNavItems
        .filter((item) =>
          ["Dashboard", "Scheduling", "Evaluations"].includes(item.label)
        )
        .map((item) =>
          item.label === "Scheduling" ? { ...item, readOnly: true } : item
        );
    case "BILLING":
      return allNavItems.filter((item) =>
        ["Dashboard", "Clients", "Billing"].includes(item.label)
      );
    default:
      return [allNavItems[0]];
  }
}

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);

  const role = (session?.user as any)?.role as UserRole | undefined;
  const navItems = role ? getNavItemsForRole(role) : [allNavItems[0]];

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    if (href === "/settings/users") return pathname.startsWith("/settings");
    return pathname.startsWith(href);
  };

  const sidebarContent = (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex items-center gap-2 px-6 py-5 border-b border-gray-200">
        <GraduationCap className="h-7 w-7" style={{ color: "#1e3a5f" }} />
        <span
          className="text-xl font-bold tracking-tight"
          style={{ color: "#1e3a5f" }}
        >
          Yuiri
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                active
                  ? "text-white"
                  : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
              }`}
              style={active ? { backgroundColor: "#1e3a5f" } : undefined}
            >
              <item.icon className={`h-5 w-5 ${active ? "text-white" : "text-gray-500"}`} />
              <span>{item.label}</span>
              {item.readOnly && (
                <span className="ml-auto text-xs rounded bg-gray-200 px-1.5 py-0.5 text-gray-500">
                  Read-only
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User info */}
      {session?.user && (
        <div className="border-t border-gray-200 px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-gray-900">
                {session.user.name}
              </p>
              {role && (
                <span
                  className="inline-block mt-1 rounded-full px-2 py-0.5 text-xs font-medium text-white"
                  style={{ backgroundColor: "#1e3a5f" }}
                >
                  {role}
                </span>
              )}
            </div>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
              title="Sign out"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="fixed top-4 left-4 z-50 rounded-lg bg-white p-2 shadow-md lg:hidden"
        aria-label="Toggle sidebar"
      >
        {mobileOpen ? (
          <X className="h-5 w-5 text-gray-700" />
        ) : (
          <Menu className="h-5 w-5 text-gray-700" />
        )}
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar - mobile */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-[260px] transform bg-white border-r border-gray-200 transition-transform duration-200 ease-in-out lg:hidden ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Sidebar - desktop */}
      <aside className="hidden lg:flex lg:w-[260px] lg:flex-col lg:fixed lg:inset-y-0 lg:border-r lg:border-gray-200 lg:bg-white">
        {sidebarContent}
      </aside>
    </>
  );
}
