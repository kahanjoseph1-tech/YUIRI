import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  APPOINTMENT_STATUSES,
  CLIENT_STATUSES,
  DEFAULT_CALLER_OPTIONS,
  DEFAULT_RESPONSIBLE_OPTIONS,
  MEETING_TYPES,
  PHONE_NUMBER_TAGS,
} from "@/lib/constants";

const SETTINGS_COLLECTION = "settings";
const DROPDOWN_OPTIONS_DOC = "dropdown_options";

export const DROPDOWN_OPTIONS_QUERY_KEY = ["settings", "dropdown_options"];

export const DROPDOWN_SECTIONS = [
  {
    key: "clients",
    label: "Clients",
    groupKeys: [
      "caller_options",
      "responsible_options",
      "reason_options",
      "shiur_options",
      "client_statuses",
      "phone_number_tags",
    ],
  },
  {
    key: "scheduling",
    label: "Scheduling",
    groupKeys: [
      "appointment_evaluators",
      "meeting_types",
      "appointment_statuses",
      "appointment_locations",
    ],
  },
];

export const DROPDOWN_GROUPS = [
  { key: "caller_options", label: "ווער רופט", section: "clients" },
  { key: "responsible_options", label: "Responsible", section: "clients" },
  { key: "reason_options", label: "סיבה", section: "clients" },
  { key: "shiur_options", label: "שיעור", section: "clients" },
  { key: "client_statuses", label: "Status", section: "clients" },
  { key: "phone_number_tags", label: "Phone number tags", section: "clients" },
  { key: "appointment_evaluators", label: "Evaluator", section: "scheduling" },
  { key: "meeting_types", label: "Appointment type", section: "scheduling" },
  { key: "appointment_statuses", label: "Appointment status", section: "scheduling" },
  { key: "appointment_locations", label: "Location presets", section: "scheduling" },
];

export const DEFAULT_DROPDOWN_OPTIONS = {
  caller_options: DEFAULT_CALLER_OPTIONS,
  responsible_options: DEFAULT_RESPONSIBLE_OPTIONS,
  reason_options: [],
  shiur_options: [],
  client_statuses: CLIENT_STATUSES,
  phone_number_tags: PHONE_NUMBER_TAGS,
  appointment_evaluators: [],
  meeting_types: MEETING_TYPES,
  appointment_statuses: APPOINTMENT_STATUSES,
  appointment_locations: ["Office"],
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
