import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
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

const enumMaps = {
  clientStatus: {
    NEW_LEAD: "New Client",
    NEW_CLIENT: "New Client",
    INTAKE_SCHEDULED: "Intake Scheduled",
    EVALUATING: "Evaluating",
    SCHOOL_MATCH_NEEDED: "School Match Needed",
    REFERRED: "Referred",
    ACCEPTED: "Accepted",
    INACTIVE: "Inactive",
  },
  meetingType: {
    INTAKE: "Intake",
    EVALUATION: "Evaluation",
    FOLLOW_UP: "Follow-Up",
    PARENT_MEETING: "Parent Meeting",
    PHONE_CALL: "Phone Call",
    OTHER: "Other",
  },
  appointmentStatus: {
    SCHEDULED: "Scheduled",
    COMPLETED: "Completed",
    NO_SHOW: "No Show",
    RESCHEDULED: "Rescheduled",
    CANCELLED: "Cancelled",
  },
  evaluationStatus: {
    PENDING: "Pending",
    IN_PROGRESS: "In Progress",
    COMPLETED: "Completed",
  },
  urgency: {
    LOW: "Low",
    MEDIUM: "Medium",
    HIGH: "High",
    URGENT: "Urgent",
  },
  billingStatus: {
    NOT_BILLED: "Not Billed",
    INVOICE_SENT: "Invoice Sent",
    PARTIALLY_PAID: "Partially Paid",
    PAID: "Paid",
    WAIVED: "Waived",
  },
};

function normalizeEnum(value, mapName) {
  if (!value) return value;
  const valueString = String(value);
  const map = enumMaps[mapName] || {};
  if (Object.values(map).includes(valueString)) return valueString;
  const key = valueString.toUpperCase().replace(/[\s-]+/g, "_");
  return map[key] || valueString;
}

function toIso(value) {
  if (!value) return value;
  if (typeof value === "string") return value;
  if (typeof value.toDate === "function") return value.toDate().toISOString();
  if (value instanceof Date) return value.toISOString();
  return value;
}

function lowerRole(value) {
  if (!value) return "user";
  const role = String(value).toLowerCase();
  if (role === "administrator") return "admin";
  return role === "admin" ? "admin" : "user";
}

function compact(value) {
  if (Array.isArray(value)) return value.map(compact);
  if (!value || typeof value !== "object" || value instanceof Date) return value;

  return Object.fromEntries(
    Object.entries(value)
      .filter(([, entryValue]) => entryValue !== undefined)
      .map(([key, entryValue]) => [key, compact(entryValue)])
  );
}

function normalizeClientId(value) {
  const digits = String(value || "").replace(/\D/g, "");
  if (!digits) return "";
  return digits.slice(-4).padStart(4, "0");
}

function normalizePhoneNumbers(data) {
  const rawPhoneNumbers = Array.isArray(data.phone_numbers)
    ? data.phone_numbers
    : Array.isArray(data.phoneNumbers)
      ? data.phoneNumbers
      : [];

  return rawPhoneNumbers
    .map((phone) => ({
      tag: phone?.tag || "Father's Cell",
      custom_label: phone?.custom_label || phone?.customLabel || "",
      number: phone?.number || phone?.phone || "",
    }))
    .filter((phone) => phone.number || phone.custom_label);
}

function withDates(id, data) {
  return {
    id,
    created_date: toIso(data.created_date || data.createdAt || data.created_at),
    updated_date: toIso(data.updated_date || data.updatedAt || data.updated_at),
  };
}

function parentNamesFromClient(data) {
  return (
    data.parent_names ||
    data.parentNames ||
    data.parent_name ||
    data.parentName ||
    [data.father_name, data.mother_name].filter(Boolean).join(" & ")
  );
}

function fromUser(id, data) {
  const role = lowerRole(data.crm_role || data.role);
  const approvalStatus = data.approval_status || (role === "admin" ? "approved" : "approved");
  return {
    ...data,
    ...withDates(id, data),
    email: data.email || "",
    full_name: data.full_name || data.name || data.displayName || data.email || "User",
    name: data.name || data.full_name || data.displayName || data.email || "User",
    crm_role: role,
    role,
    approval_status: approvalStatus,
  };
}

function toUser(data) {
  return compact({
    email: data.email,
    full_name: data.full_name || data.name,
    name: data.name || data.full_name,
    crm_role: lowerRole(data.crm_role || data.role),
    firebase_uid: data.firebase_uid,
    approval_status: data.approval_status,
  });
}

