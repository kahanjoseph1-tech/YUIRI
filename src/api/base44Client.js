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
  Evaluation: "evaluations",
  BillingRecord: "billing",
  School: "schools",
  Placement: "placements",
};

const enumMaps = {
  clientStatus: {
    NEW_LEAD: "New Lead",
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
  if (!value) return undefined;
  const role = String(value).toLowerCase();
  if (role === "administrator") return "admin";
  return role;
}

function upperRole(value) {
  if (!value) return undefined;
  const role = String(value).toUpperCase();
  return role === "ADMIN" ? "ADMIN" : role;
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
    [data.father_name, data.mother_name].filter(Boolean).join(" & ")
  );
}

function fromUser(id, data) {
  const role = lowerRole(data.crm_role || data.role);
  return {
    ...data,
    ...withDates(id, data),
    email: data.email || "",
    full_name: data.full_name || data.name || data.displayName || data.email || "User",
    name: data.name || data.full_name || data.displayName || data.email || "User",
    crm_role: role || "scheduler",
    role: role || "scheduler",
  };
}

function toUser(data) {
  return compact({
    ...data,
    full_name: data.full_name || data.name,
    name: data.name || data.full_name,
    crm_role: lowerRole(data.crm_role || data.role),
    role: upperRole(data.crm_role || data.role),
  });
}

function fromClient(id, data) {
  const parentNames = parentNamesFromClient(data);
  return {
    ...data,
    ...withDates(id, data),
    boy_first_name: data.boy_first_name || data.boyFirstName || "",
    boy_last_name: data.boy_last_name || data.boyLastName || "",
    age: data.age,
    grade_level: data.grade_level || data.grade || "",
    father_name: data.father_name || "",
    mother_name: data.mother_name || "",
    parent_names: parentNames || "",
    parent_phone: data.parent_phone || data.phone || "",
    parent_email: data.parent_email || data.email || "",
    city: data.city || "",
    current_school: data.current_school || data.currentSchool || "",
    referral_source: data.referral_source || data.referralSource || "",
    religious_level: data.religious_level || data.religiousLevel || "",
    family_expectations: data.family_expectations || data.familyExpectations || "",
    status: normalizeEnum(data.status, "clientStatus") || "New Lead",
    assigned_evaluator_id:
      data.assigned_evaluator_id || data.evaluatorId || data.createdById || "",
    special_needs: data.special_needs || [],
    ready_to_bill: Boolean(data.ready_to_bill),
    notes: data.notes || "",
  };
}

function toClient(data) {
  const parentNames = parentNamesFromClient(data);
  return compact({
    ...data,
    boyFirstName: data.boy_first_name,
    boyLastName: data.boy_last_name,
    grade: data.grade_level,
    parentNames,
    phone: data.parent_phone,
    email: data.parent_email,
    currentSchool: data.current_school,
    referralSource: data.referral_source,
    familyExpectations: data.family_expectations,
    createdById: data.created_by_id || data.assigned_evaluator_id || data.createdById,
  });
}

function fromAppointment(id, data) {
  return {
    ...data,
    ...withDates(id, data),
    client_id: data.client_id || data.clientId || "",
    evaluator_id: data.evaluator_id || data.evaluatorId || "",
    date_time: toIso(data.date_time || data.dateTime),
    meeting_type: normalizeEnum(data.meeting_type || data.meetingType, "meetingType") || "Intake",
    location: data.location || "",
    status: normalizeEnum(data.status, "appointmentStatus") || "Scheduled",
    notes: data.notes || "",
    client_name: data.client_name || data.clientName || "",
    evaluator_name: data.evaluator_name || data.evaluatorName || "",
  };
}

function toAppointment(data) {
  return compact({
    ...data,
    clientId: data.client_id,
    evaluatorId: data.evaluator_id,
    dateTime: data.date_time,
    meetingType: data.meeting_type,
    clientName: data.client_name,
    evaluatorName: data.evaluator_name,
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
    ...data,
    appointmentId: data.appointment_id,
    clientId: data.client_id,
    evaluatorId: data.evaluator_id,
    clientName: data.client_name,
    evaluatorName: data.evaluator_name,
    learningStyle: data.learning_style,
    behaviorNotes: data.behavior_notes,
    religiousLevel: data.religious_level_observed,
    familyExpectations: data.family_expectations_notes,
    recommendedSchoolType: data.recommended_school_type,
    suggestedSchools: data.suggested_schools,
    finalRecommendation: data.final_recommendation,
  });
}

function fromBillingRecord(id, data) {
  return {
    ...data,
    ...withDates(id, data),
    client_id: data.client_id || data.clientId || "",
    client_name: data.client_name || data.clientName || "",
    service_type: data.service_type || data.serviceType || "",
    appointment_date: toIso(data.appointment_date || data.appointmentDate),
    amount: Number(data.amount || 0),
    billing_status:
      normalizeEnum(data.billing_status || data.billingStatus, "billingStatus") || "Not Billed",
    invoice_number: data.invoice_number || data.invoiceNumber || "",
    paid_date: toIso(data.paid_date || data.paidDate),
    payment_method: data.payment_method || data.paymentMethod || "",
    notes: data.notes || "",
  };
}

function toBillingRecord(data) {
  return compact({
    ...data,
    clientId: data.client_id,
    clientName: data.client_name,
    serviceType: data.service_type,
    appointmentDate: data.appointment_date,
    billingStatus: data.billing_status,
    invoiceNumber: data.invoice_number,
    paidDate: data.paid_date,
    paymentMethod: data.payment_method,
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
      const payload = compact({
        ...transformer.toDb(data || {}),
        createdAt: now,
        updatedAt: now,
        created_date: now,
        updated_date: now,
      });
      const ref = await addDoc(collection(db, collectionName), payload);
      return transformer.fromDb(ref.id, payload);
    },

    async update(id, data) {
      const now = new Date().toISOString();
      const payload = compact({
        ...transformer.toDb(data || {}),
        updatedAt: now,
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
  const email = firebaseUser.email || "";
  const displayName = firebaseUser.displayName || email || "User";

  try {
    const users = await entities.User.list("-created_date", 500);
    const existing = users.find(
      (user) => user.email?.toLowerCase() === email.toLowerCase()
    );
    if (existing) return existing;

    const crm_role = users.length === 0 ? "admin" : "scheduler";
    return entities.User.create({
      email,
      full_name: displayName,
      name: displayName,
      crm_role,
      role: crm_role,
      firebase_uid: firebaseUser.uid,
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
