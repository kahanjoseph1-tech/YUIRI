import React, { useMemo } from "react";
import { firebaseClient } from "@/api/firebaseClient";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from "recharts";
import { format, parseISO } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { CLIENT_STATUSES } from "@/lib/constants";
import { fmtCurrency } from "@/lib/format";

const COLORS = ["#1e3a5f", "#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ef4444", "#06b6d4", "#ec4899", "#64748b", "#84cc16"];

function ChartCard({ title, children }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <h2 className="font-semibold text-gray-900 mb-4">{title}</h2>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">{children}</ResponsiveContainer>
      </div>
    </div>
  );
}

export default function Reports() {
  const { data: clients = [], isLoading: l1 } = useQuery({ queryKey: ["clients"], queryFn: () => firebaseClient.entities.Client.list("-created_date", 1000) });
  const { data: appointments = [], isLoading: l2 } = useQuery({ queryKey: ["appointments"], queryFn: () => firebaseClient.entities.Appointment.list("-date_time", 1000) });
  const { data: evaluations = [], isLoading: l3 } = useQuery({ queryKey: ["evaluations"], queryFn: () => firebaseClient.entities.Evaluation.list("-created_date", 1000) });
  const { data: billing = [], isLoading: l4 } = useQuery({ queryKey: ["billing"], queryFn: () => firebaseClient.entities.BillingRecord.list("-created_date", 1000) });
  const { data: placements = [], isLoading: l5 } = useQuery({ queryKey: ["placements"], queryFn: () => firebaseClient.entities.Placement.list("-created_date", 1000) });
  const { data: schools = [] } = useQuery({ queryKey: ["schools"], queryFn: () => firebaseClient.entities.School.list("-created_date", 1000) });

  const loading = l1 || l2 || l3 || l4 || l5;

  const clientsByStatus = useMemo(
    () => CLIENT_STATUSES.map((s) => ({ name: s, count: clients.filter((c) => c.status === s).length })),
    [clients]
  );

  const apptsByMonth = useMemo(() => {
    const map = {};
    appointments.forEach((a) => {
      if (!a.date_time) return;
      const d = parseISO(a.date_time);
      if (Number.isNaN(d.getTime())) return;
      const key = format(d, "MMM yyyy");
      map[key] = (map[key] || 0) + 1;
    });
    return Object.entries(map)
      .map(([name, count]) => ({ name, count, ts: new Date(name).getTime() }))
      .sort((a, b) => a.ts - b.ts);
  }, [appointments]);

  const revenue = useMemo(() => {
    const billed = billing.filter((b) => b.billing_status !== "Not Billed" && b.billing_status !== "Waived").reduce((s, b) => s + (Number(b.amount) || 0), 0);
    const paid = billing.filter((b) => b.billing_status === "Paid").reduce((s, b) => s + (Number(b.amount) || 0), 0);
    const outstanding = billing.filter((b) => b.billing_status === "Invoice Sent" || b.billing_status === "Partially Paid").reduce((s, b) => s + (Number(b.amount) || 0), 0);
    return [{ name: "Billed", value: billed }, { name: "Paid", value: paid }, { name: "Outstanding", value: outstanding }];
  }, [billing]);

  const evaluatorWorkload = useMemo(() => {
    const map = {};
    evaluations.forEach((e) => {
      const name = e.evaluator_name || "Unassigned";
      map[name] = (map[name] || 0) + 1;
    });
    return Object.entries(map).map(([name, count]) => ({ name, count }));
  }, [evaluations]);

  const placementsByHashkafa = useMemo(() => {
    const schoolMap = Object.fromEntries(schools.map((s) => [s.id, s.hashkafa || "Other"]));
    const map = {};
    placements.forEach((p) => {
      const h = schoolMap[p.school_id] || "Other";
      map[h] = (map[h] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [placements, schools]);

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-80 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
        <p className="text-sm text-gray-500 mt-1">Pipeline and revenue analytics</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Clients by Status">
          <BarChart data={clientsByStatus}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={60} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
            <Tooltip />
            <Bar dataKey="count" fill="#1e3a5f" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartCard>

        <ChartCard title="Appointments by Month">
          <LineChart data={apptsByMonth}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
            <Tooltip />
            <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ChartCard>

        <ChartCard title="Revenue: Billed vs Paid vs Outstanding">
          <BarChart data={revenue}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v) => fmtCurrency(v)} />
            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
              {revenue.map((_, i) => <Cell key={i} fill={["#1e3a5f", "#10b981", "#f59e0b"][i]} />)}
            </Bar>
          </BarChart>
        </ChartCard>

        <ChartCard title="Evaluator Workload">
          <BarChart data={evaluatorWorkload} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
            <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={100} />
            <Tooltip />
            <Bar dataKey="count" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ChartCard>

        <ChartCard title="Placements by Hashkafa">
          <PieChart>
            <Pie data={placementsByHashkafa} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
              {placementsByHashkafa.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ChartCard>
      </div>
    </div>
  );
}
