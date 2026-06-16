"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/status-badge";
import { useToast } from "@/components/ui/use-toast";
import { formatDate } from "@/lib/utils";
import type { Client, ClientStatus } from "@/lib/types";
import {
  Plus,
  Search,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Trash2,
  Mail,
  Phone,
} from "lucide-react";

const CLIENT_STATUSES: ClientStatus[] = [
  "NEW_LEAD",
  "INTAKE_SCHEDULED",
  "EVALUATING",
  "SCHOOL_MATCH_NEEDED",
  "REFERRED",
  "ACCEPTED",
  "INACTIVE",
];

const PAGE_SIZE = 10;

type SortKey =
  | "boyFirstName"
  | "age"
  | "grade"
  | "city"
  | "status"
  | "parentNames"
  | "createdAt";
type SortDir = "asc" | "desc";

const emptyForm = {
  boyFirstName: "",
  boyLastName: "",
  age: "",
  grade: "",
  parentNames: "",
  phone: "",
  email: "",
  city: "",
  currentSchool: "",
  referralSource: "",
  notes: "",
  status: "NEW_LEAD" as ClientStatus,
};

function formatStatusLabel(status: string): string {
  return status
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

function escapeCsvField(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export default function ClientsPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState(emptyForm);

  // Delete confirmation state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Quick status update loading tracker
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);

  const fetchClients = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      if (search.trim()) params.set("search", search.trim());
      const res = await fetch(`/api/clients?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch clients");
      const data = await res.json();
      setClients(data);
    } catch {
      toast({
        title: "Error",
        description: "Failed to load clients.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search, toast]);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  // Enhanced client-side search: filter on name, email, phone, parentNames
  // The API already filters by first/last name server-side, but we additionally
  // filter client-side for email, phone, and parent names.
  const filtered = clients.filter((c) => {
    if (!search.trim()) return true;
    const term = search.trim().toLowerCase();
    return (
      c.boyFirstName.toLowerCase().includes(term) ||
      c.boyLastName.toLowerCase().includes(term) ||
      `${c.boyFirstName} ${c.boyLastName}`.toLowerCase().includes(term) ||
      c.email.toLowerCase().includes(term) ||
      c.phone.toLowerCase().includes(term) ||
      c.parentNames.toLowerCase().includes(term)
    );
  });

  // Sort
  const sorted = [...filtered].sort((a, b) => {
    let aVal: string | number = a[sortKey] ?? "";
    let bVal: string | number = b[sortKey] ?? "";
    if (sortKey === "age") {
      aVal = Number(aVal);
      bVal = Number(bVal);
    }
    if (typeof aVal === "string") aVal = aVal.toLowerCase();
    if (typeof bVal === "string") bVal = bVal.toLowerCase();
    if (aVal < bVal) return sortDir === "asc" ? -1 : 1;
    if (aVal > bVal) return sortDir === "asc" ? 1 : -1;
    return 0;
  });

  // Paginate
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const paginated = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, sortKey, sortDir]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const SortIcon = ({ column }: { column: SortKey }) => {
    if (sortKey !== column) return null;
    return sortDir === "asc" ? (
      <ChevronUp className="inline h-4 w-4 ml-1" />
    ) : (
      <ChevronDown className="inline h-4 w-4 ml-1" />
    );
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const body = { ...form, age: Number(form.age) };
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to create client");
      }
      toast({ title: "Success", description: "Client created successfully." });
      setDialogOpen(false);
      setForm(emptyForm);
      fetchClients();
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to create client.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const updateForm = (field: string, value: string) => {
    setForm((f) => ({ ...f, [field]: value }));
  };

  // Delete client
  const handleDeleteClick = (
    e: React.MouseEvent,
    client: Client
  ) => {
    e.stopPropagation();
    setClientToDelete(client);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!clientToDelete) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/clients/${clientToDelete.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to delete client");
      }
      toast({ title: "Deleted", description: "Client deleted successfully." });
      setDeleteDialogOpen(false);
      setClientToDelete(null);
      fetchClients();
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to delete client.",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  // Quick status update
  const handleQuickStatusChange = async (
    e: React.MouseEvent | undefined,
    clientId: string,
    newStatus: ClientStatus
  ) => {
    // Stop row click propagation when called from select
    setUpdatingStatusId(clientId);
    try {
      const res = await fetch(`/api/clients/${clientId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to update status");
      }
      // Update local state to avoid full refetch
      setClients((prev) =>
        prev.map((c) => (c.id === clientId ? { ...c, status: newStatus } : c))
      );
      toast({
        title: "Status Updated",
        description: `Status changed to ${formatStatusLabel(newStatus)}.`,
      });
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to update status.",
        variant: "destructive",
      });
    } finally {
      setUpdatingStatusId(null);
    }
  };

  // Export CSV
  const handleExportCsv = () => {
    if (sorted.length === 0) {
      toast({
        title: "No Data",
        description: "No clients to export.",
        variant: "destructive",
      });
      return;
    }

    const headers = [
      "First Name",
      "Last Name",
      "Age",
      "Grade",
      "Parent Names",
      "Phone",
      "Email",
      "City",
      "Current School",
      "Referral Source",
      "Status",
      "Notes",
      "Created At",
    ];

    const rows = sorted.map((c) => [
      escapeCsvField(c.boyFirstName),
      escapeCsvField(c.boyLastName),
      String(c.age),
      escapeCsvField(c.grade),
      escapeCsvField(c.parentNames),
      escapeCsvField(c.phone),
      escapeCsvField(c.email),
      escapeCsvField(c.city),
      escapeCsvField(c.currentSchool),
      escapeCsvField(c.referralSource),
      formatStatusLabel(c.status),
      escapeCsvField(c.notes ?? ""),
      formatDate(c.createdAt),
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join(
      "\n"
    );

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `clients-export-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({ title: "Exported", description: `${sorted.length} clients exported to CSV.` });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold" style={{ color: "#1e3a5f" }}>
          Clients
        </h1>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleExportCsv}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button
                style={{ backgroundColor: "#1e3a5f" }}
                className="text-white hover:opacity-90"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Client
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Add New Client</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="boyFirstName">First Name *</Label>
                    <Input
                      id="boyFirstName"
                      required
                      value={form.boyFirstName}
                      onChange={(e) => updateForm("boyFirstName", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="boyLastName">Last Name *</Label>
                    <Input
                      id="boyLastName"
                      required
                      value={form.boyLastName}
                      onChange={(e) => updateForm("boyLastName", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="age">Age *</Label>
                    <Input
                      id="age"
                      type="number"
                      required
                      min={1}
                      max={25}
                      value={form.age}
                      onChange={(e) => updateForm("age", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="grade">Grade *</Label>
                    <Input
                      id="grade"
                      required
                      value={form.grade}
                      onChange={(e) => updateForm("grade", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="parentNames">Parent Names *</Label>
                    <Input
                      id="parentNames"
                      required
                      value={form.parentNames}
                      onChange={(e) => updateForm("parentNames", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone *</Label>
                    <Input
                      id="phone"
                      required
                      value={form.phone}
                      onChange={(e) => updateForm("phone", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      required
                      value={form.email}
                      onChange={(e) => updateForm("email", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="city">City *</Label>
                    <Input
                      id="city"
                      required
                      value={form.city}
                      onChange={(e) => updateForm("city", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="currentSchool">Current School</Label>
                    <Input
                      id="currentSchool"
                      value={form.currentSchool}
                      onChange={(e) => updateForm("currentSchool", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="referralSource">Referral Source</Label>
                    <Input
                      id="referralSource"
                      value={form.referralSource}
                      onChange={(e) =>
                        updateForm("referralSource", e.target.value)
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select
                      value={form.status}
                      onValueChange={(v) => updateForm("status", v)}
                    >
                      <SelectTrigger id="status">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CLIENT_STATUSES.map((s) => (
                          <SelectItem key={s} value={s}>
                            {s.replace(/_/g, " ")}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      value={form.notes}
                      onChange={(e) => updateForm("notes", e.target.value)}
                      rows={3}
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={submitting}
                    style={{ backgroundColor: "#1e3a5f" }}
                    className="text-white hover:opacity-90"
                  >
                    {submitting ? "Creating..." : "Create Client"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search by name, email, phone, parent..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Statuses</SelectItem>
            {CLIENT_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {s.replace(/_/g, " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-white">
        {loading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead
                    className="cursor-pointer select-none"
                    onClick={() => handleSort("boyFirstName")}
                  >
                    Name <SortIcon column="boyFirstName" />
                  </TableHead>
                  <TableHead
                    className="cursor-pointer select-none"
                    onClick={() => handleSort("age")}
                  >
                    Age <SortIcon column="age" />
                  </TableHead>
                  <TableHead
                    className="cursor-pointer select-none"
                    onClick={() => handleSort("grade")}
                  >
                    Grade <SortIcon column="grade" />
                  </TableHead>
                  <TableHead
                    className="cursor-pointer select-none"
                    onClick={() => handleSort("city")}
                  >
                    City <SortIcon column="city" />
                  </TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead
                    className="cursor-pointer select-none"
                    onClick={() => handleSort("status")}
                  >
                    Status <SortIcon column="status" />
                  </TableHead>
                  <TableHead
                    className="cursor-pointer select-none"
                    onClick={() => handleSort("parentNames")}
                  >
                    Parent <SortIcon column="parentNames" />
                  </TableHead>
                  <TableHead
                    className="cursor-pointer select-none"
                    onClick={() => handleSort("createdAt")}
                  >
                    Created <SortIcon column="createdAt" />
                  </TableHead>
                  <TableHead className="w-[60px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={9}
                      className="text-center py-8 text-gray-500"
                    >
                      No clients found.
                    </TableCell>
                  </TableRow>
                ) : (
                  paginated.map((client) => (
                    <TableRow
                      key={client.id}
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => router.push(`/clients/${client.id}`)}
                    >
                      <TableCell className="font-medium">
                        {client.boyFirstName} {client.boyLastName}
                      </TableCell>
                      <TableCell>{client.age}</TableCell>
                      <TableCell>{client.grade}</TableCell>
                      <TableCell>{client.city}</TableCell>
                      {/* Email / Phone quick actions */}
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {client.email && (
                            <a
                              href={`mailto:${client.email}`}
                              onClick={(e) => e.stopPropagation()}
                              title={client.email}
                              className="inline-flex items-center justify-center rounded-md p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                            >
                              <Mail className="h-4 w-4" />
                            </a>
                          )}
                          {client.phone && (
                            <a
                              href={`tel:${client.phone}`}
                              onClick={(e) => e.stopPropagation()}
                              title={client.phone}
                              className="inline-flex items-center justify-center rounded-md p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 transition-colors"
                            >
                              <Phone className="h-4 w-4" />
                            </a>
                          )}
                        </div>
                      </TableCell>
                      {/* Quick edit status dropdown */}
                      <TableCell>
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="min-w-[160px]"
                        >
                          <Select
                            value={client.status}
                            onValueChange={(newStatus) =>
                              handleQuickStatusChange(
                                undefined,
                                client.id,
                                newStatus as ClientStatus
                              )
                            }
                            disabled={updatingStatusId === client.id}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue>
                                {updatingStatusId === client.id ? (
                                  <span className="text-gray-400">
                                    Updating...
                                  </span>
                                ) : (
                                  <StatusBadge status={client.status} />
                                )}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              {CLIENT_STATUSES.map((s) => (
                                <SelectItem key={s} value={s}>
                                  {formatStatusLabel(s)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </TableCell>
                      <TableCell>{client.parentNames}</TableCell>
                      <TableCell>{formatDate(client.createdAt)}</TableCell>
                      {/* Delete button */}
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-gray-400 hover:text-red-600 hover:bg-red-50"
                          onClick={(e) => handleDeleteClick(e, client)}
                          title="Delete client"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t px-4 py-3">
                <p className="text-sm text-gray-600">
                  Showing {(page - 1) * PAGE_SIZE + 1}
                  {" - "}
                  {Math.min(page * PAGE_SIZE, sorted.length)} of {sorted.length}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm text-gray-600">
                    Page {page} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Delete Client</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{" "}
              <span className="font-semibold">
                {clientToDelete?.boyFirstName} {clientToDelete?.boyLastName}
              </span>
              ? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false);
                setClientToDelete(null);
              }}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={deleting}
            >
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
