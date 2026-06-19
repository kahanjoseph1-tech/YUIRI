import React, { useState, useEffect, useMemo } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CLIENT_STATUSES, DEFAULT_CALLER_OPTIONS, PHONE_NUMBER_TAGS } from "@/lib/constants";

const CALLER_OPTIONS_KEY = "yuiri_caller_options_v1";

const EMPTY = {
  boy_first_name: "", boy_last_name: "", age: "",
  father_name: "", parent_phone: "", parent_email: "",
  city: "", current_school: "", caller_source: "", referral_source: "",
  family_expectations: "", notes: "", status: "New Client",
  assigned_evaluator_id: "", special_needs: [],
};

const emptyPhoneRow = () => ({ tag: "Father's Cell", custom_label: "", number: "" });

function readCallerOptions() {
  try {
    const parsed = JSON.parse(localStorage.getItem(CALLER_OPTIONS_KEY) || "[]");
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  } catch {
    return [];
  }
}

function saveCallerOptions(options) {
  localStorage.setItem(CALLER_OPTIONS_KEY, JSON.stringify(options));
}

function uniqueOptions(options) {
  return Array.from(new Set(options.map((option) => String(option || "").trim()).filter(Boolean)));
}

function phoneRowsFromClient(client) {
  if (Array.isArray(client?.phone_numbers) && client.phone_numbers.length > 0) {
    return client.phone_numbers.map((phone) => ({
      tag: phone.tag || "Father's Cell",
      custom_label: phone.custom_label || "",
      number: phone.number || "",
    }));
  }

  if (client?.parent_phone) {
    return [{ tag: "Father's Cell", custom_label: "", number: client.parent_phone }];
  }

  return [emptyPhoneRow()];
}

function Field({ label, children, full }) {
  return (
    <div className={`space-y-1.5 ${full ? "sm:col-span-2" : ""}`}>
      <Label className="text-xs font-medium text-gray-500">{label}</Label>
      {children}
    </div>
  );
}

