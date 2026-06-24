import React, { useEffect, useState } from "react";
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
  invoiceBalance,
  invoicePaidAmount,
  openInvoiceEmailDraft,
  primaryPhone,
} from "@/lib/invoices";
import { fmtCurrency, fmtDate, fmtDateTime } from "@/lib/format";

export default function InvoiceDialog({ open, onOpenChange, record, client }) {
  const [recipientMode, setRecipientMode] = useState("profile");
  const [customEmail, setCustomEmail] = useState("");

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

  const handleDownload = () => {
    downloadInvoicePdf(record, client);
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Invoice</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          <div className="rounded-2xl border border-gray-100 bg-white p-5">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Invoice</p>
                <h2 className="mt-1 text-xl font-bold text-gray-900">{record.invoice_number || "No invoice number"}</h2>
                <p className="mt-1 text-sm text-gray-500">{fmtDate(record.updated_date || record.created_date)}</p>
              </div>
              <StatusBadge status={record.billing_status} />
            </div>

            <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-xl border border-gray-100 p-3">
                <p className="text-xs text-gray-400">Father</p>
                <p className="text-sm font-semibold text-gray-900">{client?.father_name || "-"}</p>
              </div>
              <div className="rounded-xl border border-gray-100 p-3">
                <p className="text-xs text-gray-400">Boy</p>
                <p className="text-sm font-semibold text-gray-900">{clientDisplayName(client)}</p>
              </div>
              <div className="rounded-xl border border-gray-100 p-3">
                <p className="text-xs text-gray-400">Phone</p>
                <p className="text-sm font-semibold text-gray-900">{primaryPhone(client) || "-"}</p>
              </div>
              <div className="rounded-xl border border-gray-100 p-3">
                <p className="text-xs text-gray-400">Email</p>
                <p className="text-sm font-semibold text-gray-900 break-words">{profileEmail || "-"}</p>
              </div>
            </div>

            <div className="mt-5 rounded-xl border border-gray-100">
              <div className="grid grid-cols-[1fr_120px] gap-3 border-b border-gray-100 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
                <span>Bill</span>
                <span className="text-right">Amount</span>
              </div>
              <div className="grid grid-cols-[1fr_120px] gap-3 px-4 py-3 text-sm">
                <span className="font-medium text-gray-900">{record.service_type || "Service"}</span>
                <span className="text-right font-semibold text-gray-900">{fmtCurrency(record.amount)}</span>
              </div>
              <div className="grid grid-cols-[1fr_120px] gap-3 border-t border-gray-100 px-4 py-3 text-sm">
                <span className="text-gray-500">Paid</span>
                <span className="text-right font-semibold text-emerald-700">{fmtCurrency(paid)}</span>
              </div>
              <div className="grid grid-cols-[1fr_120px] gap-3 border-t border-gray-100 px-4 py-3 text-sm">
                <span className="font-semibold text-gray-900">Balance Due</span>
                <span className="text-right font-bold text-gray-900">{fmtCurrency(balance)}</span>
              </div>
            </div>

            {(record.payment_date || record.paid_date || record.payment_method || record.payment_note) && (
              <div className="mt-4 rounded-xl border border-gray-100 bg-gray-50 p-3 text-sm text-gray-600">
                {(record.payment_date || record.paid_date) && <p>Paid time: {fmtDateTime(record.payment_date || record.paid_date)}</p>}
                {record.payment_method && <p>Method: {record.payment_method}</p>}
                {record.payment_note && <p>Note: {record.payment_note}</p>}
              </div>
            )}
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
          <Button variant="outline" className="gap-2" onClick={handleDownload}>
            <Download className="w-4 h-4" /> Download PDF
          </Button>
          <Button className="gap-2 bg-[#1e3a5f] hover:bg-[#1e3a5f]/90" onClick={handleEmail}>
            <Mail className="w-4 h-4" /> Open Email Draft
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