function fromClient(id, data) {
  const parentNames = parentNamesFromClient(data);
  const phoneNumbers = normalizePhoneNumbers(data);
  const parentPhone = data.parent_phone || data.parentPhone || data.phone || phoneNumbers[0]?.number || "";
  return {
    ...data,
    ...withDates(id, data),
    client_id: normalizeClientId(data.client_id || data.clientId),
    boy_first_name: data.boy_first_name || data.boyFirstName || data.first_name || data.firstName || "",
    boy_last_name: data.boy_last_name || data.boyLastName || data.last_name || data.lastName || "",
    age: data.age,
    grade_level: data.grade_level || data.grade || "",
    father_name: data.father_name || data.parent_name || data.parentName || "",
    mother_name: data.mother_name || "",
    parent_names: parentNames || "",
    phone_numbers: phoneNumbers,
    parent_phone: parentPhone,
    parent_email: data.parent_email || data.parentEmail || data.email || "",
    city: data.city || "",
    current_school: data.current_school || data.currentSchool || "",
    referral_source: data.referral_source || data.referralSource || "",
    caller_source:
      data.caller_source || data.callerSource || data.referral_source || data.referralSource || "",
    responsible_person: data.responsible_person || data.responsiblePerson || "",
    religious_level: data.religious_level || data.religiousLevel || "",
    family_expectations: data.family_expectations || data.familyExpectations || "",
    status: normalizeEnum(data.status, "clientStatus") || "New Client",
    assigned_evaluator_id:
      data.assigned_evaluator_id || data.evaluatorId || data.createdById || "",
    special_needs: data.special_needs || [],
    ready_to_bill: Boolean(data.ready_to_bill),
    notes: data.notes || "",
  };
}

function toClient(data) {
  const parentNames = parentNamesFromClient(data);
  const phoneNumbers = normalizePhoneNumbers(data);
  const parentPhone = phoneNumbers[0]?.number || data.parent_phone;
  const callerSource =
    data.caller_source || data.callerSource || data.referral_source || data.referralSource || "";
  return compact({
    client_id: normalizeClientId(data.client_id || data.clientId),
    boy_first_name: data.boy_first_name || data.boyFirstName || data.first_name,
    boy_last_name: data.boy_last_name || data.boyLastName || data.last_name,
    age: data.age,
    grade_level: data.grade_level || data.grade,
    father_name: data.father_name || data.parent_name || data.parentName,
    mother_name: data.mother_name,
    parent_names: parentNames,
    phone_numbers: phoneNumbers,
    parent_phone: parentPhone,
    parent_email: data.parent_email || data.parentEmail || data.email,
    city: data.city,
    current_school: data.current_school || data.currentSchool,
    referral_source: callerSource,
    caller_source: callerSource,
    responsible_person: data.responsible_person || data.responsiblePerson,
    religious_level: data.religious_level || data.religiousLevel,
    family_expectations: data.family_expectations || data.familyExpectations,
    status: normalizeEnum(data.status, "clientStatus") || "New Client",
    assigned_evaluator_id: data.assigned_evaluator_id || data.evaluatorId || data.createdById,
    special_needs: data.special_needs,
    ready_to_bill: Boolean(data.ready_to_bill),
    notes: data.notes,
  });
}

