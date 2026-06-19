import React, { useEffect, useMemo, useRef, useState } from "react";
import { firebaseClient } from "@/api/firebaseClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { ClipboardList } from "lucide-react";
import StatusBadge from "@/components/StatusBadge";
import EvaluationFormDialog from "@/components/evaluations/EvaluationFormDialog";
import { EVALUATION_STATUSES } from "@/lib/constants";
import { onEvaluationCompleted, syncDueEvaluationAppointments } from "@/lib/automations";
import { fmtDate, fmtDateTime } from "@/lib/format";

function localDateKey(value) {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return "";
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function dueLabel(value) {
  const appointmentKey = localDateKey(value);
  if (!appointmentKey) return "";
  const todayKey = localDateKey(new Date());
  if (appointmentKey === todayKey) return "Today";
  if (appointmentKey < todayKey) return "Overdue";
  return "Upcoming";
}

export default function Evaluations() {
  const queryClient = useQueryClient();

  const [statusFilter, setStatusFilter] = useState("open");
  const [active, setActive] = useState(null);
  const lastSyncKeyRef = useRef("");

  const { data: evaluations = [], isLoading } = useQuery({
    queryKey: ["evaluations"], queryFn: () => firebaseClient.entities.Evaluation.list("-created_date", 1000),
  });
  const { data: appointments = [], isLoading: appointmentsLoading } = useQuery({
    queryKey: ["appointments"], queryFn: () => firebaseClient.entities.Appointment.list("-date_time", 1000),
  });

  const dueSyncKey = useMemo(
    () => appointments
      .filter((appointment) => (appointment.meeting_type || "Evaluation") === "Evaluation")
      .map((appointment) => `${appointment.id}:${appointment.date_time}:${appointment.status}`)
      .join("|"),
    [appointments]
  );

  useEffect(() => {
    if (appointmentsLoading || !dueSyncKey || lastSyncKeyRef.current === dueSyncKey) return;
    lastSyncKeyRef.current = dueSyncKey;

    syncDueEvaluationAppointments(appointments)
      .then((syncedCount) => {
        if (syncedCount > 0) {
          queryClient.invalidateQueries({ queryKey: ["evaluations"] });
          queryClient.invalidateQueries({ queryKey: ["clients"] });
          queryClient.invalidateQueries({ queryKey: ["billing"] });
        }
      })
      .catch((error) => {
        console.error("Due evaluation sync failed:", error);
      });
  }, [appointments, appointmentsLoading, dueSyncKey, queryClient]);

  const updateMutation = useMutation({
    mutationFn: async ({ id, data, nextStatus, prev }) => {
      const payload = { ...data, status: nextStatus };
      const updated = await firebaseClient.entities.Evaluation.update(id, payload);
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
                <TableHead>Appointment</TableHead>
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
                  <TableCell className="text-gray-500">
                    <div className="flex flex-col gap-1">
                      <span>{fmtDateTime(e.appointment_date)}</span>
                      {dueLabel(e.appointment_date) && (
                        <span className="w-fit rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700">
                          {dueLabel(e.appointment_date)}
                        </span>
                      )}
                    </div>
                  </TableCell>
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
