import React, { useEffect, useMemo, useRef, useState } from "react";
import { firebaseClient } from "@/api/firebaseClient";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  UserPlus, CalendarClock, ClipboardList, BadgeDollarSign, Receipt, Activity,
} from "lucide-react";
import { useRole } from "@/lib/useRole";
import { fmtCurrency, fmtDateTime, toDate } from "@/lib/format";
import { Skeleton } from "@/components/ui/skeleton";
import ClientQuickProfileDialog from "@/components/clients/ClientQuickProfileDialog";
import { syncDueEvaluationAppointments } from "@/lib/automations";

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
  const queryClient = useQueryClient();
  const { canAccessPage } = useRole();
  const [profileClient, setProfileClient] = useState(null);
  const lastSyncKeyRef = useRef("");

  const { data: clients = [], isLoading: l1 } = useQuery({
    queryKey: ["clients"], queryFn: () => firebaseClient.entities.Client.list("-created_date", 500),
    refetchInterval: 30000,
  });
  const { data: appointments = [], isLoading: l2 } = useQuery({
    queryKey: ["appointments"], queryFn: () => firebaseClient.entities.Appointment.list("-date_time", 500),
    refetchInterval: 30000,
  });
  const { data: evaluations = [], isLoading: l3 } = useQuery({
    queryKey: ["evaluations"], queryFn: () => firebaseClient.entities.Evaluation.list("-created_date", 500),
    refetchInterval: 30000,
  });
  const { data: billing = [], isLoading: l4 } = useQuery({
    queryKey: ["billing"], queryFn: () => firebaseClient.entities.BillingRecord.list("-created_date", 500),
    refetchInterval: 30000,
  });

  const loading = l1 || l2 || l3 || l4;

  const dueSyncKey = useMemo(
    () => appointments
      .filter((appointment) => (appointment.meeting_type || "Evaluation") === "Evaluation")
      .map((appointment) => `${appointment.id}:${appointment.date_time}:${appointment.status}`)
      .join("|"),
    [appointments]
  );

  useEffect(() => {
    if (l2 || !dueSyncKey || lastSyncKeyRef.current === dueSyncKey) return;
    lastSyncKeyRef.current = dueSyncKey;

    syncDueEvaluationAppointments(appointments)
      .then((syncedCount) => {
        if (syncedCount > 0) {
          queryClient.invalidateQueries({ queryKey: ["evaluations"] });
          queryClient.invalidateQueries({ queryKey: ["clients"] });
          queryClient.invalidateQueries({ queryKey: ["billing"] });
        }
      })
      .catch((error) => {
        console.error("Due evaluation sync failed:", error);
      });
  }, [appointments, dueSyncKey, l2, queryClient]);

  const newClients = clients.filter((c) => c.status === "New Client").length;
  const now = new Date();
  const in7 = new Date(now.getTime() + 7 * 86400000);
  const upcoming = appointments.filter((a) => {
    const d = toDate(a.date_time);
    return !["Cancelled", "Completed", "No Show"].includes(a.status) && d && d >= now && d <= in7;
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

  const clientById = new Map(clients.map((client) => [client.id, client]));

  // Recent activity feed across entities.
  const activity = [
    ...appointments.map((a) => ({
      ts: a.updated_date || a.created_date || a.date_time,
      client_id: a.client_id,
      text: `Appointment · ${a.client_name || "Client"} (${a.meeting_type || "Meeting"})`,
      right: a.date_time ? `Appointment: ${fmtDateTime(a.date_time)}` : fmtDateTime(a.created_date),
    })),
    ...evaluations.map((e) => ({
      ts: e.updated_date || e.created_date,
      client_id: e.client_id,
      text: `Evaluation · ${e.client_name || "Client"}`,
      right: fmtDateTime(e.updated_date || e.created_date),
    })),
    ...billing.map((b) => ({
      ts: b.updated_date || b.created_date,
      client_id: b.client_id,
      text: `Billing · ${b.client_name || "Client"} (${b.service_type || "Service"})`,
      right: fmtDateTime(b.updated_date || b.created_date),
    })),
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
            {activity.map((a, i) => {
              const client = clientById.get(a.client_id);
              return (
                <button
                  key={i}
                  type="button"
                  className={`flex w-full items-center justify-between gap-4 px-5 py-3 text-left ${client ? "hover:bg-gray-50" : ""}`}
                  onClick={() => client && setProfileClient(client)}
                  disabled={!client}
                >
                  <p className="min-w-0 text-sm text-gray-700">{a.text}</p>
                  <span className="shrink-0 text-xs text-gray-400">{a.right}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <ClientQuickProfileDialog
        open={!!profileClient}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setProfileClient(null);
        }}
        client={profileClient}
      />
    </div>
  );
}
