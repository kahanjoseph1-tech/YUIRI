import React, { useState, useEffect, useMemo } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DEFAULT_DROPDOWN_OPTIONS,
  DROPDOWN_OPTIONS_QUERY_KEY,
  getDropdownOptions,
  uniqueOptions,
} from "@/lib/dropdownSettings";

const EMPTY = {
  boy_first_name: "", boy_last_name: "", age: "",
  father_name: "", parent_phone: "", parent_email: "",
  city: "", current_school: "", shiur: "", reason: "", caller_source: "", caller_name: "", referral_source: "",
  responsible_person: "", responsible_name: "",
  family_expectations: "", notes: "", status: "New Client",
  assigned_evaluator_id: "", special_needs: [],
};

const emptyPhoneRow = () => ({ tag: "Father's Cell", custom_label: "", number: "" });

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

export default function ClientFormDrawer({ open, onOpenChange, client, onSave }) {
  const [form, setForm] = useState(EMPTY);
  const [phoneRows, setPhoneRows] = useState([emptyPhoneRow()]);
  const [needsText, setNeedsText] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: dropdownOptions = DEFAULT_DROPDOWN_OPTIONS } = useQuery({
    queryKey: DROPDOWN_OPTIONS_QUERY_KEY,
    queryFn: getDropdownOptions,
  });

  useEffect(() => {
    if (open) {
      const nextForm = client
        ? {
            ...EMPTY,
            ...client,
            status: client.status || "New Client",
            caller_source: client.caller_source || client.referral_source || "",
            responsible_person: client.responsible_person || "",
          }
        : EMPTY;
      setForm(nextForm);
      setPhoneRows(phoneRowsFromClient(client));
      setNeedsText((client?.special_needs || []).join(", "));
    }
  }, [open, client]);

  const callerOptions = useMemo(
    () => uniqueOptions([...(dropdownOptions.caller_options || []), form.caller_source]),
    [dropdownOptions.caller_options, form.caller_source]
  );

  const responsibleOptions = useMemo(() => {
    return uniqueOptions([
      ...(dropdownOptions.responsible_options || []),
      form.responsible_person,
    ]);
  }, [dropdownOptions.responsible_options, form.responsible_person]);

  const statusOptions = useMemo(
    () => uniqueOptions([...(dropdownOptions.client_statuses || []), form.status]),
    [dropdownOptions.client_statuses, form.status]
  );

  const phoneTagOptions = useMemo(
    () => uniqueOptions(dropdownOptions.phone_number_tags || []),
    [dropdownOptions.phone_number_tags]
  );

  const reasonOptions = useMemo(
    () => uniqueOptions([...(dropdownOptions.reason_options || []), form.reason]),
    [dropdownOptions.reason_options, form.reason]
  );

  const shiurOptions = useMemo(
    () => uniqueOptions([...(dropdownOptions.shiur_options || []), form.shiur]),
    [dropdownOptions.shiur_options, form.shiur]
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
      const responsiblePerson = form.responsible_person || "";

      await onSave({
        ...form,
        status: form.status || "New Client",
        age: form.age ? Number(form.age) : undefined,
        phone_numbers: cleanedPhones,
        parent_phone: cleanedPhones[0]?.number || "",
        caller_source: callerSource,
        caller_name: String(form.caller_name || "").trim(),
        referral_source: callerSource,
        responsible_person: responsiblePerson,
        responsible_name: String(form.responsible_name || "").trim(),
        assigned_evaluator_id: form.assigned_evaluator_id || "",
        special_needs: needsText ? needsText.split(",").map((s) => s.trim()).filter(Boolean) : [],
      });
      onOpenChange(false);
    } catch (error) {
      console.error("Client save failed:", error);
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
                      {phoneTagOptions.map((tag) => <SelectItem key={tag} value={tag}>{tag}</SelectItem>)}
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

          <Field label="Email address" full>
            <Input type="email" value={form.parent_email} onChange={(e) => update("parent_email", e.target.value)} />
          </Field>
          <Field label="לערנט בישיבה">
            <Input value={form.current_school} onChange={(e) => update("current_school", e.target.value)} />
          </Field>
          <Field label="שיעור">
            <Select
              value={form.shiur || "none"}
              onValueChange={(v) => update("shiur", v === "none" ? "" : v)}
            >
              <SelectTrigger><SelectValue placeholder="Select option" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {shiurOptions.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="City">
            <Input value={form.city} onChange={(e) => update("city", e.target.value)} />
          </Field>
          <Field label="ווער רופט">
            <div className="space-y-2">
              <Select value={form.caller_source || ""} onValueChange={(v) => update("caller_source", v)}>
                <SelectTrigger><SelectValue placeholder="Select option" /></SelectTrigger>
                <SelectContent>
                  {callerOptions.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}
                </SelectContent>
              </Select>
              <Input
                value={form.caller_name || ""}
                onChange={(event) => update("caller_name", event.target.value)}
                placeholder="Name for this client"
              />
            </div>
          </Field>
          <Field label="סיבה">
            <Select
              value={form.reason || "none"}
              onValueChange={(v) => update("reason", v === "none" ? "" : v)}
            >
              <SelectTrigger><SelectValue placeholder="Select option" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {reasonOptions.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Status">
            <Select value={form.status} onValueChange={(v) => update("status", v)}>
              <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
              <SelectContent>{statusOptions.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Responsible">
            <div className="space-y-2">
              <Select
                value={form.responsible_person || "none"}
                onValueChange={(v) => update("responsible_person", v === "none" ? "" : v)}
              >
                <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unassigned</SelectItem>
                  {responsibleOptions.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}
                </SelectContent>
              </Select>
              <Input
                value={form.responsible_name || ""}
                onChange={(event) => update("responsible_name", event.target.value)}
                placeholder="Name for this client"
              />
            </div>
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
