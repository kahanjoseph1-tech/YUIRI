import { NextRequest, NextResponse } from "next/server";
import { getCollection } from "@/lib/db";
import { Client, Appointment, Evaluation, BillingRecord } from "@/lib/types";

interface ActivityItem {
  type: string;
  description: string;
  timestamp: string;
  id: string;
}

export async function GET(_request: NextRequest) {
  try {
    // Fetch all collections
    const clients = await getCollection<Client>("clients", []);
    const appointments = await getCollection<Appointment>("appointments", []);
    const evaluations = await getCollection<Evaluation>("evaluations", []);
    const billingRecords = await getCollection<BillingRecord>("billing", []);

    // Calculate stats
    const newLeads = clients.filter((c) => c.status === "NEW_LEAD").length;

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

    // Recent activity: last 10 items across all collections sorted by updatedAt desc
    const allActivity: ActivityItem[] = [];

    clients.forEach((c) => {
      allActivity.push({
        type: "client",
        description: `Client ${c.boyFirstName} ${c.boyLastName} - ${c.status}`,
        timestamp: c.updatedAt,
        id: c.id,
      });
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
