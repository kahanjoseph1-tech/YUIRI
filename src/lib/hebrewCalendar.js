import { HDate, ParshaEvent, getSedra } from "@hebcal/core";

function removeHebrewMonthPrefix(value) {
  return String(value || "")
    .split(" ")
    .map((part, index) => (index === 1 && part.startsWith("ב") ? part.slice(1) : part))
    .join(" ");
}

export function formatHebrewDate(date, formatter) {
  try {
    return removeHebrewMonthPrefix(formatter.format(date));
  } catch {
    return "";
  }
}

export function weeklyParsha(date, il = false) {
  try {
    const hebrewDate = new HDate(date);
    const sedra = getSedra(hebrewDate.getFullYear(), il);
    const result = sedra.lookup(hebrewDate);
    if (!result?.parsha?.length || result.chag) return "";
    return new ParshaEvent(result).render("he-x-NoNikud");
  } catch {
    return "";
  }
}
