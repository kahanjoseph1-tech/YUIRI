import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, CalendarDays, List, Calendar as CalendarIcon } from "lucide-react";
import StatusBadge from "@/components/StatusBadge";
import AppointmentFormDialog from "@/components/appointments/AppointmentFormDialog";
import AppointmentCalendar from "@/components/appointments/AppointmentCalendar";
import { APPOINTMENT_STATUSES } from "@/lib/constants";
import { onAppointmentCompleted } from "@/lib/automations";
import { getEffectiveRole, can } from "@/lib/roles";
import { useRole } from "@/lib/useRole";
import { fmtDateTime } from "@/lib/format";

export default function Appointments() {
  const queryClient = useQueryClient();
  const { user, role } = useRole();
  const canWrite = can(role, "appointments.write");
  const isEvaluator = role === "evaluator";

  const [view, setView] = useState("calendar");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editAppt, setEditAppt] = useState(null);

  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ["appointments"], queryFn: () => base44.entities.Appointment.list("-date_time", 1000),
  });
  const { data: clients = [] } = useQuery({
    queryKey: ["clients"], queryFn: () => base44.entities.Client.list("-created_date", 1000),
  });
  const { data: users = [] } = useQuery({
    queryKey: ["users"], queryFn: () => base44.entities.User.list("-created_date", 200),
  });
  const evaluators = users.filter((u) => getEffectiveRole(u) === "evaluator" || u.crm_role === "evaluator");

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Appointment.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["appointments"] }); toast.success("Appointment created"); },
    onError: () => toast.error("Failed to create"),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data, prev }) => {
      const updated = await base44.entities.Appointment.update(id, data);
      // Automation: status -> Completed creates an Evaluation + moves client to Evaluating.
      if (data.status === "Completed" && prev?.status !== "Completed") {
        await onAppointmentCompleted({ ...prev, ...data, id });
      }
      return updated;
    },
    onSuccess: (_r, vars) => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      queryClient.invalidateQueries({ queryKey: ["evaluations"] });
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      if (vars.data.status === "Completed" && vars.prev?.status !== "Completed") {
        toast.success("Marked complete — evaluation created");
      } else {
        toast.success("Appointment updated");
      }
    },
    onError: () => toast.error("Update failed"),
  });

  // Evaluators only see their own appointments.
  let visible = appointments;
  if (isEvaluator) visible = visible.filter((a) => a.evaluator_id === user?.id);
  if (statusFilter !== "all") visible = visible.filter((a) => a.status === statusFilter);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Appointments</h1>
          <p className="text-sm text-gray-500 mt-1">{visible.length} appointments</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-gray-200 p-0.5">
            <button onClick={() => setView("calendar")} className={`px-3 py-1.5 rounded-md text-sm flex items-center gap-1.5 ${view === "calendar" ? "bg-[#1e3a5f] text-white" : "text-gray-500"}`}>
              <CalendarDays className="w-4 h-4" /> Calendar
            </button>
            <button onClick={() => setView("list")} className={`px-3 py-1.5 rounded-md text-sm flex items-center gap-1.5 ${view === "list" ? "bg-[#1e3a5f] text-white" : "text-gray-500"}`}>
              <List className="w-4 h-4" /> List
            </button>
          </div>
          {canWrite && (
            <Button onClick={() => setShowForm(true)} className="bg-[#1e3a5f] hover:bg-[#1e3a5f]/90 gap-2">
              <Plus className="w-4 h-4" /> New Appointment
            </Button>
          )}
        </div>
      </div>

      <div className="flex justify-end">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {APPOINTMENT_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <Skeleton className="h-96 rounded-2xl" />
      ) : view === "calendar" ? (
        <AppointmentCalendar appointments={visible} onSelect={(a) => (canWrite ? setEditAppt(a) : null)} />
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50">
          {visible.length === 0 ? (
            <div className="text-center py-16">
              <CalendarIcon className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">No appointments</p>
            </div>
          ) : visible.map((a) => (
            <div
              key={a.id}
              className={`flex items-center justify-between px-5 py-4 ${canWrite ? "cursor-pointer hover:bg-gray-50/50" : ""}`}
              onClick={() => (canWrite ? setEditAppt(a) : null)}
            >
              <div>
                <p className="text-sm font-semibold text-gray-900">{a.client_name || "Client"}</p>
                <p className="text-xs text-gray-400">{a.meeting_type || "Meeting"} · {fmtDateTime(a.date_time)}{a.evaluator_name ? ` · ${a.evaluator_name}` : ""}</p>
              </div>
              <StatusBadge status={a.status} />
            </div>
          ))}
        </div>
      )}

      <AppointmentFormDialog
        open={showForm} onOpenChange={setShowForm}
        clients={clients} evaluators={evaluators}
        onSave={(data) => createMutation.mutateAsync(data)}
      />
      <AppointmentFormDialog
        open={!!editAppt} onOpenChange={() => setEditAppt(null)}
        appointment={editAppt} clients={clients} evaluators={evaluators}
        onSave={(data) => updateMutation.mutateAsync({ id: editAppt.id, data, prev: editAppt })}
      />
    </div>
  );
}
