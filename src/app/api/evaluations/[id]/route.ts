import { NextRequest, NextResponse } from "next/server";
import {
  getDocument,
  updateDocument,
  createDocument,
} from "@/lib/db";
import { Evaluation, Client, Appointment } from "@/lib/types";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const evaluation = await getDocument<Evaluation>("evaluations", id);
    if (!evaluation) {
      return NextResponse.json(
        { error: "Evaluation not found" },
        { status: 404 }
      );
    }

    const [client, appointment] = await Promise.all([
      getDocument<Client>("clients", evaluation.clientId),
      getDocument<Appointment>("appointments", evaluation.appointmentId),
    ]);

    return NextResponse.json({
      ...evaluation,
      client: client || null,
      appointment: appointment || null,
    });
  } catch (error) {
    console.error("Error fetching evaluation:", error);
    return NextResponse.json(
      { error: "Failed to fetch evaluation" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const existing = await getDocument<Evaluation>("evaluations", id);
    if (!existing) {
      return NextResponse.json(
        { error: "Evaluation not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    await updateDocument("evaluations", id, body);

    // AUTOMATION: If status changed to COMPLETED
    if (body.status === "COMPLETED" && existing.status !== "COMPLETED") {
      // 1. Update client status to SCHOOL_MATCH_NEEDED
      await updateDocument("clients", existing.clientId, {
        status: "SCHOOL_MATCH_NEEDED",
      });

      // 2. Auto-create a BillingRecord
      const appointment = await getDocument<Appointment>(
        "appointments",
        existing.appointmentId
      );

      const billingData = {
        clientId: existing.clientId,
        serviceType: "Evaluation",
        appointmentDate: appointment ? appointment.dateTime : new Date().toISOString(),
        amount: 0,
        billingStatus: "NOT_BILLED",
        notes: "",
      };
      await createDocument("billing", billingData);
    }

    const updated = await getDocument<Evaluation>("evaluations", id);
    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating evaluation:", error);
    return NextResponse.json(
      { error: "Failed to update evaluation" },
      { status: 500 }
    );
  }
}