export default function ClientFormDrawer({ open, onOpenChange, client, evaluators = [], onSave }) {
  const [form, setForm] = useState(EMPTY);
  const [phoneRows, setPhoneRows] = useState([emptyPhoneRow()]);
  const [needsText, setNeedsText] = useState("");
  const [customCallerOptions, setCustomCallerOptions] = useState(readCallerOptions);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      const nextForm = client
        ? {
            ...EMPTY,
            ...client,
            status: client.status === "New Lead" ? "New Client" : client.status || "New Client",
            caller_source: client.caller_source || client.referral_source || "",
          }
        : EMPTY;
      setForm(nextForm);
      setPhoneRows(phoneRowsFromClient(client));
      setNeedsText((client?.special_needs || []).join(", "));
    }
  }, [open, client]);

  const callerOptions = useMemo(
    () => uniqueOptions([...DEFAULT_CALLER_OPTIONS, ...customCallerOptions, form.caller_source]),
    [customCallerOptions, form.caller_source]
  );

  const update = (field, value) => setForm((p) => ({ ...p, [field]: value }));

  const updatePhoneRow = (index, field, value) => {
    setPhoneRows((rows) =>
      rows.map((row, rowIndex) => (rowIndex === index ? { ...row, [field]: value } : row))
    );
  };

  const removePhoneRow = (index) => {
    setPhoneRows((rows) => {
      const nextRows = rows.filter((_, rowIndex) => rowIndex !== index);
      return nextRows.length > 0 ? nextRows : [emptyPhoneRow()];
    });
  };

  const addCallerOption = () => {
    const value = window.prompt("Add an option for ווער רופט");
    const cleanedValue = String(value || "").trim();
    if (!cleanedValue) return;

    const nextOptions = uniqueOptions([...customCallerOptions, cleanedValue]);
    setCustomCallerOptions(nextOptions);
    saveCallerOptions(nextOptions);
    update("caller_source", cleanedValue);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const cleanedPhones = phoneRows
        .map((phone) => ({
          tag: phone.tag || "Father's Cell",
          custom_label: phone.tag === "Custom" ? String(phone.custom_label || "").trim() : "",
          number: String(phone.number || "").trim(),
        }))
        .filter((phone) => phone.number);
      const callerSource = form.caller_source || form.referral_source || "";

      await onSave({
        ...form,
        status: form.status || "New Client",
        age: form.age ? Number(form.age) : undefined,
        phone_numbers: cleanedPhones,
        parent_phone: cleanedPhones[0]?.number || "",
        caller_source: callerSource,
        referral_source: callerSource,
        special_needs: needsText ? needsText.split(",").map((s) => s.trim()).filter(Boolean) : [],
      });
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{client ? "Edit Client" : "Add Client"}</SheetTitle>
        </SheetHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-5">
          {client?.client_id && (
            <Field label="Client ID" full>
              <Input value={client.client_id} readOnly className="bg-gray-50 text-gray-500" />
            </Field>
          )}

          <Field label="בחור’ס נאמען *" full>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                value={form.boy_first_name}
                onChange={(e) => update("boy_first_name", e.target.value)}
                placeholder="First name"
              />
              <Input
                value={form.boy_last_name}
                onChange={(e) => update("boy_last_name", e.target.value)}
                placeholder="Last name"
              />
            </div>
          </Field>

          <Field label="ווי אלט">
            <Input type="number" value={form.age} onChange={(e) => update("age", e.target.value)} />
          </Field>
          <Field label="טאטע'ס נאמען">
            <Input value={form.father_name} onChange={(e) => update("father_name", e.target.value)} />
          </Field>

          <Field label="Phone number" full>
            <div className="space-y-2">
              {phoneRows.map((phone, index) => (
                <div key={index} className="grid grid-cols-1 sm:grid-cols-[10rem_minmax(0,1fr)_2.25rem] gap-2">
                  <Select value={phone.tag || "Father's Cell"} onValueChange={(value) => updatePhoneRow(index, "tag", value)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PHONE_NUMBER_TAGS.map((tag) => <SelectItem key={tag} value={tag}>{tag}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <div className="grid grid-cols-1 gap-2">
                    {phone.tag === "Custom" && (
                      <Input
                        value={phone.custom_label || ""}
                        onChange={(e) => updatePhoneRow(index, "custom_label", e.target.value)}
                        placeholder="Custom tag"
                      />
                    )}
                    <Input
                      value={phone.number || ""}
                      onChange={(e) => updatePhoneRow(index, "number", e.target.value)}
                      placeholder="Phone number"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-10 w-10"
                    onClick={() => removePhoneRow(index)}
                    aria-label="Remove phone number"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => setPhoneRows((rows) => [...rows, emptyPhoneRow()])}
              >
                <Plus className="h-4 w-4" />
                Add phone number
              </Button>
            </div>
          </Field>

          <Field label="Email address">
            <Input type="email" value={form.parent_email} onChange={(e) => update("parent_email", e.target.value)} />
          </Field>
          <Field label="לערנט בישיבה">
            <Input value={form.current_school} onChange={(e) => update("current_school", e.target.value)} />
          </Field>
          <Field label="City">
            <Input value={form.city} onChange={(e) => update("city", e.target.value)} />
          </Field>
          <Field label="ווער רופט">
            <div className="flex gap-2">
              <Select value={form.caller_source || ""} onValueChange={(v) => update("caller_source", v)}>
                <SelectTrigger><SelectValue placeholder="Select option" /></SelectTrigger>
                <SelectContent>
                  {callerOptions.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button type="button" variant="outline" size="icon" className="h-10 w-10 shrink-0" onClick={addCallerOption}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </Field>
          <Field label="Status">
            <Select value={form.status} onValueChange={(v) => update("status", v)}>
              <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
              <SelectContent>{CLIENT_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Assigned Evaluator">
            <Select value={form.assigned_evaluator_id || "none"} onValueChange={(v) => update("assigned_evaluator_id", v === "none" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Unassigned</SelectItem>
                {evaluators.map((u) => (
                  <SelectItem key={u.id} value={u.id}>{u.full_name || u.email}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Special Needs (comma separated)" full>
            <Input value={needsText} onChange={(e) => setNeedsText(e.target.value)} placeholder="ADHD, Speech, Dyslexia..." />
          </Field>
          <Field label="Family Expectations" full>
            <Textarea rows={3} value={form.family_expectations} onChange={(e) => update("family_expectations", e.target.value)} />
          </Field>
          <Field label="Notes" full>
            <Textarea rows={3} value={form.notes} onChange={(e) => update("notes", e.target.value)} />
          </Field>
        </div>

        <SheetFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={handleSave}
            disabled={saving || !form.boy_first_name || !form.boy_last_name}
            className="bg-[#1e3a5f] hover:bg-[#1e3a5f]/90"
          >
            {saving ? "Saving..." : client ? "Update Client" : "Add Client"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
