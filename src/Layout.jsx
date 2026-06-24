import React, { useState } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  LayoutDashboard, Users, Calendar, ClipboardList, GraduationCap,
  BriefcaseBusiness, ArrowRightLeft, DollarSign, BarChart3, Settings, Menu, X, LogOut, ChevronDown,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/lib/AuthContext";
import { useRole } from "@/lib/useRole";
import { navItemsForRole } from "@/lib/roles";
import { ROLE_LABELS } from "@/lib/constants";

const YUIRI_LOGO_SRC = "/yuiri-logo.jpg";

const ICONS = {
  LayoutDashboard, Users, Calendar, ClipboardList,
  GraduationCap, BriefcaseBusiness, ArrowRightLeft, DollarSign, BarChart3, Settings,
};

export default function Layout({ children, currentPageName }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, role } = useRole();
  const navItems = navItemsForRole(role);

  return (
    <div className="min-h-screen bg-slate-50">
      <style>{`
        :root {
          --primary: 212 52% 24%;
          --primary-foreground: 0 0% 100%;
          --ring: 217 91% 60%;
        }
        body { font-family: 'Inter', ui-sans-serif, system-ui, sans-serif; }
      `}</style>

      {/* Mobile header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-[#1e3a5f] px-4 h-14 flex items-center justify-between">
        <button onClick={() => setSidebarOpen(true)} className="p-2 -ml-2 rounded-lg hover:bg-white/10 transition-colors">
          <Menu className="w-5 h-5 text-white" />
        </button>
        <div className="flex items-center gap-2">
          <img src={YUIRI_LOGO_SRC} alt="Yuiri Support" className="h-8 w-8 rounded-md bg-white object-cover" />
          <span className="font-bold text-white text-lg tracking-tight">Yuiri</span>
        </div>
        <div className="w-9" />
      </div>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black/30 backdrop-blur-sm" onClick={() => setSidebarOpen(false)}>
          <div className="w-64 h-full" onClick={(e) => e.stopPropagation()}>
            <SidebarContent
              currentPageName={currentPageName} navItems={navItems}
              user={user} role={role} onClose={() => setSidebarOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <div className="hidden lg:block fixed left-0 top-0 bottom-0 w-64 z-40">
        <SidebarContent currentPageName={currentPageName} navItems={navItems} user={user} role={role} />
      </div>

      {/* Main content */}
      <main className="lg:ml-64 pt-14 lg:pt-0 min-h-screen">
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">{children}</div>
      </main>
    </div>
  );
}

function SidebarContent({ currentPageName, navItems, user, role, onClose }) {
  const { logout } = useAuth();
  const roleLabel = ROLE_LABELS[role] || role || "User";
  const name = user?.full_name || user?.name || user?.email || "User";

  return (
    <div className="flex flex-col h-full bg-[#1e3a5f] text-slate-200">
      <div className="px-5 pt-5 pb-4 flex items-center justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <img src={YUIRI_LOGO_SRC} alt="Yuiri Support" className="h-12 w-12 rounded-lg bg-white object-cover" />
          <div className="min-w-0">
            <h1 className="font-bold text-white text-2xl tracking-tight leading-none">Yuiri</h1>
            <p className="text-[10px] text-blue-200/70 font-medium tracking-widest uppercase mt-1">
              Support CRM
            </p>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 lg:hidden">
            <X className="w-4 h-4 text-white" />
          </button>
        )}
      </div>

      <nav className="px-3 mt-2 flex-1 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = ICONS[item.icon] || LayoutDashboard;
          const isActive = currentPageName === item.key;
          return (
            <Link
              key={item.key}
              to={createPageUrl(item.key)}
              onClick={onClose}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-blue-600 text-white"
                  : "text-blue-100/80 hover:text-white hover:bg-white/10"
              }`}
            >
              <Icon className="w-[18px] h-[18px]" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-white/10">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-3 w-full px-2 py-2 rounded-lg hover:bg-white/10 transition-colors text-left">
              <div className="w-9 h-9 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
                {(name[0] || "U").toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{name}</p>
                <p className="text-[11px] text-blue-200/70 truncate">{roleLabel}</p>
              </div>
              <ChevronDown className="w-4 h-4 text-blue-200/70" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel className="truncate">{user?.email || name}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => logout()} className="text-red-600 focus:text-red-600">
              <LogOut className="w-4 h-4 mr-2" /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
