import React, { useMemo, useState } from "react";
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

function placementClientKey(placement) {
  return placement.client_id || placement.client_name || placement.id;
}

function placementPriority(placement) {
  if (placement.is_final || placement.status === "Enrolled") return 0;
  if (placement.status === "Accepted") return 1;
  if (placement.status === "Recommended") return 2;
  return 3;
}

function placementDateValue(placement) {
  const value = placement.closed_date || placement.decision_date || placement.updated_date || placement.created_date;
  const time = Date.parse(value || "");
  return Number.isNaN(time) ? 0 : time;
}

function groupedPlacementRows(placements) {
  const groups = new Map();

  placements.forEach((placement) => {
    const key = placementClientKey(placement);
    if (!groups.has(key)) {
      groups.set(key, {
        key,
        clientName: placement.client_name || "Client",
        placements: [],
      });
    }
    groups.get(key).placements.push(placement);
  });

  return Array.from(groups.values())
    .map((group) => ({
      ...group,
      placements: [...group.placements].sort((a, b) => {
        const priorityDiff = placementPriority(a) - placementPriority(b);
        if (priorityDiff !== 0) return priorityDiff;
        return placementDateValue(b) - placementDateValue(a);
      }),
    }))
    .sort((a, b) => a.clientName.localeCompare(b.clientName));
}

function summaryPlacement(placements) {
  return placements.find((placement) => placement.is_final || placement.status === "Enrolled") ||
    placements.find((placement) => placement.status === "Accepted") ||
    placements[0];
}

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
      const nextData = data.status === "Enrolled"
        ? {
            ...data,
            placement_type: data.placement_type || "Final Placement",
            is_final: true,
            closed_date: data.closed_date || new Date().toISOString(),
          }
        : data;
      const updated = await firebaseClient.entities.Placement.update(id, nextData);
      if (nextData.status === "Enrolled" && prev?.status !== "Enrolled") {
        await onPlacementEnrolled({ ...prev, ...nextData, id });
      }
      return updated;
    },
    onSuccess: (_r, vars) => {
      queryClient.invalidateQueries({ queryKey: ["placements"] });
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      queryClient.invalidateQueries({ queryKey: ["open_cases"] });
      if (vars.data.status === "Enrolled" && vars.prev?.status !== "Enrolled") {
        toast.success("Enrolled — client marked Accepted");
      } else {
        toast.success("Placement updated");
      }
    },
    onError: () => toast.error("Update failed"),
  });

  const visible = statusFilter === "all" ? placements : placements.filter((p) => p.status === statusFilter);
  const groupedVisible = useMemo(() => groupedPlacementRows(visible), [visible]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Placements</h1>
          <p className="text-sm text-gray-500 mt-1">
            {groupedVisible.length} clients{visible.length !== groupedVisible.length ? `, ${visible.length} yeshiva records` : ""}
          </p>
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
        ) : groupedVisible.length === 0 ? (
          <div className="text-center py-16">
            <ArrowRightLeft className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">No placements yet</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Yeshiva Recommendations</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {groupedVisible.map((group) => {
                const summary = summaryPlacement(group.placements);
                return (
                  <TableRow key={group.key}>
                    <TableCell className="align-top font-medium text-gray-900">{group.clientName || "Client"}</TableCell>
                    <TableCell>
                      <div className="space-y-2">
                        {group.placements.map((placement) => (
                          <button
                            key={placement.id}
                            type="button"
                            disabled={!canWrite}
                            onClick={() => setEditPlacement(placement)}
                            className={`w-full rounded-lg border border-gray-100 px-3 py-2 text-left transition-colors ${
                              canWrite ? "hover:border-blue-200 hover:bg-blue-50/40" : "cursor-default"
                            }`}
                          >
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-sm font-medium text-gray-900">{placement.school_name || "Yeshiva"}</span>
                              {placement.match_score != null && (
                                <Badge variant="outline" className="text-[10px]">Match {placement.match_score}</Badge>
                              )}
                              <StatusBadge status={placement.status} />
                            </div>
                            {placement.match_reasons && (
                              <p className="mt-1 line-clamp-1 text-xs text-gray-400">{placement.match_reasons}</p>
                            )}
                          </button>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="align-top"><StatusBadge status={summary?.status} /></TableCell>
                  </TableRow>
                );
              })}
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
