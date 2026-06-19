import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth as firebaseAuth, db } from "@/lib/firebase";

const collectionNames = {
  User: "users",
  Client: "clients",
  Appointment: "appointments",
  AppointmentAvailability: "appointment_availability",
  Evaluation: "evaluations",
  BillingRecord: "billing",
  School: "schools",
  Placement: "placements",
};

const bootstrapAdminEmails = new Set(["kahanjoseph1@gmail.com"]);

function compact(value) {
  if (Array.isArray(value)) return value.map(compact);
  if (!value || typeof value !== "object" || value instanceof Date) return value;

  return Object.fromEntries(
    Object.entries(value)
      .filter(([, entryValue]) => entryValue !== undefined)
      .map(([key, entryValue]) => [key, compact(entryValue)])
  );
}

function normalizePlainObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value) || value instanceof Date) return {};
  return compact(value);
}

function toIso(value) {
  if (!value) return value;
  if (typeof value === "string") return value;
  if (typeof value.toDate === "function") return value.toDate().toISOString();
  if (value instanceof Date) return value.toISOString();
  return value;
}

function normalizeRole(value) {
  return String(value || "").toLowerCase() === "admin" ? "admin" : "user";
}

function normalizeClientId(value) {
  const digits = String(value || "").replace(/\D/g, "");
  if (!digits) return "";
  return digits.slice(-4).padStart(4, "0");
}

function normalizePhoneNumbers(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((phone) => ({
      tag: phone?.tag || "Father's Cell",
      custom_label: phone?.custom_label || "",
      number: phone?.number || "",
    }))
    .filter((phone) => phone.number || phone.custom_label);
}

function normalizeFileMeta(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return {
    name: value.name || "",
    url: value.url || "",
    path: value.path || "",
    content_type: value.content_type || value.type || "",
    size: Number(value.size || 0),
    uploaded_date: toIso(value.uploaded_date),
  };
}

function normalizeFiles(value) {
  if (!Array.isArray(value)) return [];
  return value.map(normalizeFileMeta).filter((file) => file?.url);
}

function withDates(id, data) {
  return {
    id,
    created_date: toIso(data.created_date),
    updated_date: toIso(data.updated_date),
  };
}

function fromUser(id, data) {
  const role = normalizeRole(data.crm_role);
  return {
    ...withDates(id, data),
    email: data.email || "",
    full_name: data.full_name || data.name || data.email || "User",
    name: data.name || data.full_name || data.email || "User",
    crm_role: role,
    role,
    firebase_uid: data.firebase_uid || "",
    approval_status: data.approval_status || "pending",
  };
}

function toUser(data) {
  return compact({
    email: data.email,
    full_name: data.full_name || data.name,
    name: data.name || data.full_name,
    crm_role: normalizeRole(data.crm_role || data.role),
    firebase_uid: data.firebase_uid,
    approval_status: data.approval_status,
  });
}

function fromClient(id, data) {
  return {
    ...withDates(id, data),
    client_id: normalizeClientId(data.client_id),
    boy_first_name: data.boy_first_name || "",
    boy_last_name: data.boy_last_name || "",
    age: data.age,
    grade_level: data.grade_level || "",
    father_name: data.father_name || "",
    mother_name: data.mother_name || "",
    parent_names: data.parent_names || "",
    phone_numbers: normalizePhoneNumbers(data.phone_numbers),
    profile_photo: normalizeFileMeta(data.profile_photo),
    files: normalizeFiles(data.files),
    parent_phone: data.parent_phone || "",
    parent_email: data.parent_email || "",
    city: data.city || "",
    current_school: data.current_school || "",
    shiur: data.shiur || "",
    reason: data.reason || "",
    referral_source: data.referral_source || "",
    caller_source: data.caller_source || "",
    caller_name: data.caller_name || "",
    responsible_person: data.responsible_person || "",
    responsible_name: data.responsible_name || "",
    religious_level: data.religious_level || "",
    family_expectations: data.family_expectations || "",
    status: data.status || "New Client",
    assigned_evaluator_id: data.assigned_evaluator_id || "",
    special_needs: Array.isArray(data.special_needs) ? data.special_needs : [],
    ready_to_bill: Boolean(data.ready_to_bill),
    notes: data.notes || "",
  };
}

