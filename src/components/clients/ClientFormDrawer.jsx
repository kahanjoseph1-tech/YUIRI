import React, { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  GRADE_LEVELS, CLIENT_STATUSES, REFERRAL_SOURCES, RELIGIOUS_LEVELS,
} from "@/lib/constants";

const EMPTY = {
  boy_first_name: "", boy_last_name: "", age: "", grade_level: "",
  father_name: "", mother_name: "", parent_phone: "", parent_email: "",
  city: "", current_school: "", referral_source: "", religious_level: "",
  family_expectations: "", notes: "", status: "New Lead",
  assigned_evaluator_id: "", special_needs: [],
};

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
  const [needsText, setNeedsText] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(client ? { ...EMPTY, ...client } : EMPTY);
      setNeedsText((client?.special_needs || []).join(", "));
    }
  }, [open, client]);

  const update = (field, value) => setForm((p) => ({ ...p, [field]: value }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({
        ...form,
        age: form.age ? Number(form.age) : undefined,
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
          <Field label="Boy's First Name *">
            <Input value={form.boy_first_name} onChange={(e) => update("boy_first_name", e.target.value)} />
          </Field>
          <Field label="Boy's Last Name *">
            <Input value={form.boy_last_name} onChange={(e) => update("boy_last_name", e.target.value)} />
          </Field>
          <Field label="Age">
            <Input type="number" value={form.age} onChange={(e) => update("age", e.target.value)} />
          </Field>
          <Field label="Grade Level">
            <Select value={form.grade_level} onValueChange={(v) => update("grade_level", v)}>
              <SelectTrigger><SelectValue placeholder="Select grade" /></SelectTrigger>
              <SelectContent>{GRADE_LEVELS.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Father's Name">
            <Input value={form.father_name} onChange={(e) => update("father_name", e.target.value)} />
          </Field>
          <Field label="Mother's Name">
            <Input value={form.mother_name} onChange={(e) => update("mother_name", e.target.value)} />
          </Field>
          <Field label="Parent Phone">
            <Input value={form.parent_phone} onChange={(e) => update("parent_phone", e.target.value)} />
          </Field>
          <Field label="Parent Email">
            <Input value={form.parent_email} onChange={(e) => update("parent_email", e.target.value)} />
          </Field>
          <Field label="City">
            <Input value={form.city} onChange={(e) => update("city", e.target.value)} />
          </Field>
          <Field label="Current School">
            <Input value={form.current_school} onChange={(e) => update("current_school", e.target.value)} />
          </Field>
          <Field label="Referral Source">
            <Select value={form.referral_source} onValueChange={(v) => update("referral_source", v)}>
              <SelectTrigger><SelectValue placeholder="Select source" /></SelectTrigger>
              <SelectContent>{REFERRAL_SOURCES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Religious Level">
            <Select value={form.religious_level} onValueChange={(v) => update("religious_level", v)}>
              <SelectTrigger><SelectValue placeholder="Select level" /></SelectTrigger>
              <SelectContent>{RELIGIOUS_LEVELS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
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
