import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  APPOINTMENT_STATUSES,
  BILLING_STATUSES,
  CLIENT_STATUSES,
  DEFAULT_CALLER_OPTIONS,
  DEFAULT_RESPONSIBLE_OPTIONS,
  ENVIRONMENT_TYPES,
  MEETING_TYPES,
  PAYMENT_METHODS,
  PHONE_NUMBER_TAGS,
  PLACEMENT_STATUSES,
  SCHOOL_HASHKAFAS,
  SCHOOL_TYPES,
  SERVICE_TYPES,
} from "@/lib/constants";

const SETTINGS_COLLECTION = "settings";
const DROPDOWN_OPTIONS_DOC = "dropdown_options";

export const DROPDOWN_OPTIONS_QUERY_KEY = ["settings", "dropdown_options"];

const DEFAULT_EVALUATION_FARTAGS_OPTIONS = ["רוב", "חלק", "כמעט נישט"];
const DEFAULT_EVALUATION_DAVENING_OPTIONS = ["מצוין", "טוב מאוד", "טוב"];
const DEFAULT_EVALUATION_LEARNING_OPTIONS = ["מצוין", "טוב מאוד", "טוב", "חלוש"];
const DEFAULT_EVALUATION_FRIENDS_OPTIONS = ["1", "2", "3", "4", "5", "Other"];
const DEFAULT_EVALUATION_CHAVRUSAS_OPTIONS = ["נארמאל", "געפלאגט", "אינגערמאן", "Other"];
const DEFAULT_EVALUATION_YES_NO_OTHER_OPTIONS = ["יא", "ניין", "Other"];
const DEFAULT_EVALUATION_VIDEO_OPTIONS = ["קוקט נישט", "אביסל", "אסאך", "Other"];
const DEFAULT_EVALUATION_SMARTPHONE_OPTIONS = ["ניין", "יא", "געהאט", "Other"];
const DEFAULT_EVALUATION_EMOTIONAL_OPTIONS = ["יא", "אביסל", "ניין", "Other"];
const DEFAULT_EVALUATION_MIDOS_OPTIONS = ["פיינע", "קען זיין בעסער", "Other"];
const DEFAULT_EVALUATION_DERECH_ERETZ_OPTIONS = ["יא", "ניין", "קען זיין בעסער"];
const DEFAULT_EVALUATION_BILLING_ANSWERS = ["געברענגט געלט", "דארף מען בילן", "נישט זיכער"];