function toClient(data) {
  const phoneNumbers = normalizePhoneNumbers(data.phone_numbers);
  const parentPhone = phoneNumbers[0]?.number || data.parent_phone || "";
  const callerSource = data.caller_source || data.referral_source || "";
  return compact({
    client_id: normalizeClientId(data.client_id),
    boy_first_name: data.boy_first_name,
    boy_last_name: data.boy_last_name,
    age: data.age,
    grade_level: data.grade_level,
    father_name: data.father_name,
    mother_name: data.mother_name,
    parent_names: data.parent_names,
    phone_numbers: phoneNumbers,
    profile_photo: normalizeFileMeta(data.profile_photo),
    files: normalizeFiles(data.files),
    parent_phone: parentPhone,
    parent_email: data.parent_email,
    city: data.city,
    current_school: data.current_school,
    shiur: data.shiur,
    reason: data.reason,
    referral_source: callerSource,
    caller_source: callerSource,
    caller_name: data.caller_name,
    responsible_person: data.responsible_person,
    responsible_name: data.responsible_name,
    religious_level: data.religious_level,
    family_expectations: data.family_expectations,
    status: data.status || "New Client",
    assigned_evaluator_id: data.assigned_evaluator_id,
    special_needs: data.special_needs,
    ready_to_bill: Boolean(data.ready_to_bill),
    notes: data.notes,
  });
}

async function nextFourDigitClientId(transformer) {
  const snapshot = await getDocs(collection(db, collectionNames.Client));
  const used = new Set();
  let max = 0;

  snapshot.docs.forEach((document) => {
    const row = transformer.fromDb(document.id, document.data());
    const clientId = normalizeClientId(row.client_id);
    if (!clientId) return;
    used.add(clientId);
    max = Math.max(max, Number(clientId));
  });

  for (let value = max + 1; value <= 9999; value += 1) {
    const candidate = String(value).padStart(4, "0");
    if (!used.has(candidate)) return candidate;
  }

  for (let value = 1; value <= max; value += 1) {
    const candidate = String(value).padStart(4, "0");
    if (!used.has(candidate)) return candidate;
  }

  throw new Error("No available 4-digit client IDs");
}

function fromAppointment(id, data) {
  return {
    ...withDates(id, data),
    client_id: data.client_id || "",
    evaluator_id: data.evaluator_id || "",
    date_time: toIso(data.date_time),
    meeting_type: data.meeting_type || "Evaluation",
    location: data.location || "Office",
    payment_amount_due: Number(data.payment_amount_due || 0),
    payment_method: data.payment_method || "",
    payment_note: data.payment_note || "",
    card_last4: data.card_last4 || "",
    attendee_type: data.attendee_type || "",
    attendee_name: data.attendee_name || "",
    attendee_phone: data.attendee_phone || "",
    status: data.status || "Scheduled",
    notes: data.notes || "",
    client_name: data.client_name || "",
    evaluator_name: data.evaluator_name || "",
  };
}

function toAppointment(data) {
  return compact({
    client_id: data.client_id,
    evaluator_id: data.evaluator_id,
    date_time: data.date_time,
    meeting_type: data.meeting_type || "Evaluation",
    location: data.location || "Office",
    payment_amount_due: Number(data.payment_amount_due || 0),
    payment_method: data.payment_method,
    payment_note: data.payment_note,
    card_last4: String(data.card_last4 || "").replace(/\D/g, "").slice(-4),
    attendee_type: data.attendee_type,
    attendee_name: data.attendee_name,
    attendee_phone: data.attendee_phone,
    status: data.status || "Scheduled",
    notes: data.notes,
    client_name: data.client_name,
    evaluator_name: data.evaluator_name,
  });
}

function fromAppointmentAvailability(id, data) {
  return {
    ...withDates(id, data),
    day_of_week: Number(data.day_of_week ?? 1),
    time: data.time || "09:00",
    duration_minutes: Number(data.duration_minutes || 60),
    location: data.location || "Office",
    evaluator_name: data.evaluator_name || "",
    active: data.active !== false,
    notes: data.notes || "",
  };
}

function toAppointmentAvailability(data) {
  return compact({
    day_of_week: Number(data.day_of_week ?? 1),
    time: data.time || "09:00",
    duration_minutes: Number(data.duration_minutes || 60),
    location: data.location || "Office",
    evaluator_name: data.evaluator_name,
    active: data.active !== false,
    notes: data.notes,
  });
}

