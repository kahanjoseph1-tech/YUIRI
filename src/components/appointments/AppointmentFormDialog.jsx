import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Combobox from "@/components/common/Combobox";
import { MEETING_TYPES, APPOINTMENT_STATUSES } from "@/lib/constants";

// Converts a stored ISO datetime to a value for <input type="datetime-local">.
function toLocalInput(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tz).toISOString().slice(0, 16);
}

export default function AppointmentFormDialog({
  open, onOpenChange, appointment, clients = [], evaluators = [], defaultClientId, onSave,
}) {
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(appointment
      ? { ...appointment, date_time: toLocalInput(appointment.date_time) }
      : {
          client_id: defaultClientId || "", evaluator_id: "", date_time: "",
          meeting_type: "Intake", location: "", status: "Scheduled", notes: "",
        });
  }, [open, appointment, defaultClientId]);

  const update = (field, value) => setForm((p) => ({ ...p, [field]: value }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const client = clients.find((c) => c.id === form.client_id);
      const evaluator = evaluators.find((u) => u.id === form.evaluator_id);
      await onSave({
        ...form,
        date_time: form.date_time ? new Date(form.date_time).toISOString() : null,
        client_name: client ? `${client.boy_first_name} ${client.boy_last_name}` : form.client_name,
        evaluator_name: evaluator ? (evaluator.full_name || evaluator.email) : form.evaluator_name,
      });
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  const clientOptions = clients.map((c) => ({
    value: c.id, label: `${c.boy_first_name} ${c.boy_last_name}`,
  }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{appointment ? "Edit Appointment" : "New Appointment"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-gray-500">Client *</Label>
            <Combobox
              options={clientOptions}
              value={form.client_id}
              onChange={(v) => update("client_id", v)}
              placeholder="Select client"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-gray-500">Evaluator</Label>
            <Select value={form.evaluator_id || "none"} onValueChange={(v) => update("evaluator_id", v === "none" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="Select evaluator" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Unassigned</SelectItem>
                {evaluators.map((u) => <SelectItem key={u.id} value={u.id}>{u.full_name || u.email}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-gray-500">Date & Time *</Label>
              <Input type="datetime-local" value={form.date_time || ""} onChange={(e) => update("date_time", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-gray-500">Type</Label>
              <Select value={form.meeting_type} onValueChange={(v) => update("meeting_type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{MEETING_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-gray-500">Location / Zoom Link</Label>
            <Input value={form.location || ""} onChange={(e) => update("location", e.target.value)} placeholder="Address or meeting link" />
          </div>
          {appointment && (
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-gray-500">Status</Label>
              <Select value={form.status} onValueChange={(v) => update("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{APPOINTMENT_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-gray-500">Notes</Label>
            <Textarea rows={3} value={form.notes || ""} onChange={(e) => update("notes", e.target.value)} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || !form.client_id || !form.date_time} className="bg-[#1e3a5f] hover:bg-[#1e3a5f]/90">
            {saving ? "Saving..." : appointment ? "Update" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
