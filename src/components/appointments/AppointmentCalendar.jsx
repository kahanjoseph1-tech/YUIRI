import React, { useState } from "react";
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, addMonths,
  format, isSameMonth, isSameDay, parseISO,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toneFor } from "@/lib/badges";

const DOT = {
  green: "bg-emerald-500", yellow: "bg-amber-500",
  red: "bg-red-500", blue: "bg-blue-500", gray: "bg-gray-400",
};

// Month grid calendar. Appointments are dots colored by status.
export default function AppointmentCalendar({ appointments = [], onSelect }) {
  const [cursor, setCursor] = useState(new Date());

  const monthStart = startOfMonth(cursor);
  const gridStart = startOfWeek(monthStart);
  const gridEnd = endOfWeek(endOfMonth(cursor));

  const days = [];
  for (let d = gridStart; d <= gridEnd; d = addDays(d, 1)) days.push(d);

  const apptsOn = (day) =>
    appointments.filter((a) => {
      if (!a.date_time) return false;
      const d = parseISO(a.date_time);
      return !Number.isNaN(d.getTime()) && isSameDay(d, day);
    });

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">{format(cursor, "MMMM yyyy")}</h3>
        <div className="flex gap-1">
          <Button size="icon" variant="ghost" onClick={() => setCursor((c) => addMonths(c, -1))}><ChevronLeft className="w-4 h-4" /></Button>
          <Button size="sm" variant="ghost" onClick={() => setCursor(new Date())}>Today</Button>
          <Button size="icon" variant="ghost" onClick={() => setCursor((c) => addMonths(c, 1))}><ChevronRight className="w-4 h-4" /></Button>
        </div>
      </div>

      <div className="grid grid-cols-7 text-center text-[11px] font-semibold text-gray-400 uppercase mb-1">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => <div key={d} className="py-1">{d}</div>)}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const dayAppts = apptsOn(day);
          const inMonth = isSameMonth(day, cursor);
          const today = isSameDay(day, new Date());
          return (
            <div
              key={day.toISOString()}
              className={`min-h-[84px] rounded-lg border p-1.5 text-left ${inMonth ? "bg-white border-gray-100" : "bg-gray-50/50 border-transparent"}`}
            >
              <div className={`text-xs mb-1 ${today ? "font-bold text-blue-600" : inMonth ? "text-gray-600" : "text-gray-300"}`}>
                {format(day, "d")}
              </div>
              <div className="space-y-1">
                {dayAppts.slice(0, 3).map((a) => (
                  <button
                    key={a.id}
                    onClick={() => onSelect?.(a)}
                    className="w-full flex items-center gap-1 text-[10px] text-gray-600 hover:bg-gray-50 rounded px-1 py-0.5 truncate"
                  >
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${DOT[toneFor(a.status)]}`} />
                    <span className="truncate">{format(parseISO(a.date_time), "h:mma")} {a.client_name}</span>
                  </button>
                ))}
                {dayAppts.length > 3 && <p className="text-[10px] text-gray-400 px-1">+{dayAppts.length - 3} more</p>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
