import React, { useMemo, useState } from "react";
import { firebaseClient } from "@/api/firebaseClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from "recharts";
import { format, isWithinInterval, startOfMonth, endOfMonth, startOfYear, endOfYear } from "date-fns";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, TrendingUp, TrendingDown, Wallet, Receipt, Pencil, Trash2 } from "lucide-react";
import TransactionFormDialog from "@/components/financials/TransactionFormDialog";
import { badgeClass } from "@/lib/badges";
import { fmtCurrency, fmtDate, toDate } from "@/lib/format";
import { TRANSACTION_TYPES } from "@/lib/constants";
import { can } from "@/lib/roles";
import { useRole } from "@/lib/useRole";

function SummaryCard({ label, value, icon: Icon, tone }) {
  const tones = {
    green: "text-emerald-600 bg-emerald-50",
    red: "text-red-600 bg-red-50",
    blue: "text-blue-600 bg-blue-50",
  };
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 flex items-center gap-4">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${tones[tone] || tones.blue}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-2xl font-bold text-gray-900 mt-0.5 truncate">{value}</p>
      </div>
    </div>
  );
}

// Sum amounts for a given transaction type within an optional date range.
function sumBy(transactions, type, range) {
  return transactions
    .filter((t) => t.type === type)
    .filter((t) => {
      if (!range) return true;
      const d = toDate(t.date) || toDate(t.created_date);
      return d ? isWithinInterval(d, range) : false;
    })
    .reduce((s, t) => s + (Number(t.amount) || 0), 0);
}

// Group amounts by category for a transaction type within an optional range.
function byCategory(transactions, type, range) {
  const map = {};
  transactions
    .filter((t) => t.type === type)
    .filter((t) => {
      if (!range) return true;
      const d = toDate(t.date) || toDate(t.created_date);
      return d ? isWithinInterval(d, range) : false;
    })
    .forEach((t) => {
      const key = t.category || "Uncategorized";
      map[key] = (map[key] || 0) + (Number(t.amount) || 0);
    });
  return Object.entries(map)
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => b.amount - a.amount);
}

