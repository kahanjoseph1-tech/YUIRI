"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Users, Calendar, ClipboardList, DollarSign, AlertCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/use-toast";
import type { DashboardStats } from "@/lib/types";

interface Activity {
  id: string;
  type: string;
  description: string;
  createdAt: string;
}

const summaryCards = [
  {
    key: "newLeads" as const,
    label: "New Leads",
    icon: Users,
    bg: "bg-blue-500",
    href: "/clients?status=NEW_LEAD",
  },
  {
    key: "upcomingAppointments" as const,
    label: "Upcoming Appointments",
    icon: Calendar,
    bg: "bg-green-500",
    href: "/appointments",
  },
  {
    key: "pendingFollowUps" as const,
    label: "Pending Follow-Ups",
    icon: ClipboardList,
    bg: "bg-yellow-500",
    href: "/appointments?type=FOLLOW_UP",
  },
  {
    key: "readyToBill" as const,
    label: "Ready to Bill",
    icon: DollarSign,
    bg: "bg-orange-500",
    href: "/billing?status=NOT_BILLED",
  },
  {
    key: "unpaidTotal" as const,
    label: "Unpaid Total",
    icon: DollarSign,
    bg: "bg-red-500",
    href: "/billing?status=INVOICE_SENT",
  },
];

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

export default function DashboardPage() {
  const { toast } = useToast();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboard() {
      try {
        const res = await fetch("/api/dashboard");
        if (!res.ok) throw new Error("Failed to load dashboard data");
        const data = await res.json();
        setStats(data.stats ?? data);
        setActivities(data.recentActivity ?? []);
      } catch {
        toast({
          title: "Error",
          description: "Could not load dashboard data. Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    }
    fetchDashboard();
  }, [toast]);

  const visibleCards = summaryCards;

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-[#1e3a5f]">Dashboard</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-[#1e3a5f]">Dashboard</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
        {visibleCards.map((card) => {
          const Icon = card.icon;
          const value = stats ? stats[card.key] : 0;
          const displayValue =
            card.key === "unpaidTotal" ? formatCurrency(value) : value;

          return (
            <Link key={card.key} href={card.href}>
              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div
                      className={`${card.bg} rounded-lg p-3 text-white flex-shrink-0`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm text-muted-foreground truncate">
                        {card.label}
                      </p>
                      <p className="text-2xl font-bold">{displayValue}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {activities.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <AlertCircle className="h-8 w-8 mb-2" />
              <p>No recent activity to show.</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {activities.map((activity) => (
                <li
                  key={activity.id}
                  className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0"
                >
                  <div className="flex items-center gap-3">
                    <Badge variant="outline">{activity.type}</Badge>
                    <span className="text-sm">{activity.description}</span>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap ml-4">
                    {formatDistanceToNow(new Date(activity.createdAt), {
                      addSuffix: true,
                    })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
