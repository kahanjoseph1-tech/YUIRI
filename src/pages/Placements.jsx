import React, { useState } from "react";
import { firebaseClient } from "@/api/firebaseClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, ArrowRightLeft } from "lucide-react";
import StatusBadge from "@/components/StatusBadge";
import MatchClientDialog from "@/components/placements/MatchClientDialog";
import PlacementFormDialog from "@/components/placements/PlacementFormDialog";
import { PLACEMENT_STATUSES } from "@/lib/constants";
import { onPlacementEnrolled } from "@/lib/automations";
import { can } from "@/lib/roles";
import { useRole } from "@/lib/useRole";

export default function Placements() {
  const queryClient = useQueryClient();
  const { role } = useRole();
  const canWrite = can(role, "placements.write");

  const [statusFilter, setStatusFilter] = useState("all");
  const [showMatch, setShowMatch] = useState(false);
  const [editPlacement, setEditPlacement] = useState(null);

  const { data: placements = [], isLoading } = useQuery({
    queryKey: ["placements"], queryFn: () => firebaseClient.entities.Placement.list("-created_date", 1000),
  });
  const { data: clients = [] } = useQuery({
    queryKey: ["clients"], queryFn: () => firebaseClient.entities.Client.list("-created_date", 1000),
  });
  const { data: schools = [] } = useQuery({
    queryKey: ["schools"], queryFn: () => firebaseClient.entities.School.list("-created_date", 1000),
  });

  const createMutation = useMutation({
    mutationFn: (data) => firebaseClient.entities.Placement.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["placements"] }); toast.success("Placement recommended"); },
    onError: () => toast.error("Failed to create"),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data, prev }) => {
      const updated = await firebaseClient.entities.Placement.update(id, data);
      if (data.status === "Enrolled" && prev?.status !== "Enrolled") {
        await onPlacementEnrolled({ ...prev, ...data, id });
      }
      return updated;
    },
    onSuccess: (_r, vars) => {
      queryClient.invalidateQueries({ queryKey: ["placements"] });
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      if (vars.data.status === "Enrolled" && vars.prev?.status !== "Enrolled") {
        toast.success("Enrolled — client marked Accepted");
      } else {
        toast.success("Placement updated");
      }
    },
    onError: () => toast.error("Update failed"),
  });

  const visible = statusFilter === "all" ? placements : placements.filter((p) => p.status === statusFilter);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Placements</h1>
          <p className="text-sm text-gray-500 mt-1">{visible.length} placements</p>
        </div>
        {canWrite && (
          <Button onClick={() => setShowMatch(true)} className="bg-[#1e3a5f] hover:bg-[#1e3a5f]/90 gap-2">
            <Plus className="w-4 h-4" /> Match a Client
          </Button>
        )}
      </div>

      <div className="flex justify-end">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {PLACEMENT_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100">
        {isLoading ? (
          <div className="p-5 space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
        ) : visible.length === 0 ? (
          <div className="text-center py-16">
            <ArrowRightLeft className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">No placements yet</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>School</TableHead>
                <TableHead>Match</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((p) => (
                <TableRow key={p.id} className={canWrite ? "cursor-pointer" : ""} onClick={() => (canWrite ? setEditPlacement(p) : null)}>
                  <TableCell className="font-medium text-gray-900">{p.client_name || "—"}</TableCell>
                  <TableCell className="text-gray-600">{p.school_name || "—"}</TableCell>
                  <TableCell>
                    {p.match_score != null ? <Badge variant="outline" className="text-[10px]">{p.match_score}</Badge> : <span className="text-gray-400">—</span>}
                  </TableCell>
                  <TableCell><StatusBadge status={p.status} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <MatchClientDialog
        open={showMatch} onOpenChange={setShowMatch}
        clients={clients} schools={schools}
        onCreate={(data) => createMutation.mutateAsync(data)}
      />
      <PlacementFormDialog
        open={!!editPlacement} onOpenChange={() => setEditPlacement(null)}
        placement={editPlacement}
        onSave={(data) => updateMutation.mutateAsync({ id: editPlacement.id, data, prev: editPlacement })}
      />
    </div>
  );
}
