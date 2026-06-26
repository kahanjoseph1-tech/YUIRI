import React, { useMemo, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DEFAULT_DROPDOWN_OPTIONS,
  DROPDOWN_OPTIONS_QUERY_KEY,
  getDropdownOptions,
  uniqueOptions,
} from "@/lib/dropdownSettings";

const EMPTY = {
  name: "", type: "", location: "", address: "", phone: "", email: "", website: "",
  hashkafa: "", grade_range: "", tuition_range: "", class_size: "",
  boarding: false, accepts_special_needs: false, environment_type: "",
  contact_person: "", application_url: "", application_text: "", information_url: "", information_text: "",
  description: "", notes: "", specialties: [],
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

  const { data: dropdownOptions = DEFAULT_DROPDOWN_OPTIONS } = useQuery({
    queryKey: DROPDOWN_OPTIONS_QUERY_KEY,
    queryFn: getDropdownOptions,
  });

  const typeOptions = useMemo(
    () => uniqueOptions([...(dropdownOptions.yeshiva_types || []), form.type]),
    [dropdownOptions.yeshiva_types, form.type]
  );
  const hashkafaOptions = useMemo(
    () => uniqueOptions([...(dropdownOptions.yeshiva_hashkafas || []), form.hashkafa]),
    [dropdownOptions.yeshiva_hashkafas, form.hashkafa]
  );
  const environmentOptions = useMemo(
    () => uniqueOptions([...(dropdownOptions.yeshiva_environment_types || []), form.environment_type]),
    [dropdownOptions.yeshiva_environment_types, form.environment_type]
  );
  const gradeRangeOptions = useMemo(
    () => uniqueOptions([...(dropdownOptions.yeshiva_grade_ranges || []), form.grade_range]),
    [dropdownOptions.yeshiva_grade_ranges, form.grade_range]
  );
  const locationOptions = useMemo(
    () => uniqueOptions([...(dropdownOptions.yeshiva_locations || []), form.location]),
    [dropdownOptions.yeshiva_locations, form.location]
  );
  const applicationTextOptions = useMemo(
    () => uniqueOptions([...(dropdownOptions.yeshiva_application_texts || []), form.application_text]),
    [dropdownOptions.yeshiva_application_texts, form.application_text]
  );
  const informationTextOptions = useMemo(
    () => uniqueOptions([...(dropdownOptions.yeshiva_information_texts || []), form.information_text]),
    [dropdownOptions.yeshiva_information_texts, form.information_text]
  );

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
              <SelectContent>{typeOptions.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Hashkafa">
            <Select value={form.hashkafa || ""} onValueChange={(v) => update("hashkafa", v)}>
              <SelectTrigger><SelectValue placeholder="Select hashkafa" /></SelectTrigger>
              <SelectContent>{hashkafaOptions.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Environment Type">
            <Select value={form.environment_type || ""} onValueChange={(v) => update("environment_type", v)}>
              <SelectTrigger><SelectValue placeholder="Select environment" /></SelectTrigger>
              <SelectContent>{environmentOptions.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Location (City/Area)">
            <div className="grid grid-cols-1 gap-2">
              <Select value={locationOptions.includes(form.location) ? form.location : "__custom__"} onValueChange={(v) => update("location", v === "__custom__" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Select location" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__custom__">Custom</SelectItem>
                  {locationOptions.map((location) => <SelectItem key={location} value={location}>{location}</SelectItem>)}
                </SelectContent>
              </Select>
              <Input value={form.location} onChange={(e) => update("location", e.target.value)} placeholder="City / area" />
            </div>
          </Field>
          <Field label="Grade Range">
            <div className="grid grid-cols-1 gap-2">
              <Select value={gradeRangeOptions.includes(form.grade_range) ? form.grade_range : "__custom__"} onValueChange={(v) => update("grade_range", v === "__custom__" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Select grades" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__custom__">Custom</SelectItem>
                  {gradeRangeOptions.map((gradeRange) => <SelectItem key={gradeRange} value={gradeRange}>{gradeRange}</SelectItem>)}
                </SelectContent>
              </Select>
              <Input value={form.grade_range} onChange={(e) => update("grade_range", e.target.value)} placeholder="e.g. 9th - 12th" />
            </div>
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
          <Field label="Application Link" full>
            <Input value={form.application_url || ""} onChange={(e) => update("application_url", e.target.value)} placeholder="https://..." />
          </Field>
          <Field label="Application Button Text">
            <Select value={applicationTextOptions.includes(form.application_text) ? form.application_text : "__custom__"} onValueChange={(v) => update("application_text", v === "__custom__" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="Application" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__custom__">Custom</SelectItem>
                {applicationTextOptions.map((label) => <SelectItem key={label} value={label}>{label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input value={form.application_text || ""} onChange={(e) => update("application_text", e.target.value)} placeholder="Application" />
          </Field>
          <Field label="Information Link">
            <Input value={form.information_url || ""} onChange={(e) => update("information_url", e.target.value)} placeholder="https://..." />
          </Field>
          <Field label="Information Button Text">
            <Select value={informationTextOptions.includes(form.information_text) ? form.information_text : "__custom__"} onValueChange={(v) => update("information_text", v === "__custom__" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="Information" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__custom__">Custom</SelectItem>
                {informationTextOptions.map((label) => <SelectItem key={label} value={label}>{label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input value={form.information_text || ""} onChange={(e) => update("information_text", e.target.value)} placeholder="Information" />
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
