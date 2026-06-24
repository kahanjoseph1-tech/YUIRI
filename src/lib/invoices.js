import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { fmtCurrency } from "@/lib/format";

export const INVOICE_LOGO_SRC = "/yuiri-logo.jpg";

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

async function waitForInvoiceAssets(element) {
  if (document.fonts?.ready) {
    await document.fonts.ready.catch(() => {});
  }

  const images = Array.from(element.querySelectorAll("img"));
  await Promise.all(
    images.map((image) => {
      if (image.complete) return Promise.resolve();
      return new Promise((resolve) => {
        image.addEventListener("load", resolve, { once: true });
        image.addEventListener("error", resolve, { once: true });
      });
    }),
  );
}

export async function createInvoicePdf(_record, _client, element) {
  if (!element) {
    throw new Error("Invoice preview is required to create the PDF.");
  }

  await waitForInvoiceAssets(element);

  const canvas = await html2canvas(element, {
    backgroundColor: "#ffffff",
    logging: false,
    scale: 2,
    useCORS: true,
  });
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 36;
  const maxWidth = pageWidth - margin * 2;
  const maxHeight = pageHeight - margin * 2;

  let imageWidth = maxWidth;
  let imageHeight = (canvas.height * imageWidth) / canvas.width;
  if (imageHeight > maxHeight) {
    imageHeight = maxHeight;
    imageWidth = (canvas.width * imageHeight) / canvas.height;
  }

  const x = (pageWidth - imageWidth) / 2;
  doc.addImage(canvas.toDataURL("image/png"), "PNG", x, margin, imageWidth, imageHeight, undefined, "FAST");
  return doc;
}

export async function downloadInvoicePdf(record, client, element) {
  const doc = await createInvoicePdf(record, client, element);
  doc.save(invoiceFileName(record, client));
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
