import React, { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Combobox from "@/components/common/Combobox";
import {
  DEFAULT_DROPDOWN_OPTIONS,
  DROPDOWN_OPTIONS_QUERY_KEY,
  getDropdownOptions,
  uniqueOptions,
} from "@/lib/dropdownSettings";
import { ATTENDEE_TYPES, appointmentAttendeeForClient } from "@/lib/appointmentContacts";

// Converts a stored ISO datetime to a value for <input type="datetime-local">.
function toLocalInput(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tz).toISOString().slice(0, 16);
}

function localDateKey(value) {
  if (!value) return "";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function startOfTodayInput() {
  return `${localDateKey(new Date())}T00:00`;
}

export default function AppointmentFormDialog({
  open,
  onOpenChange,
  appointment,
  clients = [],
  defaultClientId,
  defaultDateTime = "",
  defaultLocation = "Office",
  defaultEvaluatorName = "",
  onSave,
}) {
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  const { data: dropdownOptions = DEFAULT_DROPDOWN_OPTIONS } = useQuery({
    queryKey: DROPDOWN_OPTIONS_QUERY_KEY,
    queryFn: getDropdownOptions,
  });

  useEffect(() => {
    if (!open) return;
    if (appointment) {
      setForm({
        ...appointment,
        date_time: toLocalInput(appointment.date_time),
        meeting_type: appointment.meeting_type || "Evaluation",
        location: appointment.location || "Office",
        payment_amount_due: appointment.payment_amount_due ?? (appointment.meeting_type === "Evaluation" ? 300 : ""),
        payment_method: appointment.payment_method || "",
        payment_note: appointment.payment_note || "",
        card_last4: appointment.card_last4 || "",
        attendee_type: appointment.attendee_type || "",
        attendee_name: appointment.attendee_name || "",
        attendee_phone: appointment.attendee_phone || "",
      });
      return;
    }

    const attendeeType = "Father";
    const client = clients.find((c) => c.id === defaultClientId);
    setForm({
      client_id: defaultClientId || "",
      evaluator_id: "",
      evaluator_name: defaultEvaluatorName || "",
      date_time: defaultDateTime,
      meeting_type: "Evaluation",
      location: defaultLocation || "Office",
      status: "Scheduled",
      attendee_type: attendeeType,
      ...appointmentAttendeeForClient(client, attendeeType),
      payment_amount_due: 300,
      payment_method: "",
      payment_note: "",
      card_last4: "",
      notes: "",
    });
  }, [open, appointment, clients, defaultClientId, defaultDateTime, defaultLocation, defaultEvaluatorName]);

  const update = (field, value) => setForm((p) => ({ ...p, [field]: value }));

  const evaluatorNameOptions = useMemo(
    () => uniqueOptions([...(dropdownOptions.appointment_evaluators || []), form.evaluator_name]),
    [dropdownOptions.appointment_evaluators, form.evaluator_name]
  );

  const evaluatorSelectValue = form.evaluator_name ? `name:${form.evaluator_name}` : "none";

  const updateEvaluator = (value) => {
    if (value === "none") {
      setForm((current) => ({ ...current, evaluator_id: "", evaluator_name: "" }));
      return;
    }

    if (value.startsWith("name:")) {
      setForm((current) => ({
        ...current,
        evaluator_id: "",
        evaluator_name: value.slice(5),
      }));
    }
  };

  const meetingTypeOptions = useMemo(
    () => uniqueOptions([...(dropdownOptions.meeting_types || []), form.meeting_type]),
    [dropdownOptions.meeting_types, form.meeting_type]
  );

  const appointmentStatusOptions = useMemo(
    () => uniqueOptions([...(dropdownOptions.appointment_statuses || []), form.status]),
    [dropdownOptions.appointment_statuses, form.status]
  );

  const locationOptions = useMemo(
    () => uniqueOptions([...(dropdownOptions.appointment_locations || []), form.location]),
    [dropdownOptions.appointment_locations, form.location]
  );

  const paymentMethodOptions = useMemo(
    () => uniqueOptions([...(dropdownOptions.payment_methods || []), form.payment_method]),
    [dropdownOptions.payment_methods, form.payment_method]
  );

  const selectedClient = clients.find((c) => c.id === form.client_id);

  const updateClient = (clientId) => {
    const nextClient = clients.find((c) => c.id === clientId);
    setForm((current) => ({
      ...current,
      client_id: clientId,
      ...(current.attendee_type ? appointmentAttendeeForClient(nextClient, current.attendee_type) : {}),
    }));
  };

  const updateAttendeeType = (attendeeType) => {
    setForm((current) => ({
      ...current,
      attendee_type: attendeeType,
      ...appointmentAttendeeForClient(selectedClient, attendeeType),
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const client = clients.find((c) => c.id === form.client_id);
      await onSave({
        ...form,
        evaluator_id: "",
        date_time: form.date_time ? new Date(form.date_time).toISOString() : null,
        meeting_type: form.meeting_type || "Evaluation",
        location: form.location?.trim() || "Office",
        payment_amount_due: Number(form.payment_amount_due || 0),
        payment_method: form.payment_method || "",
        payment_note: form.payment_note || "",
        card_last4: String(form.card_last4 || "").replace(/\D/g, "").slice(-4),
        attendee_type: form.attendee_type || "",
        attendee_name: form.attendee_name || "",
        attendee_phone: form.attendee_phone || "",
        client_name: client ? `${client.boy_first_name} ${client.boy_last_name}` : form.client_name,
        evaluator_name: form.evaluator_name || "",
      });
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  const clientOptions = clients.map((c) => ({
    value: c.id, label: `${c.boy_first_name} ${c.boy_last_name}`,
  }));

  const isBackdatedNewAppointment = !appointment && form.date_time && localDateKey(form.date_time) < localDateKey(new Date());

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
              onChange={updateClient}
              placeholder="Select client"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-gray-500">Evaluator</Label>
            <Select value={evaluatorSelectValue} onValueChange={updateEvaluator}>
              <SelectTrigger><SelectValue placeholder="Select evaluator" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Unassigned</SelectItem>
                {evaluatorNameOptions.map((name) => (
                  <SelectItem key={`name:${name}`} value={`name:${name}`}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-gray-500">Date & Time *</Label>
              <Input
                type="datetime-local"
                min={!appointment ? startOfTodayInput() : undefined}
                value={form.date_time || ""}
                onChange={(e) => update("date_time", e.target.value)}
              />
              {isBackdatedNewAppointment && (
                <p className="text-xs text-red-600">New appointments cannot be scheduled before today.</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-gray-500">Type</Label>
              <Select
                value={form.meeting_type}
                onValueChange={(v) => {
                  setForm((current) => ({
                    ...current,
                    meeting_type: v,
                    payment_amount_due: v === "Evaluation" && !current.payment_amount_due ? 300 : current.payment_amount_due,
                  }));
                }}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{meetingTypeOptions.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-gray-500">Who is coming</Label>
            <div className="grid grid-cols-1 sm:grid-cols-[11rem_minmax(0,1fr)] gap-2">
              <Select value={form.attendee_type || ""} onValueChange={updateAttendeeType}>
                <SelectTrigger><SelectValue placeholder="Select person" /></SelectTrigger>
                <SelectContent>
                  {ATTENDEE_TYPES.map((type) => <SelectItem key={type} value={type}>{type}</SelectItem>)}
                </SelectContent>
              </Select>
              <Input
                value={form.attendee_name || ""}
                onChange={(event) => update("attendee_name", event.target.value)}
                placeholder="Name"
              />
            </div>
            <Input
              value={form.attendee_phone || ""}
              onChange={(event) => update("attendee_phone", event.target.value)}
              placeholder="Phone number"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-gray-500">Location / Zoom Link</Label>
            <div className="grid grid-cols-1 sm:grid-cols-[11rem_minmax(0,1fr)] gap-2">
              <Select
                value={locationOptions.includes(form.location) ? form.location : "__custom__"}
                onValueChange={(v) => update("location", v === "__custom__" ? "" : v)}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__custom__">Custom</SelectItem>
                  {locationOptions.map((location) => <SelectItem key={location} value={location}>{location}</SelectItem>)}
                </SelectContent>
              </Select>
              <Input value={form.location || ""} onChange={(e) => update("location", e.target.value)} placeholder="Office" />
            </div>
          </div>
          {appointment && (
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-gray-500">Status</Label>
              <Select value={form.status} onValueChange={(v) => update("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{appointmentStatusOptions.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          )}
          {(form.meeting_type || "Evaluation") === "Evaluation" && (
          <div className="rounded-lg border border-gray-100 p-3 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-gray-500">Amount Due</Label>
                <Input
                  type="number"
                  value={form.payment_amount_due ?? ""}
                  onChange={(e) => update("payment_amount_due", e.target.value)}
                  placeholder="300"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-gray-500">Payment Method</Label>
                <Select value={form.payment_method || ""} onValueChange={(v) => update("payment_method", v)}>
                  <SelectTrigger><SelectValue placeholder="Select method" /></SelectTrigger>
                  <SelectContent>{paymentMethodOptions.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            {form.payment_method === "Credit Card" && (
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-gray-500">Card last 4 only</Label>
                <Input
                  inputMode="numeric"
                  maxLength={4}
                  value={form.card_last4 || ""}
                  onChange={(e) => update("card_last4", e.target.value.replace(/\D/g, "").slice(0, 4))}
                  placeholder="1234"
                />
                <p className="text-xs text-gray-400">Do not enter full card numbers or CVV here.</p>
              </div>
            )}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-gray-500">Payment Note</Label>
              <Textarea
                rows={2}
                value={form.payment_note || ""}
                onChange={(e) => update("payment_note", e.target.value)}
                placeholder="Example: family will bring check tomorrow"
              />
            </div>
          </div>
          )}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-gray-500">Notes</Label>
            <Textarea rows={3} value={form.notes || ""} onChange={(e) => update("notes", e.target.value)} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || !form.client_id || !form.date_time || isBackdatedNewAppointment} className="bg-[#1e3a5f] hover:bg-[#1e3a5f]/90">
            {saving ? "Saving..." : appointment ? "Update" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
