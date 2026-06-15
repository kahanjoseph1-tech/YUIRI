"use client";

import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { format, subMonths, startOfMonth, isAfter } from "date-fns";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type {
  Client,
  Appointment,
  Evaluation,
  BillingRecord,
} from "@/lib/types";

interface EvaluatorUser {
  id: string;
  name: string;
}

const STATUS_LABELS: Record<string, string> = {
  NEW_LEAD: "New Lead",
  INTAKE_SCHEDULED: "Intake Scheduled",
  EVALUATING: "Evaluating",
  SCHOOL_MATCH_NEEDED: "School Match",
  REFERRED: "Referred",
  ACCEPTED: "Accepted",
  INACTIVE: "Inactive",
};

const CHART_COLORS = {
  primary: "#1e3a5f",
  secondary: "#2d6a9f",
  tertiary: "#3a9d8f",
  accent: "#4fb3a9",
  billed: "#1e3a5f",
  paid: "#3a9d8f",
  outstanding: "#c0392b",
};

export default function ReportsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [billing, setBilling] = useState<BillingRecord[]>([]);
  const [users, setUsers] = useState<EvaluatorUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAll() {
      try {
        const [clientsRes, appointmentsRes, evaluationsRes, billingRes, usersRes] =
          await Promise.all([
            fetch("/api/clients"),
            fetch("/api/appointments"),
            fetch("/api/evaluations"),
            fetch("/api/billing"),
            fetch("/api/users"),
          ]);

        if (clientsRes.ok) {
          const data = await clientsRes.json();
          setClients(Array.isArray(data) ? data : data.clients ?? []);
        }
        if (appointmentsRes.ok) {
          const data = await appointmentsRes.json();
          setAppointments(Array.isArray(data) ? data : data.appointments ?? []);
        }
        if (evaluationsRes.ok) {
          const data = await evaluationsRes.json();
          setEvaluations(Array.isArray(data) ? data : data.evaluations ?? []);
        }
        if (billingRes.ok) {
          const data = await billingRes.json();
          setBilling(Array.isArray(data) ? data : data.records ?? []);
        }
        // Users endpoint is admin-only; handle 403 gracefully
        if (usersRes.ok) {
          const data = await usersRes.json();
          setUsers(Array.isArray(data) ? data : data.users ?? []);
        }
      } catch {
        // Silently handle network errors; charts will show empty state
      } finally {
        setLoading(false);
      }
    }
    fetchAll();
  }, []);

  // --- Chart data derivations ---

  // 1. Clients by Status
  const clientsByStatus = Object.entries(
    clients.reduce<Record<string, number>>((acc, client) => {
      acc[client.status] = (acc[client.status] ?? 0) + 1;
      return acc;
    }, {})
  ).map(([status, count]) => ({
    status: STATUS_LABELS[status] ?? status,
    count,
  }));

  // 2. Appointments by Month (last 12 months)
  const now = new Date();
  const twelveMonthsAgo = startOfMonth(subMonths(now, 11));

  const appointmentsByMonth = (() => {
    // Initialize all 12 months
    const months: { month: string; count: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = subMonths(now, i);
      months.push({ month: format(startOfMonth(d), "MMM yyyy"), count: 0 });
    }
    // Tally appointments
    for (const appt of appointments) {
      const apptDate = new Date(appt.dateTime);
      if (isAfter(apptDate, twelveMonthsAgo) || apptDate >= twelveMonthsAgo) {
        const key = format(startOfMonth(apptDate), "MMM yyyy");
        const entry = months.find((m) => m.month === key);
        if (entry) entry.count++;
      }
    }
    return months;
  })();

  // 3. Revenue: Billed vs Paid vs Outstanding
  const revenueData = (() => {
    let billed = 0;
    let paid = 0;
    let outstanding = 0;
    for (const record of billing) {
      billed += record.amount;
      if (record.billingStatus === "PAID") {
        paid += record.amount;
      } else if (record.billingStatus === "PARTIALLY_PAID") {
        // Count partially paid as half paid, half outstanding (approximation)
        paid += record.amount * 0.5;
        outstanding += record.amount * 0.5;
      } else if (
        record.billingStatus === "INVOICE_SENT" ||
        record.billingStatus === "NOT_BILLED"
      ) {
        outstanding += record.amount;
      }
      // WAIVED is neither paid nor outstanding
    }
    return [
      {
        category: "Revenue",
        Billed: Math.round(billed * 100) / 100,
        Paid: Math.round(paid * 100) / 100,
        Outstanding: Math.round(outstanding * 100) / 100,
      },
    ];
  })();

  // 4. Evaluator Workload
  const evaluatorWorkload = (() => {
    const countByEvaluator: Record<string, number> = {};
    for (const evaluation of evaluations) {
      countByEvaluator[evaluation.evaluatorId] =
        (countByEvaluator[evaluation.evaluatorId] ?? 0) + 1;
    }
    return Object.entries(countByEvaluator).map(([evaluatorId, count]) => {
      const user = users.find((u) => u.id === evaluatorId);
      return {
        evaluator: user?.name ?? `Evaluator ${evaluatorId.slice(0, 6)}`,
        count,
      };
    });
  })();

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-[#1e3a5f]">Reports</h1>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-48" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-64 w-full rounded-lg" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-[#1e3a5f]">Reports</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Clients by Status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-[#1e3a5f]">
              Clients by Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={clientsByStatus}
                margin={{ top: 5, right: 20, left: 0, bottom: 60 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="status"
                  angle={-35}
                  textAnchor="end"
                  interval={0}
                  tick={{ fontSize: 12 }}
                />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill={CHART_COLORS.primary} name="Clients" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Appointments by Month */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-[#1e3a5f]">
              Appointments by Month
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart
                data={appointmentsByMonth}
                margin={{ top: 5, right: 20, left: 0, bottom: 60 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="month"
                  angle={-35}
                  textAnchor="end"
                  interval={0}
                  tick={{ fontSize: 12 }}
                />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke={CHART_COLORS.primary}
                  strokeWidth={2}
                  dot={{ fill: CHART_COLORS.primary, r: 4 }}
                  name="Appointments"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Revenue: Billed vs Paid vs Outstanding */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-[#1e3a5f]">
              Revenue: Billed vs Paid vs Outstanding
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={revenueData}
                margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="category" />
                <YAxis
                  tickFormatter={(value: number) =>
                    `$${value.toLocaleString()}`
                  }
                />
                <Tooltip
                  formatter={((value: number) =>
                    `$${value.toLocaleString()}`) as never}
                />
                <Legend />
                <Bar dataKey="Billed" fill={CHART_COLORS.billed} />
                <Bar dataKey="Paid" fill={CHART_COLORS.paid} />
                <Bar dataKey="Outstanding" fill={CHART_COLORS.outstanding} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Evaluator Workload */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-[#1e3a5f]">
              Evaluator Workload
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={evaluatorWorkload}
                margin={{ top: 5, right: 20, left: 0, bottom: 60 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="evaluator"
                  angle={-35}
                  textAnchor="end"
                  interval={0}
                  tick={{ fontSize: 12 }}
                />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar
                  dataKey="count"
                  fill={CHART_COLORS.secondary}
                  name="Evaluations"
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
