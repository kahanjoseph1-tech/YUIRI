import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { ClipboardList } from "lucide-react";
import StatusBadge from "@/components/StatusBadge";
import EvaluationFormDialog from "@/components/evaluations/EvaluationFormDialog";
import { EVALUATION_STATUSES } from "@/lib/constants";
import { onEvaluationCompleted } from "@/lib/automations";
import { fmtDate } from "@/lib/format";

export default function Evaluations() {
  const queryClient = useQueryClient();

  const [statusFilter, setStatusFilter] = useState("open");
  const [active, setActive] = useState(null);

  const { data: evaluations = [], isLoading } = useQuery({
    queryKey: ["evaluations"], queryFn: () => base44.entities.Evaluation.list("-created_date", 1000),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data, nextStatus, prev }) => {
      const payload = { ...data, status: nextStatus };
      const updated = await base44.entities.Evaluation.update(id, payload);
      if (nextStatus === "Completed" && prev?.status !== "Completed") {
        await onEvaluationCompleted({ ...prev, ...payload, id });
      }
      return updated;
    },
    onSuccess: (_r, vars) => {
      queryClient.invalidateQueries({ queryKey: ["evaluations"] });
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      queryClient.invalidateQueries({ queryKey: ["billing"] });
      if (vars.nextStatus === "Completed" && vars.prev?.status !== "Completed") {
        toast.success("Evaluation completed — client ready for matching & billing");
      } else {
        toast.success("Draft saved");
      }
    },
    onError: () => toast.error("Save failed"),
  });

  let visible = evaluations;
  if (statusFilter === "open") visible = visible.filter((e) => e.status === "Pending" || e.status === "In Progress");
  else if (statusFilter !== "all") visible = visible.filter((e) => e.status === statusFilter);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Evaluations</h1>
          <p className="text-sm text-gray-500 mt-1">{visible.length} in queue</p>
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="open">Pending + In Progress</SelectItem>
            <SelectItem value="all">All</SelectItem>
            {EVALUATION_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100">
        {isLoading ? (
          <div className="p-5 space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
        ) : visible.length === 0 ? (
          <div className="text-center py-16">
            <ClipboardList className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">No evaluations in queue</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Evaluator</TableHead>
                <TableHead>Urgency</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((e) => (
                <TableRow key={e.id} className="cursor-pointer" onClick={() => setActive(e)}>
                  <TableCell className="font-medium text-gray-900">{e.client_name || "—"}</TableCell>
                  <TableCell className="text-gray-500">{e.evaluator_name || "—"}</TableCell>
                  <TableCell>{e.urgency ? <StatusBadge status={e.urgency} /> : <span className="text-gray-400">—</span>}</TableCell>
                  <TableCell className="text-gray-500">{fmtDate(e.created_date)}</TableCell>
                  <TableCell><StatusBadge status={e.status} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <EvaluationFormDialog
        open={!!active}
        onOpenChange={() => setActive(null)}
        evaluation={active}
        onSave={(data, nextStatus) => updateMutation.mutateAsync({ id: active.id, data, nextStatus, prev: active })}
      />
    </div>
  );
}
