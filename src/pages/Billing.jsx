import React, { useState } from "react";
import { firebaseClient } from "@/api/firebaseClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Receipt, FileText, DollarSign, Ban } from "lucide-react";
import StatusBadge from "@/components/StatusBadge";
import BillingFormDialog from "@/components/billing/BillingFormDialog";
import InvoiceDialog from "@/components/billing/InvoiceDialog";
import RecordPaymentDialog from "@/components/billing/RecordPaymentDialog";
import { BILLING_STATUSES } from "@/lib/constants";
import {
  nextInvoiceNumber,
  recordFinancialTransactionForBillingPayment,
  syncFinancialTransactionForBillingPayment,
} from "@/lib/automations";
import { can } from "@/lib/roles";
import { useRole } from "@/lib/useRole";
import { fmtCurrency } from "@/lib/format";

export default function Billing() {
  const queryClient = useQueryClient();
  const { role } = useRole();
  const canWrite = can(role, "billing.write");

  const [statusFilter, setStatusFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editRecord, setEditRecord] = useState(null);
  const [payRecord, setPayRecord] = useState(null);
  const [invoiceRecord, setInvoiceRecord] = useState(null);

  const { data: billing = [], isLoading } = useQuery({
    queryKey: ["billing"], queryFn: () => firebaseClient.entities.BillingRecord.list("-created_date", 1000),
  });
  const { data: clients = [] } = useQuery({
    queryKey: ["clients"], queryFn: () => firebaseClient.entities.Client.list("-created_date", 1000),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["billing"] });
    queryClient.invalidateQueries({ queryKey: ["financials"] });
  };

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const created = await firebaseClient.entities.BillingRecord.create(data);
      await syncFinancialTransactionForBillingPayment(created);
      return created;
    },
    onSuccess: () => { invalidate(); toast.success("Billing record created"); },
    onError: () => toast.error("Failed to create"),
  });
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const {
        payment_amount_received,
        payment_event_id,
        ...billingPatch
      } = data;
      const updated = await firebaseClient.entities.BillingRecord.update(id, billingPatch);

      if (payment_event_id && Number(payment_amount_received || 0) > 0) {
        await recordFinancialTransactionForBillingPayment(updated, {
          amount: Number(payment_amount_received),
          eventId: payment_event_id,
          transactionDate: billingPatch.payment_date,
          paymentMethod: billingPatch.payment_method,
          notes: billingPatch.payment_note,
        });
      } else {
        await syncFinancialTransactionForBillingPayment(updated);
      }

      return updated;
    },
    onSuccess: () => { invalidate(); toast.success("Updated"); },
    onError: () => toast.error("Update failed"),
  });

  const invoiceMutation = useMutation({
    mutationFn: async (record) => {
      if (record.invoice_number) return record;
      const invoice_number = nextInvoiceNumber(billing);
      return firebaseClient.entities.BillingRecord.update(record.id, {
        invoice_number,
        billing_status: record.billing_status === "Not Billed" ? "Invoice Sent" : record.billing_status,
      });
    },
    onSuccess: (record) => {
      invalidate();
      setInvoiceRecord(record);
      toast.success(`Invoice ${record.invoice_number} ready`);
    },
    onError: () => toast.error("Failed to create invoice"),
  });

  const openInvoice = (record) => invoiceMutation.mutate(record);

  const waive = (record) =>
    updateMutation.mutate(
      { id: record.id, data: { billing_status: "Waived" } },
      { onSuccess: () => { invalidate(); toast.success("Waived"); } }
    );

  const visible = statusFilter === "all" ? billing : billing.filter((b) => b.billing_status === statusFilter);

  const outstanding = billing
    .filter((b) => b.billing_status === "Invoice Sent" || b.billing_status === "Partially Paid")
    .reduce((s, b) => s + (Number(b.amount) || 0), 0);
  const collected = billing
    .filter((b) => b.billing_status === "Paid")
    .reduce((s, b) => s + (Number(b.amount) || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Billing</h1>
          <p className="text-sm text-gray-500 mt-1">{billing.length} records</p>
        </div>
        {canWrite && (
          <Button onClick={() => setShowForm(true)} className="bg-[#1e3a5f] hover:bg-[#1e3a5f]/90 gap-2">
            <Plus className="w-4 h-4" /> New Record
          </Button>
        )}
      </div>

      <div className="bg-gradient-to-r from-[#1e3a5f] to-blue-700 rounded-2xl p-6 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <p className="text-blue-100 text-sm">Outstanding Balance</p>
          <p className="text-3xl font-bold mt-1">{fmtCurrency(outstanding)}</p>
        </div>
        <div className="text-right">
          <p className="text-blue-100 text-sm">Collected</p>
          <p className="text-xl font-semibold mt-1">{fmtCurrency(collected)}</p>
        </div>
      </div>

      <div className="flex justify-end">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {BILLING_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100">
        {isLoading ? (
          <div className="p-5 space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
        ) : visible.length === 0 ? (
          <div className="text-center py-16">
            <Receipt className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">No billing records</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Service</TableHead>
                <TableHead>Invoice #</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Status</TableHead>
                {canWrite && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((b) => (
                <TableRow key={b.id}>
                  <TableCell className="font-medium text-gray-900 cursor-pointer" onClick={() => canWrite && setEditRecord(b)}>{b.client_name || "—"}</TableCell>
                  <TableCell className="text-gray-500">{b.service_type || "—"}</TableCell>
                  <TableCell className="text-gray-500">{b.invoice_number || "—"}</TableCell>
                  <TableCell className="font-semibold text-gray-900">{fmtCurrency(b.amount)}</TableCell>
                  <TableCell className="text-gray-500">
                    {b.payment_method || b.payment_note || b.evaluation_billing_answer || b.evaluation_billing_note ? (
                      <div>
                        {b.payment_method && <p>{b.payment_method}{b.card_last4 ? ` • ${b.card_last4}` : ""}</p>}
                        {b.payment_note && <p className="text-xs text-gray-400 max-w-40 truncate">{b.payment_note}</p>}
                        {b.evaluation_billing_answer && (
                          <p className="text-xs font-medium text-amber-700 max-w-48 truncate">
                            Evaluation: {b.evaluation_billing_answer}
                          </p>
                        )}
                        {b.evaluation_billing_note && (
                          <p className="text-xs text-gray-400 max-w-48 truncate">{b.evaluation_billing_note}</p>
                        )}
                      </div>
                    ) : "—"}
                  </TableCell>
                  <TableCell><StatusBadge status={b.billing_status} /></TableCell>
                  {canWrite && (
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button size="sm" variant="outline" className="h-8 gap-1 text-xs" onClick={() => openInvoice(b)} disabled={invoiceMutation.isPending}>
                          <FileText className="w-3 h-3" /> {b.invoice_number ? "Invoice" : "Create Invoice"}
                        </Button>
                        {(b.billing_status === "Invoice Sent" || b.billing_status === "Partially Paid") && (
                          <Button size="sm" variant="outline" className="h-8 gap-1 text-xs" onClick={() => setPayRecord(b)}>
                            <DollarSign className="w-3 h-3" /> Record Payment
                          </Button>
                        )}
                        {b.billing_status !== "Paid" && b.billing_status !== "Waived" && (
                          <Button size="sm" variant="ghost" className="h-8 gap-1 text-xs text-gray-500" onClick={() => waive(b)}>
                            <Ban className="w-3 h-3" /> Waive
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

      <BillingFormDialog open={showForm} onOpenChange={setShowForm} clients={clients} onSave={(data) => createMutation.mutateAsync(data)} />
      <BillingFormDialog open={!!editRecord} onOpenChange={() => setEditRecord(null)} record={editRecord} clients={clients} onSave={(data) => updateMutation.mutateAsync({ id: editRecord.id, data })} />
      <InvoiceDialog
        open={!!invoiceRecord}
        onOpenChange={() => setInvoiceRecord(null)}
        record={invoiceRecord}
        client={invoiceRecord ? clients.find((client) => client.id === invoiceRecord.client_id) : null}
      />
      <RecordPaymentDialog open={!!payRecord} onOpenChange={() => setPayRecord(null)} record={payRecord} onSave={(data) => updateMutation.mutateAsync({ id: payRecord.id, data })} />
    </div>
  );
}
