import React, { useState } from "react";
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, addMonths,
  format, isSameMonth, isSameDay, parseISO,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toneFor } from "@/lib/badges";
import { formatHebrewDate, weeklyParsha } from "@/lib/hebrewCalendar";

const DOT = {
  green: "bg-emerald-500", yellow: "bg-amber-500",
  red: "bg-red-500", blue: "bg-blue-500", gray: "bg-gray-400",
};

const WEEK_DAYS = [
  { en: "Sun", yi: "זונטאג" },
  { en: "Mon", yi: "מאנטאג" },
  { en: "Tue", yi: "דינסטאג" },
  { en: "Wed", yi: "מיטוואך" },
  { en: "Thu", yi: "דאנערשטאג" },
  { en: "Fri", yi: "פרייטאג" },
  { en: "Sat", yi: "מוצאי שבת" },
];

const hebrewDateFormatter = new Intl.DateTimeFormat("he-u-ca-hebrew", {
  day: "numeric",
  month: "short",
});

function yiddishDate(day) {
  return formatHebrewDate(day, hebrewDateFormatter);
}

// Month grid calendar. Appointments are dots colored by status.
export default function AppointmentCalendar({
  appointments = [],
  availabilitySlots = [],
  onSelect,
  onDaySelect,
}) {
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

  const slotsOn = (day) =>
    availabilitySlots.filter((slot) => slot.active !== false && Number(slot.day_of_week) === day.getDay());

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-gray-900">{format(cursor, "MMMM yyyy")}</h3>
          <p className="text-xs text-gray-400">{yiddishDate(monthStart)} - {yiddishDate(endOfMonth(cursor))}</p>
        </div>
        <div className="flex gap-1">
          <Button size="icon" variant="ghost" onClick={() => setCursor((c) => addMonths(c, -1))}><ChevronLeft className="w-4 h-4" /></Button>
          <Button size="sm" variant="ghost" onClick={() => setCursor(new Date())}>Today</Button>
          <Button size="icon" variant="ghost" onClick={() => setCursor((c) => addMonths(c, 1))}><ChevronRight className="w-4 h-4" /></Button>
        </div>
      </div>

      <div className="grid grid-cols-7 text-center text-[11px] font-semibold text-gray-400 mb-1">
        {WEEK_DAYS.map((day) => (
          <div key={day.en} className="min-w-0 py-1">
            <div className="uppercase">{day.en}</div>
            <div className="truncate px-0.5 text-[9px] font-medium normal-case">{day.yi}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const dayAppts = apptsOn(day);
          const daySlots = slotsOn(day);
          const inMonth = isSameMonth(day, cursor);
          const today = isSameDay(day, new Date());
          const parsha = day.getDay() === 6 ? weeklyParsha(day) : "";
          return (
            <div
              key={day.toISOString()}
              onClick={() => onDaySelect?.(day)}
              role="button"
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") onDaySelect?.(day);
              }}
              className={`min-h-[104px] rounded-lg border p-1.5 text-left transition ${inMonth ? "bg-white border-gray-100 hover:border-blue-200 hover:bg-blue-50/30" : "bg-gray-50/50 border-transparent hover:bg-gray-50"} ${onDaySelect ? "cursor-pointer" : ""}`}
            >
              <div className="mb-1 flex items-start justify-between gap-1">
                <div>
                  <div className={`text-xs ${today ? "font-bold text-blue-600" : inMonth ? "text-gray-600" : "text-gray-300"}`}>
                    {format(day, "d")}
                  </div>
                  <div className={`max-w-full truncate text-[10px] leading-tight ${inMonth ? "text-gray-400" : "text-gray-300"}`}>
                    {yiddishDate(day)}
                  </div>
                  {parsha && (
                    <div className={`mt-0.5 max-w-full truncate text-[10px] leading-tight ${inMonth ? "text-[#1e3a5f]" : "text-gray-300"}`}>
                      {parsha}
                    </div>
                  )}
                </div>
                {daySlots.length > 0 && (
                  <span className="rounded-full bg-emerald-50 px-1.5 py-0.5 text-[9px] font-medium text-emerald-700">
                    {daySlots.length} slot{daySlots.length === 1 ? "" : "s"}
                  </span>
                )}
              </div>
              <div className="space-y-1">
                {dayAppts.slice(0, 3).map((a) => (
                  <button
                    key={a.id}
                    onClick={(event) => {
                      event.stopPropagation();
                      onSelect?.(a);
                    }}
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
