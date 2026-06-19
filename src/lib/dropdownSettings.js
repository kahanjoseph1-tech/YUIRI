import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  CLIENT_STATUSES,
  DEFAULT_CALLER_OPTIONS,
  DEFAULT_RESPONSIBLE_OPTIONS,
  PHONE_NUMBER_TAGS,
} from "@/lib/constants";

const SETTINGS_COLLECTION = "settings";
const DROPDOWN_OPTIONS_DOC = "dropdown_options";

export const DROPDOWN_OPTIONS_QUERY_KEY = ["settings", "dropdown_options"];

export const DROPDOWN_GROUPS = [
  { key: "caller_options", label: "ווער רופט" },
  { key: "responsible_options", label: "Responsible" },
  { key: "reason_options", label: "סיבה" },
  { key: "shiur_options", label: "שיעור" },
  { key: "client_statuses", label: "Status" },
  { key: "phone_number_tags", label: "Phone number tags" },
];

export const DEFAULT_DROPDOWN_OPTIONS = {
  caller_options: DEFAULT_CALLER_OPTIONS,
  responsible_options: DEFAULT_RESPONSIBLE_OPTIONS,
  reason_options: [],
  shiur_options: [],
  client_statuses: CLIENT_STATUSES,
  phone_number_tags: PHONE_NUMBER_TAGS,
};

export function uniqueOptions(options) {
  return Array.from(
    new Set(options.map((option) => String(option || "").trim()).filter(Boolean))
  );
}

export function normalizeDropdownOptions(data = {}) {
  return Object.fromEntries(
    DROPDOWN_GROUPS.map((group) => [
      group.key,
      uniqueOptions(
        Array.isArray(data[group.key])
          ? data[group.key]
          : DEFAULT_DROPDOWN_OPTIONS[group.key] || []
      ),
    ])
  );
}

export async function getDropdownOptions() {
  const snapshot = await getDoc(doc(db, SETTINGS_COLLECTION, DROPDOWN_OPTIONS_DOC));
  return normalizeDropdownOptions(snapshot.exists() ? snapshot.data() : {});
}

export async function saveDropdownOptions(options) {
  const normalized = normalizeDropdownOptions(options);
  await setDoc(
    doc(db, SETTINGS_COLLECTION, DROPDOWN_OPTIONS_DOC),
    {
      ...normalized,
      updated_date: new Date().toISOString(),
    },
    { merge: true }
  );
  return normalized;
}
