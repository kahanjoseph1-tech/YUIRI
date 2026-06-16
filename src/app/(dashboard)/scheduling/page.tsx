"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addMonths,
  subMonths,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  parseISO,
} from "date-fns";
import { Plus, ChevronLeft, ChevronRight, Calendar, List, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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
import { cn, formatDateTime } from "@/lib/utils";
import type {
  Appointment,
  AppointmentStatus,
  MeetingType,
  Client,
  User,
} from "@/lib/types";

// Extended appointment type that includes the name fields returned by the API
type AppointmentWithNames = Appointment & {
  clientName?: string;
  evaluatorName?: string;
};

const STATUS_COLORS: Record<AppointmentStatus, string> = {
  SCHEDULED: "default",
  COMPLETED: "success",
  NO_SHOW: "destructive",
  RESCHEDULED: "warning",
  CANCELLED: "secondary",
} as const;

const MEETING_TYPE_LABELS: Record<MeetingType, string> = {
  INTAKE: "Intake",
  EVALUATION: "Evaluation",
  FOLLOW_UP: "Follow-Up",
  PARENT_MEETING: "Parent Meeting",
  OTHER: "Other",
};

function statusBadgeVariant(status: AppointmentStatus) {
  return STATUS_COLORS[status] as
    | "default"
    | "success"
    | "destructive"
    | "warning"
    | "secondary";
}

export default function SchedulingPage() {
  const { toast } = useToast();

  // Data state
  const [appointments, setAppointments] = useState<AppointmentWithNames[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [evaluators, setEvaluators] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter state
  const [filterEvaluator, setFilterEvaluator] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");

  // Dialog state
  const [newDialogOpen, setNewDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentWithNames | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Delete confirmation state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Calendar state
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  // New appointment form
  const [newForm, setNewForm] = useState({
    clientId: "",
    evaluatorId: "",
    dateTime: "",
    meetingType: "" as MeetingType | "",
    location: "",
    notes: "",
  });
  const [clientSearch, setClientSearch] = useState("");
  const [clientDropdownOpen, setClientDropdownOpen] = useState(false);
  const clientSearchRef = useRef<HTMLDivElement>(null);

  // Edit state for detail dialog
  const [editForm, setEditForm] = useState<{
    location: string;
    notes: string;
  }>({ location: "", notes: "" });

  const fetchAppointments = useCallback(async () => {
    try {
      const res = await fetch("/api/appointments");
      if (!res.ok) throw new Error("Failed to fetch appointments");
      const data = await res.json();
      setAppointments(data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load appointments";
      setError(msg);
      toast({ title: "Error", description: msg, variant: "destructive" });
    }
  }, [toast]);

  const fetchClients = useCallback(async () => {
    try {
      const res = await fetch("/api/clients");
      if (!res.ok) throw new Error("Failed to fetch clients");
      const data = await res.json();
      setClients(data);
    } catch {
      // Non-blocking
    }
  }, []);

  const fetchEvaluators = useCallback(async () => {
    try {
      const res = await fetch("/api/users");
      if (!res.ok) throw new Error("Failed to fetch users");
      const data: User[] = await res.json();
      setEvaluators(data);
    } catch {
      // Non-blocking
    }
  }, []);

  useEffect(() => {
    async function loadAll() {
      setLoading(true);
      await Promise.all([fetchAppointments(), fetchClients(), fetchEvaluators()]);
      setLoading(false);
    }
    loadAll();
  }, [fetchAppointments, fetchClients, fetchEvaluators]);

  // Close client dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (clientSearchRef.current && !clientSearchRef.current.contains(e.target as Node)) {
        setClientDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Filtered appointments for list view
  const filteredAppointments = useMemo(() => {
    return appointments.filter((a) => {
      if (filterEvaluator !== "all" && a.evaluatorId !== filterEvaluator) return false;
      if (filterStatus !== "all" && a.status !== filterStatus) return false;
      if (filterDateFrom && new Date(a.dateTime) < new Date(filterDateFrom)) return false;
      if (filterDateTo) {
        const to = new Date(filterDateTo);
        to.setHours(23, 59, 59, 999);
        if (new Date(a.dateTime) > to) return false;
      }
      return true;
    });
  }, [appointments, filterEvaluator, filterStatus, filterDateFrom, filterDateTo]);

  // Filtered clients for searchable dropdown
  const filteredClients = useMemo(() => {
    if (!clientSearch.trim()) return clients;
    const q = clientSearch.toLowerCase();
    return clients.filter(
      (c) =>
        `${c.boyFirstName} ${c.boyLastName}`.toLowerCase().includes(q) ||
        c.parentNames.toLowerCase().includes(q)
    );
  }, [clients, clientSearch]);

  // Calendar helpers
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const start = startOfWeek(monthStart);
    const end = endOfWeek(monthEnd);
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const appointmentsByDay = useMemo(() => {
    const map = new Map<string, AppointmentWithNames[]>();
    appointments.forEach((a) => {
      const key = format(parseISO(a.dateTime), "yyyy-MM-dd");
      const arr = map.get(key) || [];
      arr.push(a);
      map.set(key, arr);
    });
    return map;
  }, [appointments]);

  const selectedDayAppointments = useMemo(() => {
    if (!selectedDay) return [];
    const key = format(selectedDay, "yyyy-MM-dd");
    return appointmentsByDay.get(key) || [];
  }, [selectedDay, appointmentsByDay]);

  // Create appointment
  async function handleCreate() {
    if (!newForm.clientId || !newForm.evaluatorId || !newForm.dateTime || !newForm.meetingType) {
      toast({ title: "Missing fields", description: "Please fill in all required fields.", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: newForm.clientId,
          evaluatorId: newForm.evaluatorId,
          dateTime: new Date(newForm.dateTime).toISOString(),
          meetingType: newForm.meetingType,
          location: newForm.location,
          notes: newForm.notes,
        }),
      });
      if (!res.ok) throw new Error("Failed to create appointment");
      toast({ title: "Success", description: "Appointment created." });
      setNewDialogOpen(false);
      setNewForm({ clientId: "", evaluatorId: "", dateTime: "", meetingType: "", location: "", notes: "" });
      setClientSearch("");
      await fetchAppointments();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to create appointment";
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }

  // Update appointment status
  async function handleStatusChange(id: string, status: AppointmentStatus) {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/appointments/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed to update appointment");
      toast({
        title: "Status Updated",
        description: `Appointment marked as ${status.replace("_", " ").toLowerCase()}.`,
      });
      setDetailDialogOpen(false);
      setSelectedAppointment(null);
      await fetchAppointments();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to update status";
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }

  // Save appointment edits
  async function handleSaveEdit() {
    if (!selectedAppointment) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/appointments/${selectedAppointment.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          location: editForm.location,
          notes: editForm.notes,
        }),
      });
      if (!res.ok) throw new Error("Failed to update appointment");
      toast({ title: "Saved", description: "Appointment details updated." });
      await fetchAppointments();
      setDetailDialogOpen(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to save changes";
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }

  // Delete appointment
  async function handleDelete() {
    if (!selectedAppointment) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/appointments/${selectedAppointment.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete appointment");
      toast({ title: "Deleted", description: "Appointment has been deleted." });
      setDeleteConfirmOpen(false);
      setDetailDialogOpen(false);
      setSelectedAppointment(null);
      await fetchAppointments();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to delete appointment";
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  }

  function openDetail(appt: AppointmentWithNames) {
    setSelectedAppointment(appt);
    setEditForm({ location: appt.location || "", notes: appt.notes || "" });
    setDeleteConfirmOpen(false);
    setDetailDialogOpen(true);
  }

  function getClientName(appt: AppointmentWithNames) {
    if (appt.clientName) return appt.clientName;
    if (appt.client) return `${appt.client.boyFirstName} ${appt.client.boyLastName}`;
    const c = clients.find((cl) => cl.id === appt.clientId);
    return c ? `${c.boyFirstName} ${c.boyLastName}` : "Unknown Client";
  }

  function getEvaluatorName(appt: AppointmentWithNames) {
    if (appt.evaluatorName) return appt.evaluatorName;
    if (appt.evaluator) return appt.evaluator.name;
    const e = evaluators.find((ev) => ev.id === appt.evaluatorId);
    return e ? e.name : "Unknown";
  }

  // Dot color for calendar
  function statusDotColor(status: AppointmentStatus) {
    switch (status) {
      case "SCHEDULED": return "bg-[#1e3a5f]";
      case "COMPLETED": return "bg-green-500";
      case "NO_SHOW": return "bg-red-500";
      case "RESCHEDULED": return "bg-yellow-500";
      case "CANCELLED": return "bg-gray-400";
    }
  }

  // Loading skeleton
  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-10 w-44" />
        </div>
        <Skeleton className="h-10 w-80" />
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (error && appointments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <p className="text-lg font-medium text-destructive">Failed to load scheduling data</p>
        <p className="mt-1 text-sm text-muted-foreground">{error}</p>
        <Button className="mt-4" onClick={() => window.location.reload()}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Top bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-[#1e3a5f]">Scheduling</h1>
        <Button
          className="bg-[#1e3a5f] hover:bg-[#1e3a5f]/90"
          onClick={() => setNewDialogOpen(true)}
        >
          <Plus className="mr-2 h-4 w-4" />
          New Appointment
        </Button>
      </div>

      <Tabs defaultValue="list">
        <TabsList>
          <TabsTrigger value="list">
            <List className="mr-2 h-4 w-4" />
            List
          </TabsTrigger>
          <TabsTrigger value="calendar">
            <Calendar className="mr-2 h-4 w-4" />
            Calendar
          </TabsTrigger>
        </TabsList>

        {/* LIST VIEW */}
        <TabsContent value="list" className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <Select value={filterEvaluator} onValueChange={setFilterEvaluator}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="All Evaluators" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Evaluators</SelectItem>
                {evaluators.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="SCHEDULED">Scheduled</SelectItem>
                <SelectItem value="COMPLETED">Completed</SelectItem>
                <SelectItem value="NO_SHOW">No Show</SelectItem>
                <SelectItem value="RESCHEDULED">Rescheduled</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
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

          {filteredAppointments.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              No appointments found. Adjust your filters or create a new appointment.
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client Name</TableHead>
                    <TableHead>Evaluator</TableHead>
                    <TableHead>Date/Time</TableHead>
                    <TableHead>Meeting Type</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAppointments.map((appt) => (
                    <TableRow
                      key={appt.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => openDetail(appt)}
                    >
                      <TableCell className="font-medium">{getClientName(appt)}</TableCell>
                      <TableCell>{getEvaluatorName(appt)}</TableCell>
                      <TableCell>{formatDateTime(appt.dateTime)}</TableCell>
                      <TableCell>{MEETING_TYPE_LABELS[appt.meetingType]}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{appt.location || "-"}</TableCell>
                      <TableCell>
                        <Badge variant={statusBadgeVariant(appt.status)}>
                          {appt.status.replace("_", " ")}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        {/* CALENDAR VIEW */}
        <TabsContent value="calendar" className="space-y-4">
          {/* Month navigation */}
          <div className="flex items-center justify-between">
            <Button variant="outline" size="sm" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h2 className="text-lg font-semibold text-[#1e3a5f]">
              {format(currentMonth, "MMMM yyyy")}
            </h2>
            <Button variant="outline" size="sm" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-px rounded-lg border bg-muted">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <div key={day} className="bg-background p-2 text-center text-xs font-medium text-muted-foreground">
                {day}
              </div>
            ))}
            {calendarDays.map((day) => {
              const key = format(day, "yyyy-MM-dd");
              const dayAppts = appointmentsByDay.get(key) || [];
              const isCurrentMonth = isSameMonth(day, currentMonth);
              const isSelected = selectedDay && isSameDay(day, selectedDay);
              return (
                <div
                  key={key}
                  className={cn(
                    "min-h-[80px] bg-background p-1.5 transition-colors cursor-pointer hover:bg-muted/50",
                    !isCurrentMonth && "text-muted-foreground/40",
                    isSelected && "ring-2 ring-[#1e3a5f] ring-inset",
                    isToday(day) && "bg-[#1e3a5f]/5"
                  )}
                  onClick={() => setSelectedDay(day)}
                >
                  <div className={cn(
                    "text-sm font-medium",
                    isToday(day) && "flex h-6 w-6 items-center justify-center rounded-full bg-[#1e3a5f] text-white"
                  )}>
                    {format(day, "d")}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-0.5">
                    {dayAppts.slice(0, 3).map((a) => (
                      <div
                        key={a.id}
                        className={cn("h-2 w-2 rounded-full", statusDotColor(a.status))}
                        title={`${getClientName(a)} - ${a.status}`}
                      />
                    ))}
                    {dayAppts.length > 3 && (
                      <span className="text-[10px] text-muted-foreground">+{dayAppts.length - 3}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Selected day appointments */}
          {selectedDay && (
            <div className="rounded-lg border p-4">
              <h3 className="mb-3 font-semibold text-[#1e3a5f]">
                {format(selectedDay, "EEEE, MMMM d, yyyy")}
              </h3>
              {selectedDayAppointments.length === 0 ? (
                <p className="text-sm text-muted-foreground">No appointments on this day.</p>
              ) : (
                <div className="space-y-2">
                  {selectedDayAppointments.map((appt) => (
                    <div
                      key={appt.id}
                      className="flex items-center justify-between rounded-md border p-3 cursor-pointer hover:bg-muted/50"
                      onClick={() => openDetail(appt)}
                    >
                      <div>
                        <p className="font-medium">{getClientName(appt)}</p>
                        <p className="text-sm text-muted-foreground">
                          {format(parseISO(appt.dateTime), "h:mm a")} - {MEETING_TYPE_LABELS[appt.meetingType]} with {getEvaluatorName(appt)}
                        </p>
                      </div>
                      <Badge variant={statusBadgeVariant(appt.status)}>
                        {appt.status.replace("_", " ")}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* NEW APPOINTMENT DIALOG */}
      <Dialog open={newDialogOpen} onOpenChange={setNewDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>New Appointment</DialogTitle>
            <DialogDescription>Schedule a new appointment with a client.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Client search */}
            <div className="space-y-2" ref={clientSearchRef}>
              <Label>Client *</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search clients..."
                  value={clientSearch}
                  onChange={(e) => {
                    setClientSearch(e.target.value);
                    setClientDropdownOpen(true);
                  }}
                  onFocus={() => setClientDropdownOpen(true)}
                  className="pl-8"
                />
                {clientDropdownOpen && filteredClients.length > 0 && (
                  <div className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-md border bg-background shadow-lg">
                    {filteredClients.map((c) => (
                      <div
                        key={c.id}
                        className={cn(
                          "cursor-pointer px-3 py-2 text-sm hover:bg-muted",
                          newForm.clientId === c.id && "bg-muted font-medium"
                        )}
                        onClick={() => {
                          setNewForm((f) => ({ ...f, clientId: c.id }));
                          setClientSearch(`${c.boyFirstName} ${c.boyLastName}`);
                          setClientDropdownOpen(false);
                        }}
                      >
                        {c.boyFirstName} {c.boyLastName}
                        <span className="ml-2 text-muted-foreground">({c.parentNames})</span>
                      </div>
                    ))}
                  </div>
                )}
                {clientDropdownOpen && clientSearch && filteredClients.length === 0 && (
                  <div className="absolute z-10 mt-1 w-full rounded-md border bg-background p-3 text-sm text-muted-foreground shadow-lg">
                    No clients found.
                  </div>
                )}
              </div>
            </div>

            {/* Evaluator */}
            <div className="space-y-2">
              <Label>Evaluator *</Label>
              <Select
                value={newForm.evaluatorId}
                onValueChange={(v) => setNewForm((f) => ({ ...f, evaluatorId: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select evaluator" />
                </SelectTrigger>
                <SelectContent>
                  {evaluators.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date/time */}
            <div className="space-y-2">
              <Label>Date & Time *</Label>
              <Input
                type="datetime-local"
                value={newForm.dateTime}
                onChange={(e) => setNewForm((f) => ({ ...f, dateTime: e.target.value }))}
              />
            </div>

            {/* Meeting type */}
            <div className="space-y-2">
              <Label>Meeting Type *</Label>
              <Select
                value={newForm.meetingType}
                onValueChange={(v) => setNewForm((f) => ({ ...f, meetingType: v as MeetingType }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select meeting type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="INTAKE">Intake</SelectItem>
                  <SelectItem value="EVALUATION">Evaluation</SelectItem>
                  <SelectItem value="FOLLOW_UP">Follow-Up</SelectItem>
                  <SelectItem value="PARENT_MEETING">Parent Meeting</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Location */}
            <div className="space-y-2">
              <Label>Location</Label>
              <Input
                placeholder="Zoom link or address"
                value={newForm.location}
                onChange={(e) => setNewForm((f) => ({ ...f, location: e.target.value }))}
              />
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                placeholder="Additional notes..."
                value={newForm.notes}
                onChange={(e) => setNewForm((f) => ({ ...f, notes: e.target.value }))}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewDialogOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button
              className="bg-[#1e3a5f] hover:bg-[#1e3a5f]/90"
              onClick={handleCreate}
              disabled={submitting}
            >
              {submitting ? "Creating..." : "Create Appointment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* APPOINTMENT DETAIL DIALOG */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[520px]">
          {selectedAppointment && (
            <>
              <DialogHeader>
                <DialogTitle>Appointment Details</DialogTitle>
                <DialogDescription>
                  View and manage this appointment.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Client</p>
                    <p className="font-medium">{getClientName(selectedAppointment)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Evaluator</p>
                    <p className="font-medium">{getEvaluatorName(selectedAppointment)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Date/Time</p>
                    <p className="font-medium">{formatDateTime(selectedAppointment.dateTime)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Meeting Type</p>
                    <p className="font-medium">{MEETING_TYPE_LABELS[selectedAppointment.meetingType]}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <Badge variant={statusBadgeVariant(selectedAppointment.status)}>
                      {selectedAppointment.status.replace("_", " ")}
                    </Badge>
                  </div>
                </div>

                {/* Editable fields */}
                <div className="space-y-2">
                  <Label>Location</Label>
                  <Input
                    value={editForm.location}
                    onChange={(e) => setEditForm((f) => ({ ...f, location: e.target.value }))}
                    placeholder="Zoom link or address"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea
                    value={editForm.notes}
                    onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))}
                    rows={3}
                  />
                </div>

                <Button variant="outline" size="sm" onClick={handleSaveEdit} disabled={submitting}>
                  Save Changes
                </Button>

                {/* Status action buttons */}
                {selectedAppointment.status === "SCHEDULED" && (
                  <div className="flex flex-wrap gap-2 border-t pt-4">
                    <Button
                      size="sm"
                      className="bg-green-600 hover:bg-green-700"
                      onClick={() => handleStatusChange(selectedAppointment.id, "COMPLETED")}
                      disabled={submitting}
                    >
                      Complete
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleStatusChange(selectedAppointment.id, "NO_SHOW")}
                      disabled={submitting}
                    >
                      No Show
                    </Button>
                    <Button
                      size="sm"
                      className="bg-yellow-600 hover:bg-yellow-700"
                      onClick={() => handleStatusChange(selectedAppointment.id, "RESCHEDULED")}
                      disabled={submitting}
                    >
                      Reschedule
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleStatusChange(selectedAppointment.id, "CANCELLED")}
                      disabled={submitting}
                    >
                      Cancel
                    </Button>
                  </div>
                )}
                {selectedAppointment.status === "RESCHEDULED" && (
                  <div className="flex flex-wrap gap-2 border-t pt-4">
                    <Button
                      size="sm"
                      className="bg-[#1e3a5f] hover:bg-[#1e3a5f]/90"
                      onClick={() => handleStatusChange(selectedAppointment.id, "SCHEDULED")}
                      disabled={submitting}
                    >
                      Mark as Scheduled
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleStatusChange(selectedAppointment.id, "CANCELLED")}
                      disabled={submitting}
                    >
                      Cancel
                    </Button>
                  </div>
                )}
                {selectedAppointment.status === "NO_SHOW" && (
                  <div className="flex flex-wrap gap-2 border-t pt-4">
                    <Button
                      size="sm"
                      className="bg-yellow-600 hover:bg-yellow-700"
                      onClick={() => handleStatusChange(selectedAppointment.id, "RESCHEDULED")}
                      disabled={submitting}
                    >
                      Reschedule
                    </Button>
                  </div>
                )}

                {/* Delete section */}
                <div className="border-t pt-4">
                  {!deleteConfirmOpen ? (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setDeleteConfirmOpen(true)}
                      disabled={submitting || deleting}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete Appointment
                    </Button>
                  ) : (
                    <div className="rounded-md border border-destructive/50 bg-destructive/5 p-3 space-y-3">
                      <p className="text-sm font-medium text-destructive">
                        Are you sure you want to delete this appointment? This action cannot be undone.
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={handleDelete}
                          disabled={deleting}
                        >
                          {deleting ? "Deleting..." : "Yes, Delete"}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDeleteConfirmOpen(false)}
                          disabled={deleting}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
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
