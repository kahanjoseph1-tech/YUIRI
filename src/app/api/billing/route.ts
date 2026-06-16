import { NextRequest, NextResponse } from "next/server";
import {
  getCollection,
  getDocument,
  createDocument,
  where,
  orderBy,
} from "@/lib/db";
import { BillingRecord, Client } from "@/lib/types";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const billingStatus = searchParams.get("billingStatus");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const constraints = [];
    if (billingStatus) {
      constraints.push(where("billingStatus", "==", billingStatus));
    }
    if (startDate) {
      constraints.push(where("appointmentDate", ">=", startDate));
    }
    if (endDate) {
      constraints.push(where("appointmentDate", "<=", endDate));
    }
    constraints.push(orderBy("createdAt", "desc"));

    const records = await getCollection<BillingRecord>("billing", constraints);

    const populated = await Promise.all(
      records.map(async (record) => {
        const client = await getDocument<Client>("clients", record.clientId);
        return {
          ...record,
          clientName: client
            ? `${client.boyFirstName} ${client.boyLastName}`
            : "Unknown",
        };
      })
    );

    return NextResponse.json(populated);
  } catch (error) {
    console.error("Error fetching billing records:", error);
    return NextResponse.json(
      { error: "Failed to fetch billing records" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { clientId, serviceType, appointmentDate, amount, billingStatus, notes } =
      body;

    if (!clientId || !serviceType || !appointmentDate) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const billingData = {
      clientId,
      serviceType,
      appointmentDate,
      amount: amount || 0,
      billingStatus: billingStatus || "NOT_BILLED",
      notes: notes || "",
    };

    const id = await createDocument("billing", billingData);

    return NextResponse.json({ id, ...billingData }, { status: 201 });
  } catch (error) {
    console.error("Error creating billing record:", error);
    return NextResponse.json(
      { error: "Failed to create billing record" },
      { status: 500 }
    );
  }
}
