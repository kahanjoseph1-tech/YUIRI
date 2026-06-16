import { NextRequest, NextResponse } from "next/server";
import { getDocument, getCollection, updateDocument } from "@/lib/db";
import { BillingRecord, Client } from "@/lib/types";
import { generateInvoiceNumber } from "@/lib/utils";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const record = await getDocument<BillingRecord>("billing", id);
    if (!record) {
      return NextResponse.json(
        { error: "Billing record not found" },
        { status: 404 }
      );
    }

    const client = await getDocument<Client>("clients", record.clientId);

    return NextResponse.json({
      ...record,
      client: client || null,
    });
  } catch (error) {
    console.error("Error fetching billing record:", error);
    return NextResponse.json(
      { error: "Failed to fetch billing record" },
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
    const existing = await getDocument<BillingRecord>("billing", id);
    if (!existing) {
      return NextResponse.json(
        { error: "Billing record not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const updateData: Record<string, unknown> = { ...body };

    // Handle Send Invoice: auto-generate invoiceNumber
    if (
      body.billingStatus === "INVOICE_SENT" &&
      existing.billingStatus !== "INVOICE_SENT"
    ) {
      const currentYear = new Date().getFullYear();
      const prefix = `YUI-${currentYear}`;

      // Query all billing records that have an invoiceNumber to count existing ones for this year
      const allBillingRecords = await getCollection<BillingRecord>("billing", []);
      const existingInvoices = allBillingRecords.filter(
        (r) => r.invoiceNumber && r.invoiceNumber.startsWith(prefix)
      );

      const sequence = existingInvoices.length + 1;
      updateData.invoiceNumber = generateInvoiceNumber(sequence);
    }

    // Handle Record Payment: set paidDate
    if (body.billingStatus === "PAID" && existing.billingStatus !== "PAID") {
      updateData.paidDate = new Date().toISOString();
    }

    // Handle Waive
    if (body.billingStatus === "WAIVED") {
      updateData.billingStatus = "WAIVED";
    }

    await updateDocument("billing", id, updateData);

    const updated = await getDocument<BillingRecord>("billing", id);
    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating billing record:", error);
    return NextResponse.json(
      { error: "Failed to update billing record" },
      { status: 500 }
    );
  }
}