async function nextFourDigitClientId(entityName, transformer) {
  const snapshots = await Promise.all(
    collectionAliases(entityName).map((collectionName) => getDocs(collection(db, collectionName)))
  );
  const used = new Set();
  let max = 0;

  snapshots.forEach((snapshot) => {
    snapshot.docs.forEach((document) => {
      const row = transformer.fromDb(document.id, document.data());
      const clientId = normalizeClientId(row.client_id || row.clientId);
      if (!clientId) return;
      used.add(clientId);
      max = Math.max(max, Number(clientId));
    });
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
    ...data,
    ...withDates(id, data),
    client_id: data.client_id || data.clientId || data.student_id || data.studentId || "",
    evaluator_id: data.evaluator_id || data.evaluatorId || "",
    date_time: toIso(data.date_time || data.dateTime || data.date),
    meeting_type: normalizeEnum(data.meeting_type || data.meetingType || data.type, "meetingType") || "Evaluation",
    location: data.location || "Office",
    status: normalizeEnum(data.status, "appointmentStatus") || "Scheduled",
    notes: data.notes || "",
    client_name: data.client_name || data.clientName || "",
    evaluator_name: data.evaluator_name || data.evaluatorName || "",
  };
}

function toAppointment(data) {
  return compact({
    client_id: data.client_id || data.clientId || data.student_id,
    evaluator_id: data.evaluator_id || data.evaluatorId,
    date_time: data.date_time || data.dateTime || data.date,
    meeting_type: normalizeEnum(data.meeting_type || data.meetingType || data.type, "meetingType") || "Evaluation",
    location: data.location || "Office",
    status: normalizeEnum(data.status, "appointmentStatus") || "Scheduled",
    notes: data.notes,
    client_name: data.client_name || data.clientName,
    evaluator_name: data.evaluator_name || data.evaluatorName,
  });
}

function fromAppointmentAvailability(id, data) {
  return {
    ...data,
    ...withDates(id, data),
    day_of_week: Number(data.day_of_week ?? data.dayOfWeek ?? 1),
    time: data.time || "09:00",
    duration_minutes: Number(data.duration_minutes || data.durationMinutes || 60),
    location: data.location || "Office",
    active: data.active !== false,
    notes: data.notes || "",
  };
}

function toAppointmentAvailability(data) {
  return compact({
    day_of_week: Number(data.day_of_week ?? data.dayOfWeek ?? 1),
    time: data.time || "09:00",
    duration_minutes: Number(data.duration_minutes || data.durationMinutes || 60),
    location: data.location || "Office",
    active: data.active !== false,
    notes: data.notes,
  });
}

function fromEvaluation(id, data) {
  return {
    ...data,
    ...withDates(id, data),
    appointment_id: data.appointment_id || data.appointmentId || "",
    client_id: data.client_id || data.clientId || "",
    evaluator_id: data.evaluator_id || data.evaluatorId || "",
    client_name: data.client_name || data.clientName || "",
    evaluator_name: data.evaluator_name || data.evaluatorName || "",
    strengths: data.strengths || "",
    challenges: data.challenges || "",
    learning_style: data.learning_style || data.learningStyle || "",
    behavior_notes: data.behavior_notes || data.behaviorNotes || "",
    religious_level_observed:
      data.religious_level_observed || data.religiousLevel || "",
    family_expectations_notes:
      data.family_expectations_notes || data.familyExpectations || "",
    recommended_school_type:
      data.recommended_school_type || data.recommendedSchoolType || "",
    suggested_schools: data.suggested_schools || data.suggestedSchools || "",
    urgency: normalizeEnum(data.urgency, "urgency") || "Medium",
    final_recommendation:
      data.final_recommendation || data.finalRecommendation || "",
    status: normalizeEnum(data.status, "evaluationStatus") || "Pending",
  };
}

function toEvaluation(data) {
  return compact({
    appointment_id: data.appointment_id || data.appointmentId,
    client_id: data.client_id || data.clientId,
    evaluator_id: data.evaluator_id || data.evaluatorId,
    client_name: data.client_name || data.clientName,
    evaluator_name: data.evaluator_name || data.evaluatorName,
    strengths: data.strengths,
    challenges: data.challenges,
    learning_style: data.learning_style || data.learningStyle,
    behavior_notes: data.behavior_notes || data.behaviorNotes,
    religious_level_observed: data.religious_level_observed || data.religiousLevel,
    family_expectations_notes: data.family_expectations_notes || data.familyExpectations,
    recommended_school_type: data.recommended_school_type || data.recommendedSchoolType,
    suggested_schools: data.suggested_schools || data.suggestedSchools,
    urgency: normalizeEnum(data.urgency, "urgency") || "Medium",
    final_recommendation: data.final_recommendation || data.finalRecommendation,
    status: normalizeEnum(data.status, "evaluationStatus") || "Pending",
  });
}

function fromBillingRecord(id, data) {
  return {
    ...data,
    ...withDates(id, data),
    client_id: data.client_id || data.clientId || data.student_id || data.studentId || "",
    client_name: data.client_name || data.clientName || data.student_name || data.studentName || "",
    service_type: data.service_type || data.serviceType || data.type || "",
    appointment_date: toIso(data.appointment_date || data.appointmentDate || data.due_date || data.dueDate || data.date),
    amount: Number(data.amount || 0),
    billing_status:
      normalizeEnum(data.billing_status || data.billingStatus || data.status, "billingStatus") || "Not Billed",
    invoice_number: data.invoice_number || data.invoiceNumber || "",
    paid_date: toIso(data.paid_date || data.paidDate),
    payment_method: data.payment_method || data.paymentMethod || data.method || "",
    notes: data.notes || "",
  };
}

function toBillingRecord(data) {
  return compact({
    client_id: data.client_id || data.clientId || data.student_id,
    client_name: data.client_name || data.clientName || data.student_name,
    service_type: data.service_type || data.serviceType || data.type,
    appointment_date: data.appointment_date || data.appointmentDate || data.due_date || data.date,
    amount: Number(data.amount || 0),
    billing_status:
      normalizeEnum(data.billing_status || data.billingStatus || data.status, "billingStatus") || "Not Billed",
    invoice_number: data.invoice_number || data.invoiceNumber,
    paid_date: data.paid_date || data.paidDate,
    payment_method: data.payment_method || data.paymentMethod || data.method,
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

function collectionAliases(entityName) {
  const names = collectionNames[entityName];
  return Array.isArray(names) ? names : [names];
}

function primaryCollectionName(entityName) {
  return collectionAliases(entityName)[0];
}

async function findDocumentInCollections(entityName, id) {
  for (const collectionName of collectionAliases(entityName)) {
    const snapshot = await getDoc(doc(db, collectionName, id));
    if (snapshot.exists()) {
      return { collectionName, snapshot };
    }
  }
  return null;
}

function createEntity(entityName) {
  const collectionName = primaryCollectionName(entityName);
  const transformer = transforms[entityName];

  if (!collectionName || !transformer) {
    throw new Error(`Unknown Firebase entity: ${entityName}`);
  }

  return {
    async list(sortSpec, limitCount) {
      const snapshots = await Promise.all(
        collectionAliases(entityName).map((name) => getDocs(collection(db, name)))
      );
      const rows = snapshots.flatMap((snapshot) =>
        snapshot.docs.map((document) => transformer.fromDb(document.id, document.data()))
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
      const result = await findDocumentInCollections(entityName, id);
      if (!result) return null;
      return transformer.fromDb(result.snapshot.id, result.snapshot.data());
    },

    async create(data) {
      const now = new Date().toISOString();
      const sourceData = { ...(data || {}) };
      if (entityName === "Client" && !normalizeClientId(sourceData.client_id || sourceData.clientId)) {
        sourceData.client_id = await nextFourDigitClientId(entityName, transformer);
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
      if (entityName === "Client" && !normalizeClientId(sourceData.client_id || sourceData.clientId)) {
        const existing = await this.get(id);
        sourceData.client_id = existing?.client_id || (await nextFourDigitClientId(entityName, transformer));
      }
      const payload = compact({
        ...transformer.toDb(sourceData),
        updated_date: now,
      });
      const target = await findDocumentInCollections(entityName, id);
      await updateDoc(doc(db, target?.collectionName || collectionName, id), payload);
      return this.get(id);
    },

    async delete(id) {
      const target = await findDocumentInCollections(entityName, id);
      await deleteDoc(doc(db, target?.collectionName || collectionName, id));
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
  const email = firebaseUser.email || "";
  const displayName = firebaseUser.displayName || email || "User";

  try {
    const users = await entities.User.list("-created_date", 500);
    const existing = users.find(
      (user) => user.email?.toLowerCase() === email.toLowerCase()
    );
    const hasAdmin = users.some((user) => lowerRole(user.crm_role || user.role) === "admin");
    if (existing) {
      if (!hasAdmin && lowerRole(existing.crm_role || existing.role) !== "admin") {
        return entities.User.update(existing.id, {
          crm_role: "admin",
          approval_status: "approved",
        });
      }
      if (!existing.approval_status) {
        return entities.User.update(existing.id, {
          crm_role: lowerRole(existing.crm_role || existing.role),
          approval_status: "approved",
        });
      }
      return existing;
    }

    const crm_role = hasAdmin ? "user" : "admin";
    return entities.User.create({
      email,
      full_name: displayName,
      name: displayName,
      crm_role,
      role: crm_role,
      firebase_uid: firebaseUser.uid,
      approval_status: hasAdmin ? "pending" : "approved",
    });
  } catch (error) {
    console.warn("Unable to sync Firebase user record:", error);
    return {
      id: firebaseUser.uid,
      email,
      full_name: displayName,
      name: displayName,
      crm_role: "admin",
      role: "admin",
      approval_status: "approved",
      firebase_uid: firebaseUser.uid,
    };
  }
}

export const entities = Object.fromEntries(
  Object.keys(collectionNames).map((entityName) => [entityName, createEntity(entityName)])
);

export const base44 = {
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
