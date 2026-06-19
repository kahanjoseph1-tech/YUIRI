import React from "react";
import { firebaseClient } from "@/api/firebaseClient";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  UserPlus, CalendarClock, ClipboardList, BadgeDollarSign, Receipt, Activity,
} from "lucide-react";
import { useRole } from "@/lib/useRole";
import { fmtCurrency, fmtDateTime, toDate } from "@/lib/format";
import { Skeleton } from "@/components/ui/skeleton";

function StatCard({ to, title, value, icon: Icon, color }) {
  const colors = {
    blue: "bg-blue-50 text-blue-600",
    amber: "bg-amber-50 text-amber-600",
    violet: "bg-violet-50 text-violet-600",
    emerald: "bg-emerald-50 text-emerald-600",
    red: "bg-red-50 text-red-600",
  };
  return (
    <Link to={to} className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-lg hover:shadow-gray-100/60 transition-all duration-300 block">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
        </div>
        <div className={`p-3 rounded-xl ${colors[color]}`}><Icon className="w-5 h-5" /></div>
      </div>
    </Link>
  );
}

export default function Dashboard() {
  const { role, canAccessPage } = useRole();

  const { data: clients = [], isLoading: l1 } = useQuery({
    queryKey: ["clients"], queryFn: () => firebaseClient.entities.Client.list("-created_date", 500),
  });
  const { data: appointments = [], isLoading: l2 } = useQuery({
    queryKey: ["appointments"], queryFn: () => firebaseClient.entities.Appointment.list("-date_time", 500),
  });
  const { data: evaluations = [], isLoading: l3 } = useQuery({
    queryKey: ["evaluations"], queryFn: () => firebaseClient.entities.Evaluation.list("-created_date", 500),
  });
  const { data: billing = [], isLoading: l4 } = useQuery({
    queryKey: ["billing"], queryFn: () => firebaseClient.entities.BillingRecord.list("-created_date", 500),
  });

  const loading = l1 || l2 || l3 || l4;

  const newClients = clients.filter((c) => c.status === "New Client").length;
  const now = new Date();
  const in7 = new Date(now.getTime() + 7 * 86400000);
  const upcoming = appointments.filter((a) => {
    const d = toDate(a.date_time);
    return a.status === "Scheduled" && d && d >= now && d <= in7;
  }).length;
  const pendingEvals = evaluations.filter((e) => e.status === "Pending" || e.status === "In Progress").length;
  const readyToBill = clients.filter((c) => c.ready_to_bill).length;
  const unpaidTotal = billing
    .filter((b) => b.billing_status === "Invoice Sent" || b.billing_status === "Partially Paid")
    .reduce((s, b) => s + (Number(b.amount) || 0), 0);

  const cards = [
    { key: "Clients", to: `${createPageUrl("Clients")}?status=New%20Client`, title: "New Clients", value: newClients, icon: UserPlus, color: "blue" },
    { key: "Appointments", to: createPageUrl("Appointments"), title: "Upcoming (7d)", value: upcoming, icon: CalendarClock, color: "amber" },
    { key: "Evaluations", to: createPageUrl("Evaluations"), title: "Pending Evals", value: pendingEvals, icon: ClipboardList, color: "violet" },
    { key: "Clients", to: `${createPageUrl("Clients")}?ready=1`, title: "Ready to Bill", value: readyToBill, icon: BadgeDollarSign, color: "emerald" },
    { key: "Billing", to: createPageUrl("Billing"), title: "Unpaid Invoices", value: fmtCurrency(unpaidTotal), icon: Receipt, color: "red" },
  ].filter((c) => canAccessPage(c.key));

  // Recent activity feed across entities.
  const activity = [
    ...appointments.map((a) => ({ ts: a.created_date, text: `Appointment · ${a.client_name || "Client"} (${a.meeting_type || "Meeting"})`, status: a.status })),
    ...evaluations.map((e) => ({ ts: e.created_date, text: `Evaluation · ${e.client_name || "Client"}`, status: e.status })),
    ...billing.map((b) => ({ ts: b.created_date, text: `Billing · ${b.client_name || "Client"} (${b.service_type || "Service"})`, status: b.billing_status })),
  ].filter((x) => x.ts).sort((a, b) => new Date(b.ts) - new Date(a.ts)).slice(0, 12);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Overview of your placement pipeline</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {cards.map((c, i) => <StatCard key={i} {...c} />)}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100">
        <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-2">
          <Activity className="w-4 h-4 text-gray-400" />
          <h2 className="font-semibold text-gray-900">Recent Activity</h2>
        </div>
        {loading ? (
          <div className="p-5 space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-6" />)}</div>
        ) : activity.length === 0 ? (
          <p className="text-sm text-gray-400 p-8 text-center">No activity yet.</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {activity.map((a, i) => (
              <div key={i} className="flex items-center justify-between px-5 py-3">
                <p className="text-sm text-gray-700">{a.text}</p>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-400">{fmtDateTime(a.ts)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
