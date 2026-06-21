import React, { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Combobox from "@/components/common/Combobox";
import {
  TRANSACTION_TYPES,
  TRANSACTION_CATEGORIES,
  PAYMENT_METHODS,
} from "@/lib/constants";

const todayIso = () => new Date().toISOString().slice(0, 10);

// Create or edit a financial transaction (income or expense, including payroll).
export default function TransactionFormDialog({ open, onOpenChange, transaction, clients = [], onSave }) {
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(
        transaction || {
          type: "Income",
          category: "Client Payment",
          amount: "",
          date: todayIso(),
        }
      );
    }
  }, [open, transaction]);

  const update = (field, value) => setForm((p) => ({ ...p, [field]: value }));

  const isExpense = form.type === "Expense";
  const categoryOptions = useMemo(
    () => TRANSACTION_CATEGORIES[form.type] || TRANSACTION_CATEGORIES.Income,
    [form.type]
  );

  const handleTypeChange = (value) => {
    setForm((p) => ({
      ...p,
      type: value,
      // Reset category to a valid one for the new type.
      category: (TRANSACTION_CATEGORIES[value] || [])[0] || "",
    }));
  };

  const clientOptions = clients.map((c) => ({
    value: c.id,
    label: `${c.boy_first_name || ""} ${c.boy_last_name || ""}`.trim() || c.client_id || "Client",
  }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const client = clients.find((c) => c.id === form.client_id);
      await onSave({
        ...form,
        amount: form.amount !== "" && form.amount != null ? Number(form.amount) : 0,
        date: form.date || todayIso(),
        client_name: client
          ? `${client.boy_first_name || ""} ${client.boy_last_name || ""}`.trim()
          : form.client_name,
      });
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  const amountInvalid = form.amount === "" || form.amount == null || Number(form.amount) <= 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{transaction ? "Edit Transaction" : "New Transaction"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-gray-500">Type *</Label>
              <Select value={form.type || "Income"} onValueChange={handleTypeChange}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TRANSACTION_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-gray-500">Category *</Label>
              <Select value={form.category || ""} onValueChange={(v) => update("category", v)}>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  {categoryOptions.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-gray-500">Amount *</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.amount ?? ""}
                onChange={(e) => update("amount", e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-gray-500">Date *</Label>
              <Input
                type="date"
                value={form.date ? String(form.date).slice(0, 10) : ""}
                onChange={(e) => update("date", e.target.value)}
              />
            </div>
          </div>

          {isExpense ? (
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-gray-500">
                {form.category === "Payroll" ? "Employee / Payee" : "Payee / Vendor"}
              </Label>
              <Input
                value={form.payee || ""}
                onChange={(e) => update("payee", e.target.value)}
                placeholder={form.category === "Payroll" ? "Employee name" : "Who was paid"}
              />
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-gray-500">Client (optional)</Label>
              <Combobox
                options={clientOptions}
                value={form.client_id}
                onChange={(v) => update("client_id", v)}
                placeholder="Link to a client"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-gray-500">Description</Label>
            <Input
              value={form.description || ""}
              onChange={(e) => update("description", e.target.value)}
              placeholder="What was this for?"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-gray-500">Payment Method</Label>
              <Select value={form.payment_method || ""} onValueChange={(v) => update("payment_method", v)}>
                <SelectTrigger><SelectValue placeholder="Select method" /></SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-gray-500">Reference #</Label>
              <Input
                value={form.reference || ""}
                onChange={(e) => update("reference", e.target.value)}
                placeholder="Check #, invoice, etc."
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-gray-500">Notes</Label>
            <Textarea rows={2} value={form.notes || ""} onChange={(e) => update("notes", e.target.value)} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={handleSave}
            disabled={saving || amountInvalid || !form.category}
            className="bg-[#1e3a5f] hover:bg-[#1e3a5f]/90"
          >
            {saving ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
