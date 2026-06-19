import React, { useMemo } from "react";
import { format, isSameDay, parseISO } from "date-fns";
import { CalendarPlus, Clock, MapPin, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import StatusBadge from "@/components/StatusBadge";

const DAY_NAMES = [
  { en: "Sunday", yi: "זונטאג" },
  { en: "Monday", yi: "מאנטאג" },
  { en: "Tuesday", yi: "דינסטאג" },
  { en: "Wednesday", yi: "מיטוואך" },
  { en: "Thursday", yi: "דאנערשטאג" },
  { en: "Friday", yi: "פרייטאג" },
  { en: "Saturday", yi: "שבת" },
];

const hebrewDateFormatter = new Intl.DateTimeFormat("he-u-ca-hebrew", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

function asDate(value) {
  if (!value) return null;
  const date = typeof value === "string" ? parseISO(value) : value;
  return Number.isNaN(date.getTime()) ? null : date;
}

function yiddishDate(date) {
  try {
    return hebrewDateFormatter.format(date);
  } catch {
    return "";
  }
}

function timeLabel(time) {
  const [hours = 0, minutes = 0] = String(time || "09:00").split(":").map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return format(date, "h:mm a");
}

function localDateTimeValue(day, time) {
  return `${format(day, "yyyy-MM-dd")}T${time || "09:00"}`;
}

function appointmentTime(appointment) {
  const date = asDate(appointment.date_time);
  return date ? format(date, "HH:mm") : "";
}

export default function DayScheduleDialog({
  open,
  onOpenChange,
  day,
  appointments = [],
  availabilitySlots = [],
  canWrite = false,
  onEdit,
  onSchedule,
}) {
  const dayAppointments = useMemo(() => {
    if (!day) return [];
    return appointments
      .filter((appointment) => {
        const date = asDate(appointment.date_time);
        return date && isSameDay(date, day);
      })
      .sort((a, b) => String(a.date_time || "").localeCompare(String(b.date_time || "")));
  }, [appointments, day]);

  const daySlots = useMemo(() => {
    if (!day) return [];
    return availabilitySlots
      .filter((slot) => slot.active !== false && Number(slot.day_of_week) === day.getDay())
      .sort((a, b) => String(a.time || "").localeCompare(String(b.time || "")));
  }, [availabilitySlots, day]);

  if (!day) return null;

  const dayName = DAY_NAMES[day.getDay()];
  const openNewAppointment = (time = "09:00", location = "Office") => {
    onSchedule?.({
      date_time: localDateTimeValue(day, time),
      location: location || "Office",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{format(day, "MMMM d, yyyy")}</DialogTitle>
          <p className="text-sm text-gray-500">
            {dayName.en} / {dayName.yi} · {yiddishDate(day)}
          </p>
        </DialogHeader>

        <div className="space-y-5">
          <section>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-900">Available Slots</h3>
              {canWrite && (
                <Button type="button" size="sm" variant="outline" className="gap-1.5" onClick={() => openNewAppointment()}>
                  <CalendarPlus className="h-4 w-4" /> New
                </Button>
              )}
            </div>

            {daySlots.length === 0 ? (
              <div className="rounded-lg border border-dashed border-gray-200 p-4 text-sm text-gray-400">
                No regular slots for this day. You can still schedule manually.
              </div>
            ) : (
              <div className="space-y-2">
                {daySlots.map((slot) => {
                  const booked = dayAppointments.find((appointment) => appointmentTime(appointment) === slot.time);
                  return (
                    <div key={slot.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-gray-100 p-3">
                      <div>
                        <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
                          <Clock className="h-4 w-4 text-gray-400" />
                          {timeLabel(slot.time)}
                          <Badge variant="outline" className={booked ? "text-amber-700" : "text-emerald-700"}>
                            {booked ? "Booked" : "Available"}
                          </Badge>
                        </div>
                        <p className="mt-1 flex items-center gap-1.5 text-xs text-gray-500">
                          <MapPin className="h-3.5 w-3.5" />
                          {slot.location || "Office"} · {slot.duration_minutes || 60} min
                        </p>
                        {booked && (
                          <p className="mt-1 text-xs text-gray-500">
                            {booked.client_name || "Client"} · {booked.meeting_type || "Meeting"}
                          </p>
                        )}
                      </div>

                      {canWrite && (
                        <Button
                          type="button"
                          size="sm"
                          variant={booked ? "outline" : "default"}
                          className={booked ? "" : "bg-[#1e3a5f] hover:bg-[#1e3a5f]/90"}
                          onClick={() => openNewAppointment(slot.time, slot.location)}
                        >
                          {booked ? "Override" : "Schedule"}
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section>
            <h3 className="mb-2 text-sm font-semibold text-gray-900">Appointments</h3>
            {dayAppointments.length === 0 ? (
              <div className="rounded-lg border border-gray-100 p-4 text-sm text-gray-400">
                No appointments scheduled.
              </div>
            ) : (
              <div className="divide-y divide-gray-100 rounded-lg border border-gray-100">
                {dayAppointments.map((appointment) => {
                  const date = asDate(appointment.date_time);
                  return (
                    <div key={appointment.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{appointment.client_name || "Client"}</p>
                        <p className="text-xs text-gray-500">
                          {date ? format(date, "h:mm a") : "No time"} · {appointment.meeting_type || "Meeting"} · {appointment.location || "Office"}
                        </p>
                        {appointment.evaluator_name && <p className="text-xs text-gray-400">{appointment.evaluator_name}</p>}
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={appointment.status} />
                        {canWrite && (
                          <Button type="button" size="icon" variant="ghost" onClick={() => onEdit?.(appointment)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
