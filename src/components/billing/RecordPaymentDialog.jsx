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
  const [amountPaid, setAmountPaid] = useState("");
  const [method, setMethod] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setAmountPaid(record?.amount != null ? String(record.amount) : "");
      setMethod(record?.payment_method || "");
    }
  }, [open, record]);

  const amountDue = Number(record?.amount) || 0;
  const nextStatus = computePaymentStatus(amountDue, Number(amountPaid));

  const handleSave = async () => {
    setSaving(true);
    try {
      const patch = {
        billing_status: nextStatus,
        payment_method: method,
      };
      if (nextStatus === "Paid") patch.paid_date = new Date().toISOString().slice(0, 10);
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
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-gray-500">Amount Paid</Label>
            <Input type="number" value={amountPaid} onChange={(e) => setAmountPaid(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-gray-500">Payment Method</Label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger><SelectValue placeholder="Select method" /></SelectTrigger>
              <SelectContent>{PAYMENT_METHODS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <p className="text-xs text-gray-400">New status: <span className="font-medium text-gray-600">{nextStatus}</span></p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
            {saving ? "Saving..." : "Record Payment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