function fromEvaluation(id, data) {
  return {
    ...withDates(id, data),
    appointment_id: data.appointment_id || "",
    appointment_date: toIso(data.appointment_date),
    client_id: data.client_id || "",
    evaluator_id: data.evaluator_id || "",
    client_name: data.client_name || "",
    evaluator_name: data.evaluator_name || "",
    strengths: data.strengths || "",
    challenges: data.challenges || "",
    learning_style: data.learning_style || "",
    behavior_notes: data.behavior_notes || "",
    religious_level_observed: data.religious_level_observed || "",
    family_expectations_notes: data.family_expectations_notes || "",
    recommended_school_type: data.recommended_school_type || "",
    suggested_schools: data.suggested_schools || "",
    urgency: data.urgency || "Medium",
    final_recommendation: data.final_recommendation || "",
    questionnaire: normalizePlainObject(data.questionnaire),
    evaluation_billing_answer: data.evaluation_billing_answer || "",
    evaluation_billing_note: data.evaluation_billing_note || "",
    status: data.status || "Pending",
  };
}

function toEvaluation(data) {
  return compact({
    appointment_id: data.appointment_id,
    appointment_date: data.appointment_date,
    client_id: data.client_id,
    evaluator_id: data.evaluator_id,
    client_name: data.client_name,
    evaluator_name: data.evaluator_name,
    strengths: data.strengths,
    challenges: data.challenges,
    learning_style: data.learning_style,
    behavior_notes: data.behavior_notes,
    religious_level_observed: data.religious_level_observed,
    family_expectations_notes: data.family_expectations_notes,
    recommended_school_type: data.recommended_school_type,
    suggested_schools: data.suggested_schools,
    urgency: data.urgency || "Medium",
    final_recommendation: data.final_recommendation,
    questionnaire: normalizePlainObject(data.questionnaire),
    evaluation_billing_answer: data.evaluation_billing_answer,
    evaluation_billing_note: data.evaluation_billing_note,
    status: data.status || "Pending",
  });
}

function fromBillingRecord(id, data) {
  return {
    ...withDates(id, data),
    appointment_id: data.appointment_id || "",
    client_id: data.client_id || "",
    client_name: data.client_name || "",
    service_type: data.service_type || "",
    appointment_date: toIso(data.appointment_date),
    amount: Number(data.amount || 0),
    billing_status: data.billing_status || "Not Billed",
    invoice_number: data.invoice_number || "",
    paid_date: toIso(data.paid_date),
    payment_method: data.payment_method || "",
    payment_note: data.payment_note || "",
    card_last4: data.card_last4 || "",
    evaluation_billing_answer: data.evaluation_billing_answer || "",
    evaluation_billing_note: data.evaluation_billing_note || "",
    notes: data.notes || "",
  };
}

function toBillingRecord(data) {
  return compact({
    appointment_id: data.appointment_id,
    client_id: data.client_id,
    client_name: data.client_name,
    service_type: data.service_type,
    appointment_date: data.appointment_date,
    amount: Number(data.amount || 0),
    billing_status: data.billing_status || "Not Billed",
    invoice_number: data.invoice_number,
    paid_date: data.paid_date,
    payment_method: data.payment_method,
    payment_note: data.payment_note,
    card_last4: String(data.card_last4 || "").replace(/\D/g, "").slice(-4),
    evaluation_billing_answer: data.evaluation_billing_answer,
    evaluation_billing_note: data.evaluation_billing_note,
    notes: data.notes,
  });
}

function identityFromDb(id, data) {
  return {
    ...data,
    ...withDates(id, data),
  };
}

const transforms = {
  User: { fromDb: fromUser, toDb: toUser },
  Client: { fromDb: fromClient, toDb: toClient },
  Appointment: { fromDb: fromAppointment, toDb: toAppointment },
  AppointmentAvailability: {
    fromDb: fromAppointmentAvailability,
    toDb: toAppointmentAvailability,
  },
  Evaluation: { fromDb: fromEvaluation, toDb: toEvaluation },
  BillingRecord: { fromDb: fromBillingRecord, toDb: toBillingRecord },
  School: { fromDb: identityFromDb, toDb: compact },
  Placement: { fromDb: identityFromDb, toDb: compact },
};

function compareValues(a, b) {
  const aValue = a == null ? "" : a;
  const bValue = b == null ? "" : b;
  const aDate = typeof aValue === "string" ? Date.parse(aValue) : NaN;
  const bDate = typeof bValue === "string" ? Date.parse(bValue) : NaN;

  if (!Number.isNaN(aDate) && !Number.isNaN(bDate)) return aDate - bDate;
  if (typeof aValue === "number" && typeof bValue === "number") return aValue - bValue;
  return String(aValue).localeCompare(String(bValue), undefined, {
    numeric: true,
    sensitivity: "base",
  });
}

