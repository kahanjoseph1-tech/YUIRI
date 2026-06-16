import { NextRequest, NextResponse } from "next/server";
import {
  getDocument,
  getCollection,
  updateDocument,
  deleteDocument,
  where,
} from "@/lib/db";
import { Client, Appointment, Evaluation, BillingRecord } from "@/lib/types";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const client = await getDocument<Client>("clients", id);
    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const [appointments, evaluations, billingRecords] = await Promise.all([
      getCollection<Appointment>("appointments", [
        where("clientId", "==", id),
      ]),
      getCollection<Evaluation>("evaluations", [
        where("clientId", "==", id),
      ]),
      getCollection<BillingRecord>("billing", [
        where("clientId", "==", id),
      ]),
    ]);

    return NextResponse.json({
      ...client,
      appointments,
      evaluations,
      billingRecords,
    });
  } catch (error) {
    console.error("Error fetching client:", error);
    return NextResponse.json(
      { error: "Failed to fetch client" },
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
    const existing = await getDocument<Client>("clients", id);
    if (!existing) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const body = await request.json();
    await updateDocument("clients", id, body);

    const updated = await getDocument<Client>("clients", id);
    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating client:", error);
    return NextResponse.json(
      { error: "Failed to update client" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const existing = await getDocument<Client>("clients", id);
    if (!existing) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    await deleteDocument("clients", id);
    return NextResponse.json({ message: "Client deleted" });
  } catch (error) {
    console.error("Error deleting client:", error);
    return NextResponse.json(
      { error: "Failed to delete client" },
      { status: 500 }
    );
  }
}
