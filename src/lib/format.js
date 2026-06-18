import { format, isValid, parseISO } from "date-fns";

export function toDate(value) {
  if (!value) return null;
  const d = typeof value === "string" ? parseISO(value) : new Date(value);
  return isValid(d) ? d : null;
}

export function fmtDate(value, fallback = "—") {
  const d = toDate(value);
  return d ? format(d, "MMM d, yyyy") : fallback;
}

export function fmtDateTime(value, fallback = "—") {
  const d = toDate(value);
  return d ? format(d, "MMM d, yyyy · h:mm a") : fallback;
}

export function fmtTime(value, fallback = "") {
  const d = toDate(value);
  return d ? format(d, "h:mm a") : fallback;
}

export function fmtCurrency(n) {
  const num = Number(n) || 0;
  return `$${num.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export function initials(first, last) {
  return `${(first || "")[0] || ""}${(last || "")[0] || ""}`.toUpperCase() || "?";
}