function sortRows(rows, sortSpec) {
  if (!sortSpec) return rows;
  const descending = sortSpec.startsWith("-");
  const field = descending ? sortSpec.slice(1) : sortSpec;
  return [...rows].sort((a, b) => {
    const result = compareValues(a[field], b[field]);
    return descending ? -result : result;
  });
}

function createEntity(entityName) {
  const collectionName = collectionNames[entityName];
  const transformer = transforms[entityName];

  if (!collectionName || !transformer) {
    throw new Error(`Unknown Firebase entity: ${entityName}`);
  }

  return {
    async list(sortSpec, limitCount) {
      const snapshot = await getDocs(collection(db, collectionName));
      const rows = snapshot.docs.map((document) =>
        transformer.fromDb(document.id, document.data())
      );
      const sorted = sortRows(rows, sortSpec);
      return limitCount ? sorted.slice(0, limitCount) : sorted;
    },

    async filter(filters = {}, sortSpec, limitCount) {
      const rows = await this.list(sortSpec);
      const filtered = rows.filter((row) =>
        Object.entries(filters).every(([key, value]) => row[key] === value)
      );
      return limitCount ? filtered.slice(0, limitCount) : filtered;
    },

    async get(id) {
      const snapshot = await getDoc(doc(db, collectionName, id));
      if (!snapshot.exists()) return null;
      return transformer.fromDb(snapshot.id, snapshot.data());
    },

    async create(data) {
      const now = new Date().toISOString();
      const sourceData = { ...(data || {}) };
      if (entityName === "Client" && !normalizeClientId(sourceData.client_id)) {
        sourceData.client_id = await nextFourDigitClientId(transformer);
      }
      const payload = compact({
        ...transformer.toDb(sourceData),
        created_date: now,
        updated_date: now,
      });
      const ref = await addDoc(collection(db, collectionName), payload);
      return transformer.fromDb(ref.id, payload);
    },

    async update(id, data) {
      const now = new Date().toISOString();
      const sourceData = { ...(data || {}) };
      if (entityName === "Client" && !normalizeClientId(sourceData.client_id)) {
        const existing = await this.get(id);
        sourceData.client_id = existing?.client_id || (await nextFourDigitClientId(transformer));
      }
      const payload = compact({
        ...transformer.toDb(sourceData),
        updated_date: now,
      });
      await updateDoc(doc(db, collectionName, id), payload);
      return this.get(id);
    },

    async delete(id) {
      await deleteDoc(doc(db, collectionName, id));
      return true;
    },
  };
}

function waitForFirebaseUser() {
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(firebaseAuth, (user) => {
      unsubscribe();
      resolve(user);
    });
  });
}

async function ensureUserRecord(firebaseUser) {
  if (!firebaseUser?.uid) return null;

  const email = firebaseUser.email || "";
  const displayName = firebaseUser.displayName || email || "User";
  const ref = doc(db, collectionNames.User, firebaseUser.uid);
  const emailKey = email.toLowerCase();

  try {
    const snapshot = await getDoc(ref);
    if (snapshot.exists()) {
      return fromUser(snapshot.id, snapshot.data());
    }

    const isBootstrapAdmin = bootstrapAdminEmails.has(emailKey);
    const now = new Date().toISOString();
    const payload = compact({
      email,
      full_name: displayName,
      name: displayName,
      crm_role: isBootstrapAdmin ? "admin" : "user",
      firebase_uid: firebaseUser.uid,
      approval_status: isBootstrapAdmin ? "approved" : "pending",
      created_date: now,
      updated_date: now,
    });

    await setDoc(ref, payload);
    return fromUser(firebaseUser.uid, payload);
  } catch (error) {
    console.error("Unable to sync Firebase user record:", error);
    throw new Error("Unable to sync your Yuiri user record. Please refresh or contact an admin.");
  }
}

export const entities = Object.fromEntries(
  Object.keys(collectionNames).map((entityName) => [entityName, createEntity(entityName)])
);

export const firebaseClient = {
  entities,
  auth: {
    async me() {
      const firebaseUser = firebaseAuth.currentUser || (await waitForFirebaseUser());
      if (!firebaseUser) return null;
      return ensureUserRecord(firebaseUser);
    },

    async logout(redirectTo) {
      await signOut(firebaseAuth);
      if (typeof redirectTo === "string" && redirectTo) {
        window.location.href = redirectTo;
      }
    },

    redirectToLogin() {
      window.dispatchEvent(new CustomEvent("yuiri:login-required"));
    },
  },
};
