import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PAYMENT_METHODS } from "@/lib/constants";
import { computePaymentStatus } from "@/lib/automations";
import { fmtCurrency } from "@/lib/format";

// Records a payment against a billing record. onSave receives the patch.
export default function RecordPaymentDialog({ open, onOpenChange, record, onSave }) {
  const [paymentAmount, setPaymentAmount] = useState("");
  const [method, setMethod] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      const amountDue = Number(record?.amount || 0);
      const previousPaid = Number(record?.amount_paid || 0);
      setPaymentAmount(String(Math.max(amountDue - previousPaid, 0) || amountDue || ""));
      setMethod(record?.payment_method || "");
      setNote(record?.payment_note || "");
    }
  }, [open, record]);

  const amountDue = Number(record?.amount) || 0;
  const previousPaid = Number(record?.amount_paid || 0);
  const receivedAmount = Number(paymentAmount || 0);
  const totalPaid = previousPaid + receivedAmount;
  const nextStatus = computePaymentStatus(amountDue, totalPaid);

  const handleSave = async () => {
    if (receivedAmount <= 0) return;
    setSaving(true);
    try {
      const paymentDate = new Date().toISOString();
      const patch = {
        billing_status: nextStatus,
        payment_method: method,
        payment_note: note,
        payment_date: paymentDate,
        amount_paid: totalPaid,
        payment_amount_received: receivedAmount,
        payment_event_id: `${record.id}_${Date.now()}`,
      };
      if (nextStatus === "Paid") patch.paid_date = paymentDate;
      await onSave(patch);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <p className="text-sm text-gray-500">
            {record?.client_name} — invoice {record?.invoice_number || "(none)"} · due {fmtCurrency(amountDue)}
          </p>
          {previousPaid > 0 && (
            <p className="text-xs text-gray-400">Already recorded: {fmtCurrency(previousPaid)}</p>
          )}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-gray-500">Payment Received</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-gray-500">Payment Method</Label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger><SelectValue placeholder="Select method" /></SelectTrigger>
              <SelectContent>{PAYMENT_METHODS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-gray-500">Payment Note</Label>
            <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Check number, memo, or note" />
          </div>
          <p className="text-xs text-gray-400">New status: <span className="font-medium text-gray-600">{nextStatus}</span></p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || receivedAmount <= 0} className="bg-emerald-600 hover:bg-emerald-700">
            {saving ? "Saving..." : "Record Payment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
