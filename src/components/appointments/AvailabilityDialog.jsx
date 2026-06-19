import React, { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DEFAULT_DROPDOWN_OPTIONS,
  DROPDOWN_OPTIONS_QUERY_KEY,
  getDropdownOptions,
  uniqueOptions,
} from "@/lib/dropdownSettings";

const DAYS = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];

function newDraftSlot() {
  return {
    draft_id: `draft-${Date.now()}-${Math.random()}`,
    day_of_week: 1,
    time: "21:00",
    duration_minutes: 60,
    location: "Office",
    evaluator_name: "",
    active: true,
  };
}

function sortSlots(rows) {
  return [...rows].sort((a, b) => {
    const dayDiff = Number(a.day_of_week) - Number(b.day_of_week);
    if (dayDiff !== 0) return dayDiff;
    return String(a.time || "").localeCompare(String(b.time || ""));
  });
}

export default function AvailabilityDialog({ open, onOpenChange, slots = [], onSave, saving = false }) {
  const [rows, setRows] = useState([]);

  const { data: dropdownOptions = DEFAULT_DROPDOWN_OPTIONS } = useQuery({
    queryKey: DROPDOWN_OPTIONS_QUERY_KEY,
    queryFn: getDropdownOptions,
  });

  const evaluatorOptions = useMemo(
    () => uniqueOptions(dropdownOptions.appointment_evaluators || []),
    [dropdownOptions.appointment_evaluators]
  );

  useEffect(() => {
    if (!open) return;
    setRows(sortSlots(slots).map((slot) => ({ ...slot, draft_id: slot.id })));
  }, [open, slots]);

  const updateRow = (draftId, field, value) => {
    setRows((prev) => prev.map((row) => (row.draft_id === draftId ? { ...row, [field]: value } : row)));
  };

  const removeRow = (draftId) => {
    setRows((prev) => prev.filter((row) => row.draft_id !== draftId));
  };

  const addRow = () => {
    setRows((prev) => [...prev, newDraftSlot()]);
  };

  const handleSave = async () => {
    const cleanedRows = rows
      .map((row) => ({
        id: row.id,
        day_of_week: Number(row.day_of_week),
        time: row.time || "09:00",
        duration_minutes: Number(row.duration_minutes || 60),
        location: row.location?.trim() || "Office",
        evaluator_name: row.evaluator_name || "",
        active: row.active !== false,
      }))
      .filter((row) => row.time);

    await onSave(cleanedRows);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Available Slots</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="hidden md:grid md:grid-cols-[1.1fr_1fr_120px_100px_1fr_80px_44px] gap-2 px-1 text-xs font-medium text-gray-500">
            <span>Day</span>
            <span>Evaluator</span>
            <span>Time</span>
            <span>Minutes</span>
            <span>Location</span>
            <span>Active</span>
            <span />
          </div>

          {rows.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-200 py-8 text-center text-sm text-gray-400">
              No available slots set.
            </div>
          ) : (
            rows.map((row) => {
              const rowEvaluatorOptions = uniqueOptions([...evaluatorOptions, row.evaluator_name]);
              return (
              <div key={row.draft_id} className="grid gap-2 rounded-lg border border-gray-100 p-3 md:grid-cols-[1.1fr_1fr_120px_100px_1fr_80px_44px] md:items-center md:border-0 md:p-0">
                <div className="space-y-1 md:space-y-0">
                  <Label className="text-xs font-medium text-gray-500 md:hidden">Day</Label>
                  <Select
                    value={String(row.day_of_week)}
                    onValueChange={(value) => updateRow(row.draft_id, "day_of_week", Number(value))}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {DAYS.map((day) => (
                        <SelectItem key={day.value} value={String(day.value)}>{day.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1 md:space-y-0">
                  <Label className="text-xs font-medium text-gray-500 md:hidden">Evaluator</Label>
                  <Select
                    value={row.evaluator_name || "none"}
                    onValueChange={(value) => updateRow(row.draft_id, "evaluator_name", value === "none" ? "" : value)}
                  >
                    <SelectTrigger><SelectValue placeholder="Any evaluator" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Any evaluator</SelectItem>
                      {rowEvaluatorOptions.map((name) => (
                        <SelectItem key={name} value={name}>{name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1 md:space-y-0">
                  <Label className="text-xs font-medium text-gray-500 md:hidden">Time</Label>
                  <Input
                    type="time"
                    value={row.time || ""}
                    onChange={(event) => updateRow(row.draft_id, "time", event.target.value)}
                  />
                </div>

                <div className="space-y-1 md:space-y-0">
                  <Label className="text-xs font-medium text-gray-500 md:hidden">Minutes</Label>
                  <Input
                    type="number"
                    min="15"
                    step="15"
                    value={row.duration_minutes || 60}
                    onChange={(event) => updateRow(row.draft_id, "duration_minutes", event.target.value)}
                  />
                </div>

                <div className="space-y-1 md:space-y-0">
                  <Label className="text-xs font-medium text-gray-500 md:hidden">Location</Label>
                  <Input
                    value={row.location || ""}
                    onChange={(event) => updateRow(row.draft_id, "location", event.target.value)}
                    placeholder="Office"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Checkbox
                    id={`active-${row.draft_id}`}
                    checked={row.active !== false}
                    onCheckedChange={(checked) => updateRow(row.draft_id, "active", checked === true)}
                  />
                  <Label htmlFor={`active-${row.draft_id}`} className="text-xs text-gray-500">Yes</Label>
                </div>

                <Button type="button" variant="ghost" size="icon" className="justify-self-end md:justify-self-auto" onClick={() => removeRow(row.draft_id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              );
            })
          )}

          <Button type="button" variant="outline" className="gap-2" onClick={addRow}>
            <Plus className="h-4 w-4" /> Add Slot
          </Button>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving} className="bg-[#1e3a5f] hover:bg-[#1e3a5f]/90">
            {saving ? "Saving..." : "Save Slots"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