export default function Financials() {
  const queryClient = useQueryClient();
  const { role } = useRole();
  const canWrite = can(role, "financials.write");

  const [showForm, setShowForm] = useState(false);
  const [editTxn, setEditTxn] = useState(null);
  const [deleteTxn, setDeleteTxn] = useState(null);
  const [typeFilter, setTypeFilter] = useState("all");
  const [period, setPeriod] = useState("year");

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ["financial_transactions"],
    queryFn: () => firebaseClient.entities.FinancialTransaction.list("-date", 2000),
  });
  const { data: clients = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: () => firebaseClient.entities.Client.list("-created_date", 1000),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["financial_transactions"] });

  const createMutation = useMutation({
    mutationFn: (data) => firebaseClient.entities.FinancialTransaction.create(data),
    onSuccess: () => { invalidate(); toast.success("Transaction recorded"); },
    onError: () => toast.error("Failed to record transaction"),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => firebaseClient.entities.FinancialTransaction.update(id, data),
    onSuccess: () => { invalidate(); toast.success("Transaction updated"); },
    onError: () => toast.error("Update failed"),
  });
  const deleteMutation = useMutation({
    mutationFn: (id) => firebaseClient.entities.FinancialTransaction.delete(id),
    onSuccess: () => { invalidate(); toast.success("Transaction deleted"); },
    onError: () => toast.error("Delete failed"),
  });

  // ---- Dashboard totals (all time) ----
  const totalIncome = useMemo(() => sumBy(transactions, "Income"), [transactions]);
  const totalExpense = useMemo(() => sumBy(transactions, "Expense"), [transactions]);
  const netProfit = totalIncome - totalExpense;

  // ---- Income vs Expense by month ----
  const byMonth = useMemo(() => {
    const map = {};
    transactions.forEach((t) => {
      const d = toDate(t.date) || toDate(t.created_date);
      if (!d) return;
      const key = format(d, "MMM yyyy");
      if (!map[key]) map[key] = { name: key, Income: 0, Expense: 0, ts: d.getTime() };
      if (t.type === "Expense") map[key].Expense += Number(t.amount) || 0;
      else map[key].Income += Number(t.amount) || 0;
    });
    return Object.values(map).sort((a, b) => a.ts - b.ts).slice(-12);
  }, [transactions]);

  // ---- Transactions tab ----
  const visibleTxns = typeFilter === "all"
    ? transactions
    : transactions.filter((t) => t.type === typeFilter);

  // ---- P&L tab ----
  const plRange = useMemo(() => {
    const now = new Date();
    if (period === "month") return { start: startOfMonth(now), end: endOfMonth(now) };
    if (period === "year") return { start: startOfYear(now), end: endOfYear(now) };
    return null; // all time
  }, [period]);

  const plIncome = useMemo(() => byCategory(transactions, "Income", plRange), [transactions, plRange]);
  const plExpense = useMemo(() => byCategory(transactions, "Expense", plRange), [transactions, plRange]);
  const plIncomeTotal = plIncome.reduce((s, r) => s + r.amount, 0);
  const plExpenseTotal = plExpense.reduce((s, r) => s + r.amount, 0);
  const plNet = plIncomeTotal - plExpenseTotal;

  const periodLabel = period === "month" ? "This Month" : period === "year" ? "This Year" : "All Time";

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Financials</h1>
          <p className="text-sm text-gray-500 mt-1">Income, expenses & profit / loss</p>
        </div>
        {canWrite && (
          <Button onClick={() => { setEditTxn(null); setShowForm(true); }} className="bg-[#1e3a5f] hover:bg-[#1e3a5f]/90 gap-2">
            <Plus className="w-4 h-4" /> New Transaction
          </Button>
        )}
      </div>

      <Tabs defaultValue="dashboard" className="space-y-6">
        <TabsList>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="pl">P&amp;L</TabsTrigger>
        </TabsList>

        {/* ---------- Dashboard ---------- */}
        <TabsContent value="dashboard" className="space-y-6">
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <SummaryCard label="Total Income" value={fmtCurrency(totalIncome)} icon={TrendingUp} tone="green" />
                <SummaryCard label="Total Expenses" value={fmtCurrency(totalExpense)} icon={TrendingDown} tone="red" />
                <SummaryCard label="Net Profit" value={fmtCurrency(netProfit)} icon={Wallet} tone={netProfit >= 0 ? "blue" : "red"} />
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 p-5">
                <h2 className="font-semibold text-gray-900 mb-4">Income vs Expenses (last 12 months)</h2>
                <div className="h-72">
                  {byMonth.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-sm text-gray-400">No data yet</div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={byMonth}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip formatter={(v) => fmtCurrency(v)} />
                        <Legend />
                        <Bar dataKey="Income" fill="#10b981" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="Expense" fill="#ef4444" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            </>
          )}
        </TabsContent>

        {/* ---------- Transactions ---------- */}
        <TabsContent value="transactions" className="space-y-4">
          <div className="flex justify-end">
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-40"><SelectValue placeholder="Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {TRANSACTION_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100">
            {isLoading ? (
              <div className="p-5 space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
            ) : visibleTxns.length === 0 ? (
              <div className="text-center py-16">
                <Receipt className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                <p className="text-gray-400 text-sm">No transactions recorded</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Client / Payee</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    {canWrite && <TableHead className="text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleTxns.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="text-gray-500 whitespace-nowrap">{fmtDate(t.date || t.created_date)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-[11px] font-medium border ${badgeClass(t.type)}`}>{t.type}</Badge>
                      </TableCell>
                      <TableCell className="text-gray-700">{t.category || "—"}</TableCell>
                      <TableCell className="text-gray-500 max-w-48 truncate">{t.description || "—"}</TableCell>
                      <TableCell className="text-gray-500">{t.client_name || t.payee || "—"}</TableCell>
                      <TableCell className={`text-right font-semibold ${t.type === "Expense" ? "text-red-600" : "text-emerald-600"}`}>
                        {t.type === "Expense" ? "-" : "+"}{fmtCurrency(t.amount)}
                      </TableCell>
                      {canWrite && (
                        <TableCell>
                          <div className="flex items-center justify-end gap-1">
                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => { setEditTxn(t); setShowForm(true); }}>
                              <Pencil className="w-4 h-4 text-gray-500" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setDeleteTxn(t)}>
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
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

        {/* ---------- P&L ---------- */}
        <TabsContent value="pl" className="space-y-4">
          <div className="flex justify-end">
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="year">This Year</SelectItem>
                <SelectItem value="all">All Time</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-6 max-w-2xl mx-auto">
            <div className="text-center mb-6">
              <h2 className="font-bold text-gray-900 text-lg">Profit &amp; Loss</h2>
              <p className="text-sm text-gray-500">{periodLabel}</p>
            </div>

            {isLoading ? (
              <div className="space-y-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-8" />)}</div>
            ) : (
              <div className="space-y-6">
                <PLSection title="Income" rows={plIncome} total={plIncomeTotal} tone="green" emptyText="No income recorded" />
                <PLSection title="Expenses" rows={plExpense} total={plExpenseTotal} tone="red" emptyText="No expenses recorded" />

                <div className="flex items-center justify-between pt-4 border-t-2 border-gray-200">
                  <span className="font-bold text-gray-900">Net {plNet >= 0 ? "Profit" : "Loss"}</span>
                  <span className={`font-bold text-lg ${plNet >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                    {plNet < 0 ? "-" : ""}{fmtCurrency(Math.abs(plNet))}
                  </span>
                </div>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <TransactionFormDialog
        open={showForm}
        onOpenChange={(o) => { setShowForm(o); if (!o) setEditTxn(null); }}
        transaction={editTxn}
        clients={clients}
        onSave={(data) =>
          editTxn
            ? updateMutation.mutateAsync({ id: editTxn.id, data })
            : createMutation.mutateAsync(data)
        }
      />

      <AlertDialog open={!!deleteTxn} onOpenChange={(o) => !o && setDeleteTxn(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete transaction?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this {deleteTxn?.type?.toLowerCase()} of {fmtCurrency(deleteTxn?.amount)}. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => { deleteMutation.mutate(deleteTxn.id); setDeleteTxn(null); }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function PLSection({ title, rows, total, tone, emptyText }) {
  const totalColor = tone === "red" ? "text-red-600" : "text-emerald-600";
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-gray-900">{title}</h3>
        <span className={`font-semibold ${totalColor}`}>{fmtCurrency(total)}</span>
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-gray-400 py-1">{emptyText}</p>
      ) : (
        <div className="space-y-1.5">
          {rows.map((r) => (
            <div key={r.name} className="flex items-center justify-between text-sm">
              <span className="text-gray-600">{r.name}</span>
              <span className="text-gray-900 font-medium">{fmtCurrency(r.amount)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
