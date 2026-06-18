import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LEARNING_STYLES, EVALUATION_URGENCY, RELIGIOUS_LEVELS } from "@/lib/constants";

function Field({ label, children, full }) {
  return (
    <div className={`space-y-1.5 ${full ? "sm:col-span-2" : ""}`}>
      <Label className="text-xs font-medium text-gray-500">{label}</Label>
      {children}
    </div>
  );
}

// onSave receives (data, nextStatus). "Save Draft" => In Progress, "Complete" => Completed.
export default function EvaluationFormDialog({ open, onOpenChange, evaluation, onSave }) {
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setForm(evaluation || {});
  }, [open, evaluation]);

  const update = (field, value) => setForm((p) => ({ ...p, [field]: value }));

  const handleSave = async (nextStatus) => {
    setSaving(true);
    try {
      await onSave({ ...form }, nextStatus);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Evaluation — {evaluation?.client_name || "Client"}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-3">
          <Field label="Strengths" full>
            <Textarea rows={3} value={form.strengths || ""} onChange={(e) => update("strengths", e.target.value)} />
          </Field>
          <Field label="Challenges" full>
            <Textarea rows={3} value={form.challenges || ""} onChange={(e) => update("challenges", e.target.value)} />
          </Field>
          <Field label="Learning Style">
            <Select value={form.learning_style || ""} onValueChange={(v) => update("learning_style", v)}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>{LEARNING_STYLES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Urgency">
            <Select value={form.urgency || ""} onValueChange={(v) => update("urgency", v)}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>{EVALUATION_URGENCY.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Behavior Notes" full>
            <Textarea rows={2} value={form.behavior_notes || ""} onChange={(e) => update("behavior_notes", e.target.value)} />
          </Field>
          <Field label="Religious Level Observed">
            <Select value={form.religious_level_observed || ""} onValueChange={(v) => update("religious_level_observed", v)}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>{RELIGIOUS_LEVELS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Recommended School Type">
            <Input value={form.recommended_school_type || ""} onChange={(e) => update("recommended_school_type", e.target.value)} />
          </Field>
          <Field label="Family Expectations Notes" full>
            <Textarea rows={2} value={form.family_expectations_notes || ""} onChange={(e) => update("family_expectations_notes", e.target.value)} />
          </Field>
          <Field label="Suggested Schools (names)" full>
            <Textarea rows={2} value={form.suggested_schools || ""} onChange={(e) => update("suggested_schools", e.target.value)} placeholder="One per line or comma-separated" />
          </Field>
          <Field label="Final Recommendation" full>
            <Textarea rows={3} value={form.final_recommendation || ""} onChange={(e) => update("final_recommendation", e.target.value)} />
          </Field>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="secondary" disabled={saving} onClick={() => handleSave("In Progress")}>
            Save Draft
          </Button>
          <Button disabled={saving} onClick={() => handleSave("Completed")} className="bg-emerald-600 hover:bg-emerald-700">
            {saving ? "Saving..." : "Complete Evaluation"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
