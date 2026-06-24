import React, { useEffect, useRef, useState } from "react";
import { Download, Mail } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import StatusBadge from "@/components/StatusBadge";
import {
  clientDisplayName,
  downloadInvoicePdf,
  INVOICE_LOGO_SRC,
  invoiceBalance,
  invoicePaidAmount,
  openInvoiceEmailDraft,
  primaryPhone,
} from "@/lib/invoices";
import { fmtCurrency, fmtDate, fmtDateTime } from "@/lib/format";

export default function InvoiceDialog({ open, onOpenChange, record, client }) {
  const invoicePreviewRef = useRef(null);
  const [recipientMode, setRecipientMode] = useState("profile");
  const [customEmail, setCustomEmail] = useState("");
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setRecipientMode(client?.parent_email ? "profile" : "custom");
    setCustomEmail("");
  }, [open, client]);

  if (!record) return null;

  const profileEmail = client?.parent_email || "";
  const recipient = recipientMode === "profile" ? profileEmail : customEmail;
  const paid = invoicePaidAmount(record);
  const balance = invoiceBalance(record);

  const handleDownload = async () => {
    if (!invoicePreviewRef.current) {
      toast.error("Invoice preview is not ready");
      return;
    }
    setDownloading(true);
    try {
      await downloadInvoicePdf(record, client, invoicePreviewRef.current);
    } catch {
      toast.error("Failed to create invoice PDF");
    } finally {
      setDownloading(false);
    }
  };

  const handleEmail = () => {
    if (!recipient.trim()) {
      toast.error("Enter an email address");
      return;
    }
    openInvoiceEmailDraft(record, client, recipient);
    toast.success("Email draft opened");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Invoice</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          <div className="overflow-x-auto rounded-2xl bg-slate-100 p-3">
            <div
              ref={invoicePreviewRef}
              className="mx-auto w-[720px] border border-slate-200 bg-white p-8 text-slate-900"
              style={{ fontFamily: "Inter, Arial, sans-serif" }}
            >
              <div className="flex items-start justify-between gap-8">
                <div className="flex items-center gap-4">
                  <img
                    src={INVOICE_LOGO_SRC}
                    alt="Yuiri Support"
                    className="h-20 w-20 rounded-lg border border-slate-100 bg-white object-cover"
                  />
                  <div>
                    <p className="text-2xl font-bold leading-tight text-slate-950">Yuiri Support</p>
                    <p className="mt-1 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">CRM</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold leading-none text-slate-950">Invoice</p>
                  <p className="mt-3 text-sm font-semibold text-slate-700">{record.invoice_number || "No invoice number"}</p>
                  <p className="mt-1 text-sm text-slate-500">{fmtDate(record.updated_date || record.created_date)}</p>
                  <div className="mt-3 inline-flex">
                    <StatusBadge status={record.billing_status} />
                  </div>
                </div>
              </div>

              <div className="my-8 h-px bg-slate-200" />

              <div className="grid grid-cols-2 gap-4">
                <InvoiceInfoItem label="Father" value={client?.father_name || "-"} />
                <InvoiceInfoItem label="Boy" value={clientDisplayName(client)} />
                <InvoiceInfoItem label="Phone" value={primaryPhone(client) || "-"} />
                <InvoiceInfoItem label="Email" value={profileEmail || "-"} />
                <InvoiceInfoItem label="Service" value={record.service_type || "Service"} />
                <InvoiceInfoItem label="Status" value={record.billing_status || "-"} />
              </div>

              <div className="mt-8 overflow-hidden rounded-xl border border-slate-200">
                <div className="grid grid-cols-[1fr_140px] gap-3 bg-slate-50 px-5 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <span>Bill</span>
                  <span className="text-right">Amount</span>
                </div>
                <div className="grid grid-cols-[1fr_140px] gap-3 px-5 py-4 text-sm">
                  <span dir="auto" className="font-semibold text-slate-950">{record.service_type || "Service"}</span>
                  <span className="text-right font-semibold text-slate-950">{fmtCurrency(record.amount)}</span>
                </div>
                <div className="grid grid-cols-[1fr_140px] gap-3 border-t border-slate-200 px-5 py-3 text-sm">
                  <span className="text-slate-600">Paid</span>
                  <span className="text-right font-semibold text-emerald-700">{fmtCurrency(paid)}</span>
                </div>
                <div className="grid grid-cols-[1fr_140px] gap-3 border-t border-slate-200 bg-slate-50 px-5 py-3 text-sm">
                  <span className="font-bold text-slate-950">Balance Due</span>
                  <span className="text-right font-bold text-slate-950">{fmtCurrency(balance)}</span>
                </div>
              </div>

              {(record.payment_date || record.paid_date || record.payment_method || record.payment_note) && (
                <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Payment</p>
                  <div className="mt-2 space-y-1">
                    {(record.payment_date || record.paid_date) && <p>Paid time: {fmtDateTime(record.payment_date || record.paid_date)}</p>}
                    {record.payment_method && <p>Method: {record.payment_method}</p>}
                    {record.payment_note && <p dir="auto">Note: {record.payment_note}</p>}
                  </div>
                </div>
              )}

              <p className="mt-10 text-xs text-slate-400">Thank you.</p>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-100 p-4">
            <div className="grid grid-cols-1 sm:grid-cols-[180px_1fr] gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-gray-500">Send to</Label>
                <Select value={recipientMode} onValueChange={setRecipientMode}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="profile" disabled={!profileEmail}>Profile email</SelectItem>
                    <SelectItem value="custom">Custom email</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-gray-500">Email address</Label>
                <Input
                  type="email"
                  value={recipientMode === "profile" ? profileEmail : customEmail}
                  onChange={(event) => setCustomEmail(event.target.value)}
                  disabled={recipientMode === "profile"}
                  placeholder="email@example.com"
                />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          <Button variant="outline" className="gap-2" onClick={handleDownload} disabled={downloading}>
            <Download className="w-4 h-4" /> {downloading ? "Preparing..." : "Download PDF"}
          </Button>
          <Button className="gap-2 bg-[#1e3a5f] hover:bg-[#1e3a5f]/90" onClick={handleEmail}>
            <Mail className="w-4 h-4" /> Open Email Draft
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function InvoiceInfoItem({ label, value }) {
  return (
    <div className="min-w-0 rounded-xl border border-slate-200 p-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</p>
      <p dir="auto" className="mt-1 break-words text-sm font-semibold text-slate-950">{value || "-"}</p>
    </div>
  );
}
