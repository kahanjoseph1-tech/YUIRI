import React, { useMemo, useState, useEffect } from "react";
import { firebaseClient } from "@/api/firebaseClient";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import Combobox from "@/components/common/Combobox";
import {
  DEFAULT_DROPDOWN_OPTIONS,
  DROPDOWN_OPTIONS_QUERY_KEY,
  getDropdownOptions,
  uniqueOptions,
} from "@/lib/dropdownSettings";
import { can } from "@/lib/roles";
import { useRole } from "@/lib/useRole";
import { fmtCurrency, fmtDate } from "@/lib/format";
import { BadgeDollarSign, BriefcaseBusiness, CircleDollarSign, Pencil, Plus, ReceiptText, Trash2, TrendingDown, TrendingUp } from "lucide-react";

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function monthKey(value) {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function clientName(client) {
  return `${client.boy_first_name || ""} ${client.boy_last_name || ""}`.trim() || client.client_name || "Client";
}

function sumTransactions(transactions, type) {
  return transactions
    .filter((transaction) => transaction.transaction_type === type)
    .reduce((total, transaction) => total + (Number(transaction.amount) || 0), 0);
}

function groupTotals(transactions, type) {
  const rows = new Map();
  transactions
    .filter((transaction) => transaction.transaction_type === type)
    .forEach((transaction) => {
      const category = transaction.category || type;
      rows.set(category, (rows.get(category) || 0) + (Number(transaction.amount) || 0));
    });
  return [...rows.entries()].map(([category, amount]) => ({ category, amount }));
}

function MoneyCard({ title, value, subtext, icon: Icon, tone }) {
  const tones = {
    income: "bg-emerald-50 text-emerald-700",
    expense: "bg-rose-50 text-rose-700",
    payroll: "bg-amber-50 text-amber-700",
    net: "bg-blue-50 text-blue-700",
  };

  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{title}</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
          {subtext && <p className="mt-1 text-xs text-gray-400">{subtext}</p>}
        </div>
        <div className={`p-3 rounded-xl ${tones[tone] || tones.net}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function TransactionTypeBadge({ type }) {
  const className = type === "Income"
    ? "bg-emerald-50 text-emerald-700"
    : type === "Payroll"
      ? "bg-amber-50 text-amber-700"
      : "bg-rose-50 text-rose-700";
  return <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${className}`}>{type}</span>;
}

function TransactionDialog({ open, onOpenChange, transaction, clients, onSave }) {
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  const { data: dropdownOptions = DEFAULT_DROPDOWN_OPTIONS } = useQuery({
    queryKey: DROPDOWN_OPTIONS_QUERY_KEY,
    queryFn: getDropdownOptions,
  });

  const categoryOptionsForType = (type, currentCategory = "") => {
    const groupKey = type === "Income"
      ? "financial_income_categories"
      : type === "Payroll"
        ? "financial_payroll_categories"
        : "financial_expense_categories";
    return uniqueOptions([...(dropdownOptions[groupKey] || []), currentCategory]);
  };

  useEffect(() => {
    if (!open) return;
    setForm(transaction || {
      transaction_type: "Expense",
      transaction_date: todayKey(),
      amount: "",
      category: "Office",
      payment_method: "",
    });
  }, [open, transaction]);

  const update = (field, value) => {
    setForm((previous) => {
      const next = { ...previous, [field]: value };
      if (field === "transaction_type") {
        next.category = categoryOptionsForType(value)[0] || "";
      }
      return next;
    });
  };

  const clientOptions = clients.map((client) => ({ value: client.id, label: clientName(client) }));
  const typeOptions = uniqueOptions([...(dropdownOptions.financial_transaction_types || []), form.transaction_type]);
  const categories = categoryOptionsForType(form.transaction_type, form.category);
  const paymentMethodOptions = uniqueOptions([...(dropdownOptions.payment_methods || []), form.payment_method]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const client = clients.find((item) => item.id === form.client_id);
      await onSave({
        ...form,
        amount: Number(form.amount || 0),
        transaction_date: form.transaction_date || todayKey(),
        client_name: client ? clientName(client) : form.client_name || "",
        source: form.source || "Manual",
      });
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{transaction ? "Edit Transaction" : "New Transaction"}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-gray-500">Type</Label>
              <Select value={form.transaction_type || ""} onValueChange={(value) => update("transaction_type", value)}>
                <SelectTrigger><SelectValue placeholder="Type" /></SelectTrigger>
                <SelectContent>{typeOptions.map((type) => <SelectItem key={type} value={type}>{type}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-gray-500">Date</Label>
              <Input
                type="date"
                value={String(form.transaction_date || "").slice(0, 10)}
                onChange={(event) => update("transaction_date", event.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-gray-500">Amount</Label>
              <Input type="number" min="0" step="0.01" value={form.amount ?? ""} onChange={(event) => update("amount", event.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-gray-500">Category</Label>
              <Select value={form.category || ""} onValueChange={(value) => update("category", value)}>
                <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
                <SelectContent>{categories.map((category) => <SelectItem key={category} value={category}>{category}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-gray-500">Client</Label>
              <Combobox options={clientOptions} value={form.client_id || ""} onChange={(value) => update("client_id", value)} placeholder="Optional client" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-gray-500">Payment Method</Label>
              <Select value={form.payment_method || ""} onValueChange={(value) => update("payment_method", value)}>
                <SelectTrigger><SelectValue placeholder="Optional method" /></SelectTrigger>
                <SelectContent>{paymentMethodOptions.map((method) => <SelectItem key={method} value={method}>{method}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-gray-500">Description</Label>
            <Input value={form.description || ""} onChange={(event) => update("description", event.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-gray-500">Notes</Label>
            <Textarea rows={3} value={form.notes || ""} onChange={(event) => update("notes", event.target.value)} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || !form.transaction_type || !Number(form.amount || 0)} className="bg-[#1e3a5f] hover:bg-[#1e3a5f]/90">
            {saving ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function Financials() {
  const queryClient = useQueryClient();
  const { role } = useRole();
  const canWrite = can(role, "financials.write");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTransaction, setEditTransaction] = useState(null);

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ["financials"],
    queryFn: () => firebaseClient.entities.FinancialTransaction.list("-transaction_date", 1000),
  });
  const { data: clients = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: () => firebaseClient.entities.Client.list("-created_date", 1000),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["financials"] });

  const createMutation = useMutation({
    mutationFn: (data) => firebaseClient.entities.FinancialTransaction.create(data),
    onSuccess: () => { invalidate(); toast.success("Transaction recorded"); },
    onError: () => toast.error("Failed to record transaction"),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => firebaseClient.entities.FinancialTransaction.update(id, data),
    onSuccess: () => { invalidate(); toast.success("Transaction updated"); },
    onError: () => toast.error("Failed to update transaction"),
  });
  const deleteMutation = useMutation({
    mutationFn: (id) => firebaseClient.entities.FinancialTransaction.delete(id),
    onSuccess: () => { invalidate(); toast.success("Transaction deleted"); },
    onError: () => toast.error("Failed to delete transaction"),
  });

  const sortedTransactions = useMemo(
    () => [...transactions].sort((a, b) => new Date(b.transaction_date || b.created_date) - new Date(a.transaction_date || a.created_date)),
    [transactions]
  );

  const currentMonth = monthKey(new Date());
  const monthTransactions = sortedTransactions.filter((transaction) => monthKey(transaction.transaction_date || transaction.created_date) === currentMonth);

  const income = sumTransactions(sortedTransactions, "Income");
  const expenses = sumTransactions(sortedTransactions, "Expense");
  const payroll = sumTransactions(sortedTransactions, "Payroll");
  const net = income - expenses - payroll;
  const monthIncome = sumTransactions(monthTransactions, "Income");
  const monthExpenses = sumTransactions(monthTransactions, "Expense") + sumTransactions(monthTransactions, "Payroll");

  const incomeRows = groupTotals(sortedTransactions, "Income");
  const expenseRows = groupTotals(sortedTransactions, "Expense");
  const payrollRows = groupTotals(sortedTransactions, "Payroll");

  const openNewTransaction = () => {
    setEditTransaction(null);
    setDialogOpen(true);
  };

  const openEditTransaction = (transaction) => {
    setEditTransaction(transaction);
    setDialogOpen(true);
  };

  const saveTransaction = (data) => {
    if (editTransaction) return updateMutation.mutateAsync({ id: editTransaction.id, data });
    return createMutation.mutateAsync(data);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Financials</h1>
          <p className="text-sm text-gray-500 mt-1">Income, expenses, payroll, and P&L reporting</p>
        </div>
        {canWrite && (
          <Button onClick={openNewTransaction} className="bg-[#1e3a5f] hover:bg-[#1e3a5f]/90 gap-2">
            <Plus className="h-4 w-4" /> New Transaction
          </Button>
        )}
      </div>

      <Tabs defaultValue="dashboard" className="space-y-5">
        <TabsList>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="pl">P&amp;L</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-5">
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-28 rounded-2xl" />)}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <MoneyCard title="Income" value={fmtCurrency(income)} subtext={`This month ${fmtCurrency(monthIncome)}`} icon={TrendingUp} tone="income" />
                <MoneyCard title="Expenses" value={fmtCurrency(expenses)} subtext={`This month ${fmtCurrency(monthExpenses)}`} icon={TrendingDown} tone="expense" />
                <MoneyCard title="Payroll" value={fmtCurrency(payroll)} subtext="Included in P&L expenses" icon={BriefcaseBusiness} tone="payroll" />
                <MoneyCard title="Net Profit" value={fmtCurrency(net)} subtext={net >= 0 ? "Income minus expenses" : "Expenses exceed income"} icon={CircleDollarSign} tone="net" />
              </div>

              <div className="bg-white border border-gray-100 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <ReceiptText className="h-4 w-4 text-gray-400" />
                  <h2 className="font-semibold text-gray-900">Latest Transactions</h2>
                </div>
                {sortedTransactions.length === 0 ? (
                  <p className="py-10 text-center text-sm text-gray-400">No financial transactions yet.</p>
                ) : (
                  <div className="divide-y divide-gray-50">
                    {sortedTransactions.slice(0, 6).map((transaction) => (
                      <button
                        key={transaction.id}
                        type="button"
                        disabled={!canWrite}
                        onClick={() => canWrite && openEditTransaction(transaction)}
                        className="flex w-full items-center justify-between gap-4 py-3 text-left hover:bg-gray-50 disabled:hover:bg-transparent"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-gray-900">{transaction.description || transaction.category || transaction.transaction_type}</p>
                          <p className="text-xs text-gray-400">{transaction.client_name || transaction.source || "Manual"} - {fmtDate(transaction.transaction_date)}</p>
                        </div>
                        <div className="text-right">
                          <p className={`text-sm font-semibold ${transaction.transaction_type === "Income" ? "text-emerald-700" : "text-rose-700"}`}>
                            {transaction.transaction_type === "Income" ? "+" : "-"}{fmtCurrency(transaction.amount)}
                          </p>
                          <p className="text-xs text-gray-400">{transaction.transaction_type}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="transactions">
          <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
            {isLoading ? (
              <div className="p-5 space-y-3">{Array.from({ length: 6 }).map((_, index) => <Skeleton key={index} className="h-10" />)}</div>
            ) : sortedTransactions.length === 0 ? (
              <div className="py-16 text-center">
                <BadgeDollarSign className="mx-auto mb-3 h-10 w-10 text-gray-200" />
                <p className="text-sm text-gray-400">No transactions recorded.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    {canWrite && <TableHead className="text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedTransactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell className="text-gray-500">{fmtDate(transaction.transaction_date)}</TableCell>
                      <TableCell><TransactionTypeBadge type={transaction.transaction_type} /></TableCell>
                      <TableCell className="text-gray-700">{transaction.category || "-"}</TableCell>
                      <TableCell className="max-w-64 truncate text-gray-700">{transaction.description || "-"}</TableCell>
                      <TableCell className="text-gray-500">{transaction.client_name || "-"}</TableCell>
                      <TableCell className={`text-right font-semibold ${transaction.transaction_type === "Income" ? "text-emerald-700" : "text-rose-700"}`}>
                        {transaction.transaction_type === "Income" ? "+" : "-"}{fmtCurrency(transaction.amount)}
                      </TableCell>
                      {canWrite && (
                        <TableCell>
                          <div className="flex items-center justify-end gap-1">
                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => openEditTransaction(transaction)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            {transaction.source !== "Billing Payment" && (
                              <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-red-600 hover:text-red-700" onClick={() => deleteMutation.mutate(transaction.id)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </TabsContent>

        <TabsContent value="pl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="bg-white border border-gray-100 rounded-2xl p-5">
              <h2 className="font-semibold text-gray-900">Income</h2>
              <div className="mt-4 space-y-2">
                {incomeRows.length === 0 ? (
                  <p className="text-sm text-gray-400">No income yet.</p>
                ) : incomeRows.map((row) => (
                  <div key={row.category} className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">{row.category}</span>
                    <span className="font-semibold text-emerald-700">{fmtCurrency(row.amount)}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 border-t border-gray-100 pt-3 flex items-center justify-between font-semibold">
                <span>Total Income</span>
                <span>{fmtCurrency(income)}</span>
              </div>
            </div>

            <div className="bg-white border border-gray-100 rounded-2xl p-5">
              <h2 className="font-semibold text-gray-900">Expenses</h2>
              <div className="mt-4 space-y-2">
                {[...expenseRows, ...payrollRows].length === 0 ? (
                  <p className="text-sm text-gray-400">No expenses yet.</p>
                ) : [...expenseRows, ...payrollRows].map((row) => (
                  <div key={row.category} className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">{row.category}</span>
                    <span className="font-semibold text-rose-700">{fmtCurrency(row.amount)}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 border-t border-gray-100 pt-3 flex items-center justify-between font-semibold">
                <span>Total Expenses</span>
                <span>{fmtCurrency(expenses + payroll)}</span>
              </div>
            </div>

            <div className="lg:col-span-2 bg-[#1e3a5f] text-white rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="text-sm text-blue-100">Net Profit / Loss</p>
                <p className="mt-1 text-3xl font-bold">{fmtCurrency(net)}</p>
              </div>
              <p className="text-sm text-blue-100">Income {fmtCurrency(income)} - Expenses {fmtCurrency(expenses + payroll)}</p>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <TransactionDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditTransaction(null);
        }}
        transaction={editTransaction}
        clients={clients}
        onSave={saveTransaction}
      />
    </div>
  );
}
