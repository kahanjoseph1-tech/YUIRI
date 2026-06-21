import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SCHOOL_HASHKAFAS, SCHOOL_TYPES, ENVIRONMENT_TYPES } from "@/lib/constants";

const EMPTY = {
  name: "", type: "", location: "", address: "", phone: "", email: "", website: "",
  hashkafa: "", grade_range: "", tuition_range: "", class_size: "",
  boarding: false, accepts_special_needs: false, environment_type: "",
  contact_person: "", description: "", notes: "", specialties: [],
};

function Field({ label, children, full }) {
  return (
    <div className={`space-y-1.5 ${full ? "sm:col-span-2" : ""}`}>
      <Label className="text-xs font-medium text-gray-500">{label}</Label>
      {children}
    </div>
  );
}

export default function SchoolFormDialog({ open, onOpenChange, school, onSave }) {
  const [form, setForm] = useState(EMPTY);
  const [specialtiesText, setSpecialtiesText] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(school ? { ...EMPTY, ...school } : EMPTY);
      setSpecialtiesText((school?.specialties || []).join(", "));
    }
  }, [open, school]);

  const update = (field, value) => setForm((p) => ({ ...p, [field]: value }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({
        ...form,
        class_size: form.class_size ? Number(form.class_size) : undefined,
        specialties: specialtiesText ? specialtiesText.split(",").map((s) => s.trim()).filter(Boolean) : [],
      });
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{school ? "Edit Yeshiva" : "Add Yeshiva"}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-3">
          <Field label="Name *">
            <Input value={form.name} onChange={(e) => update("name", e.target.value)} />
          </Field>
          <Field label="Type">
            <Select value={form.type || ""} onValueChange={(v) => update("type", v)}>
              <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
              <SelectContent>{SCHOOL_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Hashkafa">
            <Select value={form.hashkafa || ""} onValueChange={(v) => update("hashkafa", v)}>
              <SelectTrigger><SelectValue placeholder="Select hashkafa" /></SelectTrigger>
              <SelectContent>{SCHOOL_HASHKAFAS.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Environment Type">
            <Select value={form.environment_type || ""} onValueChange={(v) => update("environment_type", v)}>
              <SelectTrigger><SelectValue placeholder="Select environment" /></SelectTrigger>
              <SelectContent>{ENVIRONMENT_TYPES.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Location (City/Area)">
            <Input value={form.location} onChange={(e) => update("location", e.target.value)} />
          </Field>
          <Field label="Grade Range">
            <Input value={form.grade_range} onChange={(e) => update("grade_range", e.target.value)} placeholder="e.g. 1st - 8th" />
          </Field>
          <Field label="Address" full>
            <Input value={form.address} onChange={(e) => update("address", e.target.value)} />
          </Field>
          <Field label="Phone">
            <Input value={form.phone} onChange={(e) => update("phone", e.target.value)} />
          </Field>
          <Field label="Email">
            <Input value={form.email} onChange={(e) => update("email", e.target.value)} />
          </Field>
          <Field label="Website">
            <Input value={form.website} onChange={(e) => update("website", e.target.value)} />
          </Field>
          <Field label="Contact Person">
            <Input value={form.contact_person} onChange={(e) => update("contact_person", e.target.value)} />
          </Field>
          <Field label="Tuition Range">
            <Input value={form.tuition_range} onChange={(e) => update("tuition_range", e.target.value)} />
          </Field>
          <Field label="Class Size">
            <Input type="number" value={form.class_size} onChange={(e) => update("class_size", e.target.value)} />
          </Field>
          <div className="flex items-center gap-3 sm:col-span-2">
            <div className="flex items-center gap-2">
              <Switch checked={!!form.boarding} onCheckedChange={(v) => update("boarding", v)} />
              <Label className="text-sm text-gray-600">Boarding</Label>
            </div>
            <div className="flex items-center gap-2 ml-6">
              <Switch checked={!!form.accepts_special_needs} onCheckedChange={(v) => update("accepts_special_needs", v)} />
              <Label className="text-sm text-gray-600">Accepts Special Needs</Label>
            </div>
          </div>
          <Field label="Specialties (comma separated)" full>
            <Input value={specialtiesText} onChange={(e) => setSpecialtiesText(e.target.value)} placeholder="Limudei Kodesh, English, Therapy..." />
          </Field>
          <Field label="Description" full>
            <Textarea rows={2} value={form.description} onChange={(e) => update("description", e.target.value)} />
          </Field>
          <Field label="Notes" full>
            <Textarea rows={2} value={form.notes} onChange={(e) => update("notes", e.target.value)} />
          </Field>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || !form.name} className="bg-[#1e3a5f] hover:bg-[#1e3a5f]/90">
            {saving ? "Saving..." : school ? "Update" : "Add Yeshiva"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
