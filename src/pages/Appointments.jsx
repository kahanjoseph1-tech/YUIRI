import React, { useMemo, useState } from "react";
import { firebaseClient } from "@/api/firebaseClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, CalendarDays, Clock, List, Calendar as CalendarIcon } from "lucide-react";
import StatusBadge from "@/components/StatusBadge";
import AppointmentFormDialog from "@/components/appointments/AppointmentFormDialog";
import AppointmentCalendar from "@/components/appointments/AppointmentCalendar";
import AvailabilityDialog from "@/components/appointments/AvailabilityDialog";
import DayScheduleDialog from "@/components/appointments/DayScheduleDialog";
import { APPOINTMENT_STATUSES } from "@/lib/constants";
import { ensureEvaluationBillingForAppointment, onAppointmentCompleted } from "@/lib/automations";
import { can } from "@/lib/roles";
import { useRole } from "@/lib/useRole";
import { fmtDateTime } from "@/lib/format";
import { attendeeSummary } from "@/lib/appointmentContacts";

function availabilityPayload(row) {
  return {
    day_of_week: Number(row.day_of_week),
    time: row.time || "09:00",
    duration_minutes: Number(row.duration_minutes || 60),
    location: row.location || "Office",
    evaluator_name: row.evaluator_name || "",
    active: row.active !== false,
  };
}

export default function Appointments() {
  const queryClient = useQueryClient();
  const { role } = useRole();
  const canWrite = can(role, "appointments.write");

  const [view, setView] = useState("calendar");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [showAvailability, setShowAvailability] = useState(false);
  const [editAppt, setEditAppt] = useState(null);
  const [selectedDay, setSelectedDay] = useState(null);
  const [appointmentDefaults, setAppointmentDefaults] = useState(null);

  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ["appointments"], queryFn: () => firebaseClient.entities.Appointment.list("-date_time", 1000),
  });
  const { data: clients = [] } = useQuery({
    queryKey: ["clients"], queryFn: () => firebaseClient.entities.Client.list("-created_date", 1000),
  });
  const { data: availabilitySlots = [] } = useQuery({
    queryKey: ["appointment-availability"],
    queryFn: () => firebaseClient.entities.AppointmentAvailability.list("day_of_week", 500),
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const appointment = await firebaseClient.entities.Appointment.create(data);
      await ensureEvaluationBillingForAppointment(appointment);
      return appointment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      queryClient.invalidateQueries({ queryKey: ["billing"] });
      toast.success("Appointment created");
    },
    onError: () => toast.error("Failed to create"),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data, prev }) => {
      const updated = await firebaseClient.entities.Appointment.update(id, data);
      await ensureEvaluationBillingForAppointment(updated);
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
      queryClient.invalidateQueries({ queryKey: ["billing"] });
      if (vars.data.status === "Completed" && vars.prev?.status !== "Completed") {
        toast.success("Marked complete — evaluation created");
      } else {
        toast.success("Appointment updated");
      }
    },
    onError: () => toast.error("Update failed"),
  });

  const availabilityMutation = useMutation({
    mutationFn: async (rows) => {
      const existingIds = new Set(availabilitySlots.map((slot) => slot.id));
      const nextIds = new Set(rows.filter((row) => row.id).map((row) => row.id));
      const removals = availabilitySlots
        .filter((slot) => !nextIds.has(slot.id))
        .map((slot) => firebaseClient.entities.AppointmentAvailability.delete(slot.id));
      const writes = rows.map((row) => {
        const payload = availabilityPayload(row);
        if (row.id && existingIds.has(row.id)) {
          return firebaseClient.entities.AppointmentAvailability.update(row.id, payload);
        }
        return firebaseClient.entities.AppointmentAvailability.create(payload);
      });
      await Promise.all([...removals, ...writes]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointment-availability"] });
      toast.success("Available slots saved");
    },
    onError: () => toast.error("Could not save slots"),
  });

  const roleVisibleAppointments = useMemo(() => appointments, [appointments]);

  let visible = roleVisibleAppointments;
  if (statusFilter !== "all") visible = visible.filter((a) => a.status === statusFilter);

  const sortedAvailabilitySlots = useMemo(
    () => [...availabilitySlots].sort((a, b) => {
      const dayDiff = Number(a.day_of_week) - Number(b.day_of_week);
      if (dayDiff !== 0) return dayDiff;
      const evaluatorDiff = String(a.evaluator_name || "").localeCompare(String(b.evaluator_name || ""));
      if (evaluatorDiff !== 0) return evaluatorDiff;
      return String(a.time || "").localeCompare(String(b.time || ""));
    }),
    [availabilitySlots]
  );

  const openNewAppointment = (defaults = null) => {
    setAppointmentDefaults(defaults);
    setShowForm(true);
  };

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
            <Button variant="outline" onClick={() => setShowAvailability(true)} className="gap-2">
              <Clock className="w-4 h-4" /> Available Slots
            </Button>
          )}
          {canWrite && (
            <Button onClick={() => openNewAppointment()} className="bg-[#1e3a5f] hover:bg-[#1e3a5f]/90 gap-2">
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
        <AppointmentCalendar
          appointments={visible}
          availabilitySlots={sortedAvailabilitySlots}
          onSelect={(a) => (canWrite ? setEditAppt(a) : null)}
          onDaySelect={(day) => setSelectedDay(day)}
        />
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
                {attendeeSummary(a) && <p className="text-xs text-gray-400">{attendeeSummary(a)}</p>}
              </div>
              <StatusBadge status={a.status} />
            </div>
          ))}
        </div>
      )}

      <AppointmentFormDialog
        open={showForm} onOpenChange={setShowForm}
        clients={clients}
        defaultDateTime={appointmentDefaults?.date_time || ""}
        defaultLocation={appointmentDefaults?.location || "Office"}
        defaultEvaluatorName={appointmentDefaults?.evaluator_name || ""}
        onSave={(data) => createMutation.mutateAsync(data)}
      />
      <AppointmentFormDialog
        open={!!editAppt} onOpenChange={() => setEditAppt(null)}
        appointment={editAppt} clients={clients}
        onSave={(data) => updateMutation.mutateAsync({ id: editAppt.id, data, prev: editAppt })}
      />
      <DayScheduleDialog
        open={!!selectedDay}
        onOpenChange={(open) => !open && setSelectedDay(null)}
        day={selectedDay}
        appointments={roleVisibleAppointments}
        availabilitySlots={sortedAvailabilitySlots}
        clients={clients}
        canWrite={canWrite}
        onCancel={(appointment) => updateMutation.mutateAsync({
          id: appointment.id,
          data: { ...appointment, status: "Cancelled" },
          prev: appointment,
        })}
        onReschedule={(appointment) => {
          setSelectedDay(null);
          setEditAppt({ ...appointment, status: "Rescheduled" });
        }}
        onEdit={(appointment) => {
          setSelectedDay(null);
          setEditAppt(appointment);
        }}
        onSchedule={(defaults) => {
          setSelectedDay(null);
          openNewAppointment(defaults);
        }}
      />
      <AvailabilityDialog
        open={showAvailability}
        onOpenChange={setShowAvailability}
        slots={sortedAvailabilitySlots}
        saving={availabilityMutation.isPending}
        onSave={(rows) => availabilityMutation.mutateAsync(rows)}
      />
    </div>
  );
}
