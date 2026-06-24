import { jsPDF } from "jspdf";
import { fmtCurrency, fmtDate, fmtDateTime } from "@/lib/format";

export function clientDisplayName(client) {
  return `${client?.boy_first_name || ""} ${client?.boy_last_name || ""}`.trim() || "Client";
}

export function primaryPhone(client) {
  const phone = Array.isArray(client?.phone_numbers)
    ? client.phone_numbers.find((item) => item.number)
    : null;
  return phone?.number || client?.parent_phone || "";
}

export function invoicePaidAmount(record) {
  const paid = Number(record?.amount_paid || 0);
  if (paid > 0) return paid;
  return record?.billing_status === "Paid" ? Number(record?.amount || 0) : 0;
}

export function invoiceBalance(record) {
  if (record?.billing_status === "Waived") return 0;
  return Math.max((Number(record?.amount) || 0) - invoicePaidAmount(record), 0);
}

export function invoiceFileName(record, client) {
  const invoiceNumber = record?.invoice_number || record?.id || "invoice";
  const name = clientDisplayName(client).replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "");
  return `Yuiri-${invoiceNumber}${name ? `-${name}` : ""}.pdf`;
}

function invoiceRows(record, client) {
  return [
    ["Invoice #", record?.invoice_number || ""],
    ["Invoice Date", fmtDate(record?.updated_date || record?.created_date || new Date())],
    ["Father", client?.father_name || ""],
    ["Boy", clientDisplayName(client)],
    ["Phone", primaryPhone(client)],
    ["Email", client?.parent_email || ""],
    ["Service", record?.service_type || "Service"],
    ["Status", record?.billing_status || ""],
  ];
}

export function createInvoicePdf(record, client) {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const left = 48;
  let y = 52;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("Yuiri", left, y);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Placement CRM", left, y + 16);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(24);
  doc.text("Invoice", 440, y);

  y += 58;
  doc.setDrawColor(226, 232, 240);
  doc.line(left, y, 564, y);
  y += 28;

  doc.setFontSize(10);
  invoiceRows(record, client).forEach(([label, value]) => {
    if (!value) return;
    doc.setFont("helvetica", "bold");
    doc.setTextColor(100, 116, 139);
    doc.text(`${label}:`, left, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(15, 23, 42);
    doc.text(String(value), 150, y);
    y += 20;
  });

  y += 18;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(left, y, 516, 112, 8, 8, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(100, 116, 139);
  doc.text("Bill", left + 18, y + 28);
  doc.text("Amount", 486, y + 28, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setTextColor(15, 23, 42);
  doc.text(record?.service_type || "Service", left + 18, y + 54);
  doc.text(fmtCurrency(record?.amount || 0), 486, y + 54, { align: "right" });

  doc.setDrawColor(226, 232, 240);
  doc.line(left + 18, y + 72, 546, y + 72);

  doc.setFont("helvetica", "bold");
  doc.text("Paid", left + 18, y + 92);
  doc.text(fmtCurrency(invoicePaidAmount(record)), 486, y + 92, { align: "right" });
  doc.text("Balance Due", left + 18, y + 112);
  doc.text(fmtCurrency(invoiceBalance(record)), 486, y + 112, { align: "right" });

  if (record?.payment_date || record?.paid_date || record?.payment_method || record?.payment_note) {
    y += 150;
    doc.setFont("helvetica", "bold");
    doc.setTextColor(100, 116, 139);
    doc.text("Payment", left, y);
    y += 18;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(15, 23, 42);
    if (record.payment_date || record.paid_date) {
      doc.text(`Paid time: ${fmtDateTime(record.payment_date || record.paid_date)}`, left, y);
      y += 16;
    }
    if (record.payment_method) {
      doc.text(`Method: ${record.payment_method}`, left, y);
      y += 16;
    }
    if (record.payment_note) {
      doc.text(`Note: ${record.payment_note}`, left, y, { maxWidth: 460 });
    }
  }

  doc.setFontSize(9);
  doc.setTextColor(148, 163, 184);
  doc.text("Thank you.", left, 738);

  return doc;
}

export function downloadInvoicePdf(record, client) {
  createInvoicePdf(record, client).save(invoiceFileName(record, client));
}

export function invoiceEmailBody(record, client) {
  const lines = [
    `Invoice # ${record?.invoice_number || ""}`,
    "",
    `Father: ${client?.father_name || ""}`,
    `Boy: ${clientDisplayName(client)}`,
    `Phone: ${primaryPhone(client)}`,
    `Email: ${client?.parent_email || ""}`,
    "",
    `Bill: ${record?.service_type || "Service"}`,
    `Amount: ${fmtCurrency(record?.amount || 0)}`,
    `Paid: ${fmtCurrency(invoicePaidAmount(record))}`,
    `Balance Due: ${fmtCurrency(invoiceBalance(record))}`,
  ];
  return lines.join("\n");
}

export function openInvoiceEmailDraft(record, client, recipient) {
  const to = String(recipient || "").trim();
  const subject = encodeURIComponent(`Yuiri invoice ${record?.invoice_number || ""} - ${clientDisplayName(client)}`);
  const body = encodeURIComponent(invoiceEmailBody(record, client));
  window.location.href = `mailto:${to}?subject=${subject}&body=${body}`;
}
