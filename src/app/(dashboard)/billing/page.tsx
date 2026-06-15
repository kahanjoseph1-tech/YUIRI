"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { DollarSign, FileText, Send, CreditCard, Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { useToast } from "@/components/ui/use-toast";
import { cn, formatDate } from "@/lib/utils";
import type { BillingRecord, BillingStatus } from "@/lib/types";

// Extended type to include clientName populated from the API
interface BillingRecordWithClient extends BillingRecord {
  clientName?: string;
}

const BILLING_STATUS_LABELS: Record<BillingStatus, string> = {
  NOT_BILLED: "Not Billed",
  INVOICE_SENT: "Invoice Sent",
  PARTIALLY_PAID: "Partially Paid",
  PAID: "Paid",
  WAIVED: "Waived",
};

const STATUS_BADGE_VARIANT: Record<
  BillingStatus,
  "secondary" | "default" | "warning" | "success" | "outline"
> = {
  NOT_BILLED: "secondary",
  INVOICE_SENT: "default",
  PARTIALLY_PAID: "warning",
  PAID: "success",
  WAIVED: "outline",
};

const formatCurrency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

export default function BillingPage() {
  const { toast } = useToast();

  // Data state
  const [records, setRecords] = useState<BillingRecordWithClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter state
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");

  // Dialog state
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] =
    useState<BillingRecordWithClient | null>(null);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentRecord, setPaymentRecord] =
    useState<BillingRecordWithClient | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Edit form for detail dialog
  const [editForm, setEditForm] = useState({
    amount: "",
    serviceType: "",
    invoiceNumber: "",
    notes: "",
  });

  const fetchRecords = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filterStatus !== "all") {
        params.set("billingStatus", filterStatus);
      }
      const url = `/api/billing${params.toString() ? `?${params}` : ""}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch billing records");
      const data: BillingRecordWithClient[] = await res.json();
      setRecords(data);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Failed to load billing records";
      setError(msg);
      toast({ title: "Error", description: msg, variant: "destructive" });
    }
  }, [filterStatus, toast]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      await fetchRecords();
      setLoading(false);
    }
    load();
  }, [fetchRecords]);

  // Derived: filtered records (date range applied client-side)
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      if (filterDateFrom && new Date(r.appointmentDate) < new Date(filterDateFrom))
        return false;
      if (filterDateTo) {
        const to = new Date(filterDateTo);
        to.setHours(23, 59, 59, 999);
        if (new Date(r.appointmentDate) > to) return false;
      }
      return true;
    });
  }, [records, filterDateFrom, filterDateTo]);

  // Derived: unpaid balance (INVOICE_SENT + PARTIALLY_PAID)
  const unpaidBalance = useMemo(() => {
    return records
      .filter(
        (r) =>
          r.billingStatus === "INVOICE_SENT" ||
          r.billingStatus === "PARTIALLY_PAID"
      )
      .reduce((sum, r) => sum + r.amount, 0);
  }, [records]);

  function getClientName(record: BillingRecordWithClient): string {
    if (record.clientName) return record.clientName;
    if (record.client) {
      return `${record.client.boyFirstName} ${record.client.boyLastName}`;
    }
    return "Unknown Client";
  }

  // Send Invoice
  async function handleSendInvoice(record: BillingRecordWithClient) {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/billing/${record.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ billingStatus: "INVOICE_SENT" }),
      });
      if (!res.ok) throw new Error("Failed to send invoice");
      toast({
        title: "Invoice Sent",
        description: `Invoice sent for ${getClientName(record)}.`,
      });
      await fetchRecords();
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Failed to send invoice";
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }

  // Record Payment
  function openPaymentDialog(record: BillingRecordWithClient) {
    setPaymentRecord(record);
    setPaymentAmount(String(record.amount));
    setPaymentDialogOpen(true);
  }

  async function handleRecordPayment() {
    if (!paymentRecord) return;
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid payment amount.",
        variant: "destructive",
      });
      return;
    }
    setSubmitting(true);
    try {
      const newStatus: BillingStatus =
        amount >= paymentRecord.amount ? "PAID" : "PARTIALLY_PAID";
      const res = await fetch(`/api/billing/${paymentRecord.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          billingStatus: newStatus,
          paidDate: new Date().toISOString(),
        }),
      });
      if (!res.ok) throw new Error("Failed to record payment");
      toast({
        title: "Payment Recorded",
        description: `${formatCurrency.format(amount)} payment recorded for ${getClientName(paymentRecord)}.`,
      });
      setPaymentDialogOpen(false);
      setPaymentRecord(null);
      setPaymentAmount("");
      await fetchRecords();
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Failed to record payment";
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }

  // Waive
  async function handleWaive(record: BillingRecordWithClient) {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/billing/${record.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ billingStatus: "WAIVED" }),
      });
      if (!res.ok) throw new Error("Failed to waive billing");
      toast({
        title: "Billing Waived",
        description: `Billing waived for ${getClientName(record)}.`,
      });
      await fetchRecords();
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Failed to waive billing";
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }

  // Open detail dialog
  function openDetail(record: BillingRecordWithClient) {
    setSelectedRecord(record);
    setEditForm({
      amount: String(record.amount),
      serviceType: record.serviceType || "",
      invoiceNumber: record.invoiceNumber || "",
      notes: record.notes || "",
    });
    setDetailDialogOpen(true);
  }

  // Save edits from detail dialog
  async function handleSaveEdit() {
    if (!selectedRecord) return;
    const amount = parseFloat(editForm.amount);
    if (isNaN(amount) || amount < 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid amount.",
        variant: "destructive",
      });
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/billing/${selectedRecord.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount,
          serviceType: editForm.serviceType,
          invoiceNumber: editForm.invoiceNumber,
          notes: editForm.notes,
        }),
      });
      if (!res.ok) throw new Error("Failed to update record");
      toast({
        title: "Record Updated",
        description: "Billing record updated successfully.",
      });
      setDetailDialogOpen(false);
      setSelectedRecord(null);
      await fetchRecords();
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Failed to update record";
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }

  // Loading skeleton
  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-24 w-full max-w-sm" />
        <div className="flex gap-3">
          <Skeleton className="h-10 w-[200px]" />
          <Skeleton className="h-10 w-[160px]" />
          <Skeleton className="h-10 w-[160px]" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (error && records.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <p className="text-lg font-medium text-destructive">
          Failed to load billing data
        </p>
        <p className="mt-1 text-sm text-muted-foreground">{error}</p>
        <Button className="mt-4" onClick={() => window.location.reload()}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-[#1e3a5f]">Billing</h1>
      </div>

      {/* Unpaid Balance Banner */}
      <Card className="border-[#1e3a5f]/20 bg-[#1e3a5f]/5">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Unpaid Balance
          </CardTitle>
          <DollarSign className="h-5 w-5 text-[#1e3a5f]" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-[#1e3a5f]">
            {formatCurrency.format(unpaidBalance)}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Total outstanding from invoices sent and partially paid records
          </p>
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="NOT_BILLED">Not Billed</SelectItem>
            <SelectItem value="INVOICE_SENT">Invoice Sent</SelectItem>
            <SelectItem value="PARTIALLY_PAID">Partially Paid</SelectItem>
            <SelectItem value="PAID">Paid</SelectItem>
            <SelectItem value="WAIVED">Waived</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={filterDateFrom}
            onChange={(e) => setFilterDateFrom(e.target.value)}
            className="w-[160px]"
            placeholder="From"
          />
          <span className="text-sm text-muted-foreground">to</span>
          <Input
            type="date"
            value={filterDateTo}
            onChange={(e) => setFilterDateTo(e.target.value)}
            className="w-[160px]"
            placeholder="To"
          />
        </div>
      </div>

      {/* Table */}
      {filteredRecords.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          No billing records found. Adjust your filters or check back later.
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client Name</TableHead>
                <TableHead>Service Type</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Invoice #</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Paid Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRecords.map((record) => (
                <TableRow
                  key={record.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => openDetail(record)}
                >
                  <TableCell className="font-medium">
                    {getClientName(record)}
                  </TableCell>
                  <TableCell>{record.serviceType || "-"}</TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency.format(record.amount)}
                  </TableCell>
                  <TableCell>{record.invoiceNumber || "-"}</TableCell>
                  <TableCell>
                    <Badge variant={STATUS_BADGE_VARIANT[record.billingStatus]}>
                      {BILLING_STATUS_LABELS[record.billingStatus]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {record.paidDate ? formatDate(record.paidDate) : "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div
                      className="flex items-center justify-end gap-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {record.billingStatus === "NOT_BILLED" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSendInvoice(record)}
                          disabled={submitting}
                          title="Send Invoice"
                        >
                          <Send className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      {(record.billingStatus === "INVOICE_SENT" ||
                        record.billingStatus === "PARTIALLY_PAID") && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openPaymentDialog(record)}
                          disabled={submitting}
                          title="Record Payment"
                        >
                          <CreditCard className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      {record.billingStatus !== "PAID" &&
                        record.billingStatus !== "WAIVED" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleWaive(record)}
                            disabled={submitting}
                            title="Waive"
                          >
                            <Ban className="h-3.5 w-3.5" />
                          </Button>
                        )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* RECORD PAYMENT DIALOG */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
            <DialogDescription>
              {paymentRecord
                ? `Record a payment for ${getClientName(paymentRecord)} - ${formatCurrency.format(paymentRecord.amount)} outstanding.`
                : "Record a payment for this billing record."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Payment Amount</Label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                placeholder="0.00"
              />
              {paymentRecord && (
                <p className="text-xs text-muted-foreground">
                  Full amount: {formatCurrency.format(paymentRecord.amount)}.
                  Enter a lesser amount to mark as partially paid.
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setPaymentDialogOpen(false);
                setPaymentRecord(null);
                setPaymentAmount("");
              }}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              className="bg-[#1e3a5f] hover:bg-[#1e3a5f]/90"
              onClick={handleRecordPayment}
              disabled={submitting}
            >
              {submitting ? "Recording..." : "Record Payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* BILLING DETAIL / EDIT DIALOG */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[520px]">
          {selectedRecord && (
            <>
              <DialogHeader>
                <DialogTitle>Billing Record Details</DialogTitle>
                <DialogDescription>
                  View and edit billing details for{" "}
                  {getClientName(selectedRecord)}.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                {/* Read-only info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Client</p>
                    <p className="font-medium">
                      {getClientName(selectedRecord)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Appointment Date
                    </p>
                    <p className="font-medium">
                      {formatDate(selectedRecord.appointmentDate)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <Badge
                      variant={
                        STATUS_BADGE_VARIANT[selectedRecord.billingStatus]
                      }
                    >
                      {BILLING_STATUS_LABELS[selectedRecord.billingStatus]}
                    </Badge>
                  </div>
                  {selectedRecord.paidDate && (
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Paid Date
                      </p>
                      <p className="font-medium">
                        {formatDate(selectedRecord.paidDate)}
                      </p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-muted-foreground">Created</p>
                    <p className="text-sm">
                      {formatDate(selectedRecord.createdAt)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Last Updated
                    </p>
                    <p className="text-sm">
                      {formatDate(selectedRecord.updatedAt)}
                    </p>
                  </div>
                </div>

                {/* Editable fields */}
                <div className="space-y-4 border-t pt-4">
                  <div className="space-y-2">
                    <Label>Service Type</Label>
                    <Input
                      value={editForm.serviceType}
                      onChange={(e) =>
                        setEditForm((f) => ({
                          ...f,
                          serviceType: e.target.value,
                        }))
                      }
                      placeholder="e.g. Evaluation, Consultation"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Amount</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={editForm.amount}
                      onChange={(e) =>
                        setEditForm((f) => ({ ...f, amount: e.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Invoice Number</Label>
                    <Input
                      value={editForm.invoiceNumber}
                      onChange={(e) =>
                        setEditForm((f) => ({
                          ...f,
                          invoiceNumber: e.target.value,
                        }))
                      }
                      placeholder="e.g. YUI-2026-0001"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Notes</Label>
                    <Textarea
                      value={editForm.notes}
                      onChange={(e) =>
                        setEditForm((f) => ({ ...f, notes: e.target.value }))
                      }
                      rows={3}
                      placeholder="Additional notes..."
                    />
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSaveEdit}
                  disabled={submitting}
                >
                  {submitting ? "Saving..." : "Save Changes"}
                </Button>

                {/* Quick status actions */}
                <div className="flex flex-wrap gap-2 border-t pt-4">
                  {selectedRecord.billingStatus === "NOT_BILLED" && (
                    <Button
                      size="sm"
                      className="bg-[#1e3a5f] hover:bg-[#1e3a5f]/90"
                      onClick={() => {
                        handleSendInvoice(selectedRecord);
                        setDetailDialogOpen(false);
                      }}
                      disabled={submitting}
                    >
                      <Send className="mr-2 h-3.5 w-3.5" />
                      Send Invoice
                    </Button>
                  )}
                  {(selectedRecord.billingStatus === "INVOICE_SENT" ||
                    selectedRecord.billingStatus === "PARTIALLY_PAID") && (
                    <Button
                      size="sm"
                      className="bg-green-600 hover:bg-green-700"
                      onClick={() => {
                        setDetailDialogOpen(false);
                        openPaymentDialog(selectedRecord);
                      }}
                      disabled={submitting}
                    >
                      <CreditCard className="mr-2 h-3.5 w-3.5" />
                      Record Payment
                    </Button>
                  )}
                  {selectedRecord.billingStatus !== "PAID" &&
                    selectedRecord.billingStatus !== "WAIVED" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          handleWaive(selectedRecord);
                          setDetailDialogOpen(false);
                        }}
                        disabled={submitting}
                      >
                        <Ban className="mr-2 h-3.5 w-3.5" />
                        Waive
                      </Button>
                    )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
