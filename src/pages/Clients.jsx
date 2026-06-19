import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Search, ArrowUpDown, Users } from "lucide-react";
import StatusBadge from "@/components/StatusBadge";
import ClientFormDrawer from "@/components/clients/ClientFormDrawer";
import { CLIENT_STATUSES, RELIGIOUS_LEVELS } from "@/lib/constants";
import { getEffectiveRole, can } from "@/lib/roles";
import { useRole } from "@/lib/useRole";

const PAGE_SIZE = 12;

export default function Clients() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { role } = useRole();
  const canWrite = can(role, "clients.write");
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState(params.get("status") || "all");
  const [religious, setReligious] = useState("all");
  const [city, setCity] = useState("all");
  const [readyOnly] = useState(params.get("ready") === "1");
  const [sort, setSort] = useState({ key: "boy_last_name", dir: "asc" });
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [editClient, setEditClient] = useState(null);

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ["clients"], queryFn: () => base44.entities.Client.list("-created_date", 1000),
  });
  const { data: users = [] } = useQuery({
    queryKey: ["users"], queryFn: () => base44.entities.User.list("-created_date", 200),
  });
  const evaluators = users.filter((u) => getEffectiveRole(u) === "evaluator" || u.crm_role === "evaluator");

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Client.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["clients"] }); toast.success("Client added"); },
    onError: () => toast.error("Failed to add client"),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Client.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["clients"] }); toast.success("Client updated"); },
    onError: () => toast.error("Failed to update client"),
  });

  const cities = useMemo(
    () => Array.from(new Set(clients.map((c) => c.city).filter(Boolean))).sort(),
    [clients]
  );

  const filtered = useMemo(() => {
    let rows = clients.filter((c) => {
      const name = `${c.boy_first_name || ""} ${c.boy_last_name || ""} ${c.father_name || ""} ${c.mother_name || ""}`.toLowerCase();
      if (search && !name.includes(search.toLowerCase())) return false;
      if (status !== "all" && c.status !== status) return false;
      if (religious !== "all" && c.religious_level !== religious) return false;
      if (city !== "all" && c.city !== city) return false;
      if (readyOnly && !c.ready_to_bill) return false;
      return true;
    });
    rows = rows.sort((a, b) => {
      const av = (a[sort.key] || "").toString().toLowerCase();
      const bv = (b[sort.key] || "").toString().toLowerCase();
      if (av < bv) return sort.dir === "asc" ? -1 : 1;
      if (av > bv) return sort.dir === "asc" ? 1 : -1;
      return 0;
    });
    return rows;
  }, [clients, search, status, religious, city, readyOnly, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const toggleSort = (key) =>
    setSort((s) => ({ key, dir: s.key === key && s.dir === "asc" ? "desc" : "asc" }));

  const SortHead = ({ k, children }) => (
    <TableHead className="cursor-pointer select-none" onClick={() => toggleSort(k)}>
      <span className="inline-flex items-center gap-1">{children}<ArrowUpDown className="w-3 h-3 text-gray-300" /></span>
    </TableHead>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
          <p className="text-sm text-gray-500 mt-1">{filtered.length} of {clients.length} clients</p>
        </div>
        {canWrite && (
          <Button onClick={() => setShowForm(true)} className="bg-[#1e3a5f] hover:bg-[#1e3a5f]/90 gap-2">
            <Plus className="w-4 h-4" /> Add Client
          </Button>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100">
        <div className="p-4 border-b border-gray-50 grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div className="relative sm:col-span-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input placeholder="Search name..." className="pl-9" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
          </div>
          <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
            <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {CLIENT_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={religious} onValueChange={(v) => { setReligious(v); setPage(1); }}>
            <SelectTrigger><SelectValue placeholder="Religious Level" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Levels</SelectItem>
              {RELIGIOUS_LEVELS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={city} onValueChange={(v) => { setCity(v); setPage(1); }}>
            <SelectTrigger><SelectValue placeholder="City" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Cities</SelectItem>
              {cities.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="p-5 space-y-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
        ) : pageRows.length === 0 ? (
          <div className="text-center py-16">
            <Users className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">No clients found</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <SortHead k="boy_last_name">Name</SortHead>
                <TableHead>Grade</TableHead>
                <SortHead k="city">City</SortHead>
                <TableHead>Religious Level</TableHead>
                <TableHead>Parent Phone</TableHead>
                <SortHead k="status">Status</SortHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageRows.map((c) => (
                <TableRow key={c.id} className="cursor-pointer" onClick={() => navigate(`${createPageUrl("ClientDetail")}?id=${c.id}`)}>
                  <TableCell className="font-medium text-gray-900">{c.boy_first_name} {c.boy_last_name}</TableCell>
                  <TableCell className="text-gray-500">{c.grade_level || "—"}</TableCell>
                  <TableCell className="text-gray-500">{c.city || "—"}</TableCell>
                  <TableCell className="text-gray-500">{c.religious_level || "—"}</TableCell>
                  <TableCell className="text-gray-500">{c.parent_phone || "—"}</TableCell>
                  <TableCell><StatusBadge status={c.status} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-50">
            <p className="text-xs text-gray-400">Page {page} of {totalPages}</p>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
              <Button size="sm" variant="outline" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
            </div>
          </div>
        )}
      </div>

      <ClientFormDrawer
        open={showForm}
        onOpenChange={setShowForm}
        evaluators={evaluators}
        onSave={(data) => createMutation.mutateAsync(data)}
      />
      <ClientFormDrawer
        open={!!editClient}
        onOpenChange={() => setEditClient(null)}
        client={editClient}
        evaluators={evaluators}
        onSave={(data) => updateMutation.mutateAsync({ id: editClient.id, data })}
      />
    </div>
  );
}
