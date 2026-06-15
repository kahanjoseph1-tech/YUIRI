import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getCollection, where } from "@/lib/db";
import { Client, Appointment, Evaluation, BillingRecord } from "@/lib/types";

interface ActivityItem {
  type: string;
  description: string;
  timestamp: string;
  id: string;
}

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = user.role;

    // BILLING role: only billing-related stats
    if (role === "BILLING") {
      const billingRecords = await getCollection<BillingRecord>("billing", []);

      const readyToBill = billingRecords.filter(
        (r) => r.billingStatus === "NOT_BILLED"
      ).length;

      const unpaidTotal = billingRecords
        .filter(
          (r) =>
            r.billingStatus === "INVOICE_SENT" ||
            r.billingStatus === "PARTIALLY_PAID"
        )
        .reduce((sum, r) => sum + (r.amount || 0), 0);

      const recentActivity: ActivityItem[] = billingRecords
        .sort(
          (a, b) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        )
        .slice(0, 10)
        .map((r) => ({
          type: "billing",
          description: `Billing record ${r.invoiceNumber || r.id} - ${r.billingStatus}`,
          timestamp: r.updatedAt,
          id: r.id,
        }));

      return NextResponse.json({
        newLeads: 0,
        upcomingAppointments: 0,
        pendingFollowUps: 0,
        readyToBill,
        unpaidTotal,
        recentActivity,
      });
    }

    // For EVALUATOR: filter to only their items
    const isEvaluator = role === "EVALUATOR";

    // Fetch all collections (with evaluator filtering where applicable)
    const clientConstraints: Parameters<typeof where>[] = [];
    const clients = await getCollection<Client>("clients", []);

    const appointmentConstraints = isEvaluator
      ? [where("evaluatorId", "==", user.id)]
      : [];
    const appointments = await getCollection<Appointment>(
      "appointments",
      appointmentConstraints
    );

    const evaluationConstraints = isEvaluator
      ? [where("evaluatorId", "==", user.id)]
      : [];
    const evaluations = await getCollection<Evaluation>(
      "evaluations",
      evaluationConstraints
    );

    const billingRecords = isEvaluator
      ? []
      : await getCollection<BillingRecord>("billing", []);

    // Calculate stats
    const newLeads = isEvaluator
      ? 0
      : clients.filter((c) => c.status === "NEW_LEAD").length;

    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const upcomingAppointments = appointments.filter((a) => {
      const apptDate = new Date(a.dateTime);
      return (
        a.status === "SCHEDULED" && apptDate >= now && apptDate <= sevenDaysFromNow
      );
    }).length;

    const pendingFollowUps = evaluations.filter(
      (e) => e.status === "PENDING" || e.status === "IN_PROGRESS"
    ).length;

    const readyToBill = isEvaluator
      ? 0
      : billingRecords.filter((r) => r.billingStatus === "NOT_BILLED").length;

    const unpaidTotal = isEvaluator
      ? 0
      : billingRecords
          .filter(
            (r) =>
              r.billingStatus === "INVOICE_SENT" ||
              r.billingStatus === "PARTIALLY_PAID"
          )
          .reduce((sum, r) => sum + (r.amount || 0), 0);

    // Recent activity: last 10 items across all collections sorted by updatedAt desc
    const allActivity: ActivityItem[] = [];

    clients.forEach((c) => {
      if (!isEvaluator) {
        allActivity.push({
          type: "client",
          description: `Client ${c.boyFirstName} ${c.boyLastName} - ${c.status}`,
          timestamp: c.updatedAt,
          id: c.id,
        });
      }
    });

    appointments.forEach((a) => {
      allActivity.push({
        type: "appointment",
        description: `Appointment ${a.meetingType} - ${a.status}`,
        timestamp: a.updatedAt,
        id: a.id,
      });
    });

    evaluations.forEach((e) => {
      allActivity.push({
        type: "evaluation",
        description: `Evaluation - ${e.status}`,
        timestamp: e.updatedAt,
        id: e.id,
      });
    });

    billingRecords.forEach((r) => {
      allActivity.push({
        type: "billing",
        description: `Billing record ${r.invoiceNumber || r.id} - ${r.billingStatus}`,
        timestamp: r.updatedAt,
        id: r.id,
      });
    });

    const recentActivity = allActivity
      .sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      )
      .slice(0, 10);

    return NextResponse.json({
      newLeads,
      upcomingAppointments,
      pendingFollowUps,
      readyToBill,
      unpaidTotal,
      recentActivity,
    });
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard stats" },
      { status: 500 }
    );
  }
}
