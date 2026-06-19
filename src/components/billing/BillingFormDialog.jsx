import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Combobox from "@/components/common/Combobox";
import { SERVICE_TYPES, BILLING_STATUSES } from "@/lib/constants";

// Create or edit a billing record.
export default function BillingFormDialog({ open, onOpenChange, record, clients = [], onSave }) {
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(record || { service_type: "Evaluation", billing_status: "Not Billed", amount: "" });
    }
  }, [open, record]);

  const update = (field, value) => setForm((p) => ({ ...p, [field]: value }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const client = clients.find((c) => c.id === form.client_id);
      await onSave({
        ...form,
        amount: form.amount !== "" && form.amount != null ? Number(form.amount) : 0,
        client_name: client ? `${client.boy_first_name} ${client.boy_last_name}` : form.client_name,
      });
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  const clientOptions = clients.map((c) => ({ value: c.id, label: `${c.boy_first_name} ${c.boy_last_name}` }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{record ? "Edit Billing Record" : "New Billing Record"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-gray-500">Client *</Label>
            <Combobox options={clientOptions} value={form.client_id} onChange={(v) => update("client_id", v)} placeholder="Select client" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-gray-500">Service Type</Label>
              <Select value={form.service_type || ""} onValueChange={(v) => update("service_type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{SERVICE_TYPES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-gray-500">Amount</Label>
              <Input type="number" value={form.amount ?? ""} onChange={(e) => update("amount", e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-gray-500">Appointment Date</Label>
              <Input type="date" value={form.appointment_date ? String(form.appointment_date).slice(0, 10) : ""} onChange={(e) => update("appointment_date", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-gray-500">Status</Label>
              <Select value={form.billing_status || ""} onValueChange={(v) => update("billing_status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{BILLING_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-gray-500">Notes</Label>
            <Textarea rows={2} value={form.notes || ""} onChange={(e) => update("notes", e.target.value)} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || !form.client_id} className="bg-[#1e3a5f] hover:bg-[#1e3a5f]/90">
            {saving ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