const DEFAULT_KEY_POINT_ZICHT_FAR_OPTIONS = ["Yeshiva Ketana", "Mesivta", "Beis Medrash", "Special Education", "Other"];
const DEFAULT_KEY_POINT_SHIUR_OPTIONS = [];
const DEFAULT_KEY_POINT_STYLE_OPTIONS = ["Chassidish", "Yeshivish", "Structured", "Warm/Nurturing", "Other"];

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
  {
    key: "evaluations",
    label: "Evaluations",
    groupKeys: [
      "evaluation_fartags_options",
      "evaluation_davening_options",
      "evaluation_learning_options",
      "evaluation_friends_options",
      "evaluation_chavrusas_options",
      "evaluation_dormitory_options",
      "evaluation_video_options",
      "evaluation_smartphone_options",
      "evaluation_emotional_options",
      "evaluation_midos_options",
      "evaluation_derech_eretz_options",
      "evaluation_strengthened_learning_davening_options",
      "evaluation_bad_friend_strengthened_options",
      "evaluation_likes_music_options",
      "evaluation_key_points_zicht_far_options",
      "evaluation_key_points_shiur_options",
      "evaluation_key_points_style_options",
      "evaluation_key_points_dormitory_options",
      "evaluation_billing_answers",
    ],
  },
  {
    key: "yeshivas",
    label: "Yeshiva's",
    groupKeys: [
      "yeshiva_hashkafas",
      "yeshiva_types",
      "yeshiva_environment_types",
    ],
  },
  {
    key: "placements",
    label: "Placements",
    groupKeys: [
      "placement_statuses",
    ],
  },
  {
    key: "billing",
    label: "Billing",
    groupKeys: [
      "billing_service_types",
      "billing_statuses",
      "payment_methods",
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
  { key: "evaluation_fartags_options", label: "פארטאגס", section: "evaluations" },
  { key: "evaluation_davening_options", label: "דאווענען", section: "evaluations" },
  { key: "evaluation_learning_options", label: "לערנען", section: "evaluations" },
  { key: "evaluation_friends_options", label: "חברים", section: "evaluations" },
  { key: "evaluation_chavrusas_options", label: "חברותה'ס", section: "evaluations" },
  { key: "evaluation_dormitory_options", label: "דארמאטארי", section: "evaluations" },
  { key: "evaluation_video_options", label: "קוקט ווידיאויס", section: "evaluations" },
  { key: "evaluation_smartphone_options", label: "האסט א סמארטפאון", section: "evaluations" },
  { key: "evaluation_emotional_options", label: "געפילישער", section: "evaluations" },
  { key: "evaluation_midos_options", label: "מידות", section: "evaluations" },
  { key: "evaluation_derech_eretz_options", label: "דרך ארץ'דיגע", section: "evaluations" },
  {
    key: "evaluation_strengthened_learning_davening_options",
    label: "נישט געהאט קיין נערוון צו לערנען אדער דאווענען און זיך געשטארקט",
    section: "evaluations",
  },
  {
    key: "evaluation_bad_friend_strengthened_options",
    label: "א חבר גערעדט נישט גוטע זאכן און זיך געשטארקט",
    section: "evaluations",
  },
  { key: "evaluation_likes_music_options", label: "האט ליב מוזיק", section: "evaluations" },
  { key: "evaluation_billing_answers", label: "באצאלט / בילינג", section: "evaluations" },
];

DROPDOWN_GROUPS.push(
  { key: "evaluation_key_points_zicht_far_options", label: "זיכט פאר", section: "evaluations" },
  { key: "evaluation_key_points_shiur_options", label: "שיעור", section: "evaluations" },
  { key: "evaluation_key_points_style_options", label: "סטייל", section: "evaluations" },
  { key: "evaluation_key_points_dormitory_options", label: "דארמעטארי", section: "evaluations" },
  { key: "yeshiva_hashkafas", label: "Hashkafa", section: "yeshivas" },
  { key: "yeshiva_types", label: "Yeshiva type", section: "yeshivas" },
  { key: "yeshiva_environment_types", label: "Environment type", section: "yeshivas" },
  { key: "placement_statuses", label: "Placement status", section: "placements" },
  { key: "billing_service_types", label: "Service type", section: "billing" },
  { key: "billing_statuses", label: "Billing status", section: "billing" },
  { key: "payment_methods", label: "Payment method", section: "billing" },
);

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
  evaluation_fartags_options: DEFAULT_EVALUATION_FARTAGS_OPTIONS,
  evaluation_davening_options: DEFAULT_EVALUATION_DAVENING_OPTIONS,
  evaluation_learning_options: DEFAULT_EVALUATION_LEARNING_OPTIONS,
  evaluation_friends_options: DEFAULT_EVALUATION_FRIENDS_OPTIONS,
  evaluation_chavrusas_options: DEFAULT_EVALUATION_CHAVRUSAS_OPTIONS,
  evaluation_dormitory_options: DEFAULT_EVALUATION_YES_NO_OTHER_OPTIONS,
  evaluation_video_options: DEFAULT_EVALUATION_VIDEO_OPTIONS,
  evaluation_smartphone_options: DEFAULT_EVALUATION_SMARTPHONE_OPTIONS,
  evaluation_emotional_options: DEFAULT_EVALUATION_EMOTIONAL_OPTIONS,
  evaluation_midos_options: DEFAULT_EVALUATION_MIDOS_OPTIONS,
  evaluation_derech_eretz_options: DEFAULT_EVALUATION_DERECH_ERETZ_OPTIONS,
  evaluation_strengthened_learning_davening_options: DEFAULT_EVALUATION_YES_NO_OTHER_OPTIONS,
  evaluation_bad_friend_strengthened_options: DEFAULT_EVALUATION_YES_NO_OTHER_OPTIONS,
  evaluation_likes_music_options: DEFAULT_EVALUATION_YES_NO_OTHER_OPTIONS,
  evaluation_key_points_zicht_far_options: DEFAULT_KEY_POINT_ZICHT_FAR_OPTIONS,
  evaluation_key_points_shiur_options: DEFAULT_KEY_POINT_SHIUR_OPTIONS,
  evaluation_key_points_style_options: DEFAULT_KEY_POINT_STYLE_OPTIONS,
  evaluation_key_points_dormitory_options: DEFAULT_EVALUATION_YES_NO_OTHER_OPTIONS,
  evaluation_billing_answers: DEFAULT_EVALUATION_BILLING_ANSWERS,
  yeshiva_hashkafas: SCHOOL_HASHKAFAS,
  yeshiva_types: SCHOOL_TYPES,
  yeshiva_environment_types: ENVIRONMENT_TYPES,
  placement_statuses: PLACEMENT_STATUSES,
  billing_service_types: SERVICE_TYPES,
  billing_statuses: BILLING_STATUSES,
  payment_methods: PAYMENT_METHODS,
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
