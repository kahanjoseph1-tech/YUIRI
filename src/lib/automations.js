import { firebaseClient } from "@/api/firebaseClient";

// Client-side automations. Workflow side effects are triggered from the React
// mutation handlers and persisted to Firebase.

// Helper: safely load a single record by id (SDK .get isn't always present).
async function getById(entity, id) {
  if (!id) return null;
  try {
    return await firebaseClient.entities[entity].get(id);
  } catch {
    try {
      const all = await firebaseClient.entities[entity].list("-created_date", 1000);
      return all.find((r) => r.id === id) || null;
    } catch {
      return null;
    }
  }
}

function evaluationBillingDetails(evaluation) {
  return {
    evaluation_billing_answer: evaluation?.evaluation_billing_answer || "",
    evaluation_billing_note: evaluation?.evaluation_billing_note || "",
  };
}

export function openCaseIdForEvaluation(evaluation) {
  if (evaluation?.id) return `evaluation_${evaluation.id}`;
  if (evaluation?.client_id) return `client_${evaluation.client_id}_open`;
  return "";
}

export async function ensureOpenCaseForEvaluation(evaluation) {
  if (!evaluation?.client_id) return null;

  const now = new Date().toISOString();
  const details = {
    client_id: evaluation.client_id,
    client_name: evaluation.client_name || "",
    evaluation_id: evaluation.id || "",
    appointment_id: evaluation.appointment_id || "",
    appointment_date: evaluation.appointment_date || "",
    evaluator_id: evaluation.evaluator_id || "",
    evaluator_name: evaluation.evaluator_name || "",
    status: "Open",
    priority: evaluation.urgency || "Medium",
    opened_date: now,
    last_activity_date: now,
  };

  try {
    const openCases = await firebaseClient.entities.OpenCase.list("-created_date", 1000);
    const existingByEvaluation = evaluation.id
      ? openCases.find((record) => record.evaluation_id === evaluation.id)
      : null;
    const existing = existingByEvaluation || openCases.find((record) =>
      record.client_id === evaluation.client_id && (record.status || "Open") !== "Closed"
    );

    if (existing) {
      return firebaseClient.entities.OpenCase.update(existing.id, {
        ...details,
        status: existing.status || details.status,
        opened_date: existing.opened_date || details.opened_date,
        closed_date: existing.closed_date,
      });
    }
  } catch {
    // If lookup fails, use a deterministic document id so retries do not duplicate cases.
  }

  return firebaseClient.entities.OpenCase.upsert(openCaseIdForEvaluation(evaluation), details);
}

export async function ensureEvaluationBillingForAppointment(appointment) {
  if (!appointment || (appointment.meeting_type || "Evaluation") !== "Evaluation") return null;

  const amountDue = Number(appointment.payment_amount_due || 0);
  if (amountDue <= 0) return null;

  const billingDetails = {
    appointment_id: appointment.id,
    client_id: appointment.client_id,
    client_name: appointment.client_name,
    service_type: "Evaluation",
    appointment_date: appointment.date_time,
    amount: amountDue,
    billing_status: "Invoice Sent",
    payment_method: appointment.payment_method || "",
    payment_note: appointment.payment_note || "",
    card_last4: appointment.card_last4 || "",
    notes: appointment.payment_note || "",
  };

  try {
    const billing = await firebaseClient.entities.BillingRecord.list("-created_date", 1000);
    const existing = billing.find((record) =>
      record.appointment_id === appointment.id ||
      (record.client_id === appointment.client_id &&
        record.service_type === "Evaluation" &&
        record.appointment_date === appointment.date_time)
    );
    if (existing) {
      return firebaseClient.entities.BillingRecord.update(existing.id, billingDetails);
    }
  } catch {
    // If the duplicate lookup fails, still create the amount due.
  }

  return firebaseClient.entities.BillingRecord.create({
    ...billingDetails,
    billing_status: "Invoice Sent",
  });
}

function localDateKey(value) {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return "";
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function isDueEvaluationAppointment(appointment, todayKey = localDateKey(new Date())) {
  if (!appointment || (appointment.meeting_type || "Evaluation") !== "Evaluation") return false;
  if (["Cancelled", "No Show"].includes(appointment.status)) return false;
  const appointmentDateKey = localDateKey(appointment.date_time);
  return appointmentDateKey && appointmentDateKey <= todayKey;
}

export async function ensureEvaluationForAppointment(appointment) {
  if (!appointment) return false;

  let alreadyHasEval = false;
  try {
    const evals = await firebaseClient.entities.Evaluation.list("-created_date", 1000);
    alreadyHasEval = evals.some((e) => e.appointment_id === appointment.id);
  } catch {
    alreadyHasEval = false;
  }

  let created = false;
  if (!alreadyHasEval) {
    await firebaseClient.entities.Evaluation.create({
      appointment_id: appointment.id,
      client_id: appointment.client_id,
      client_name: appointment.client_name,
      evaluator_id: appointment.evaluator_id,
      evaluator_name: appointment.evaluator_name,
      appointment_date: appointment.date_time,
      status: "Pending",
    });
    created = true;
  }

  if (appointment.client_id) {
    await firebaseClient.entities.Client.update(appointment.client_id, { status: "Evaluating" });
  }

  return created;
}

export async function syncDueEvaluationAppointments(appointments = []) {
  const todayKey = localDateKey(new Date());
  const dueAppointments = appointments.filter((appointment) => isDueEvaluationAppointment(appointment, todayKey));

  if (dueAppointments.length === 0) return 0;

  let createdOrSynced = 0;
  for (const appointment of dueAppointments) {
    const created = await ensureEvaluationForAppointment(appointment);
    await ensureEvaluationBillingForAppointment(appointment);
    if (created) createdOrSynced += 1;
  }
  return createdOrSynced;
}

// 1. Appointment -> "Completed": create a Pending Evaluation (once) and move
//    the client to "Evaluating".
export async function onAppointmentCompleted(appointment) {
  await ensureEvaluationForAppointment(appointment);
}

// 2. Evaluation -> "Completed": flag the client for school matching + billing,
//    and open a "Not Billed" Evaluation billing record for billing staff.
export async function onEvaluationCompleted(evaluation) {
  if (!evaluation) return;

  await ensureOpenCaseForEvaluation(evaluation);

  if (evaluation.client_id) {
    await firebaseClient.entities.Client.update(evaluation.client_id, {
      status: "Yeshiva Match Needed",
      ready_to_bill: true,
    });
  }

  let appointment;
  let appointmentDate;
  if (evaluation.appointment_id) {
    appointment = await getById("Appointment", evaluation.appointment_id);
    appointmentDate = appointment?.date_time;
  }

  try {
    const billing = await firebaseClient.entities.BillingRecord.list("-created_date", 1000);
    const existing = billing.find((record) =>
      (evaluation.appointment_id && record.appointment_id === evaluation.appointment_id) ||
      (record.client_id === evaluation.client_id &&
        record.service_type === "Evaluation" &&
        (!appointmentDate || record.appointment_date === appointmentDate))
    );
    if (existing) {
      await firebaseClient.entities.BillingRecord.update(existing.id, evaluationBillingDetails(evaluation));
      return;
    }
  } catch {
    // If the duplicate check fails, continue with the fallback billing record.
  }

  await firebaseClient.entities.BillingRecord.create({
    appointment_id: evaluation.appointment_id,
    client_id: evaluation.client_id,
    client_name: evaluation.client_name,
    service_type: "Evaluation",
    billing_status: "Invoice Sent",
    amount: Number(appointment?.payment_amount_due || 300),
    appointment_date: appointmentDate,
    payment_method: appointment?.payment_method || "",
    payment_note: appointment?.payment_note || "",
    card_last4: appointment?.card_last4 || "",
    ...evaluationBillingDetails(evaluation),
    notes: appointment?.payment_note || "",
  });
}

// 3. Generate the next invoice number for the given year: YUI-YYYY-NNNN.
export function nextInvoiceNumber(records, year = new Date().getFullYear()) {
  const prefix = `YUI-${year}-`;
  let max = 0;
  (records || []).forEach((r) => {
    if (r.invoice_number && r.invoice_number.startsWith(prefix)) {
      const n = parseInt(r.invoice_number.slice(prefix.length), 10);
      if (!Number.isNaN(n) && n > max) max = n;
    }
  });
  return `${prefix}${String(max + 1).padStart(4, "0")}`;
}

// 4. Record a payment: compute the resulting billing status.
export function computePaymentStatus(amountDue, amountPaid) {
  if (Number(amountPaid) >= Number(amountDue) && Number(amountDue) > 0) return "Paid";
  if (Number(amountPaid) > 0) return "Partially Paid";
  return "Invoice Sent";
}

// 5. Placement -> "Enrolled": mark the client as "Accepted".
export async function onPlacementEnrolled(placement) {
  if (placement?.client_id) {
    const now = new Date().toISOString();
    await firebaseClient.entities.Client.update(placement.client_id, {
      status: "Accepted",
      placement_status: "Closed",
      final_school_id: placement.school_id || "",
      final_school_name: placement.school_name || "",
      final_placement_id: placement.id || "",
      placement_closed_date: now,
    });

    try {
      const openCases = await firebaseClient.entities.OpenCase.list("-created_date", 1000);
      const relatedOpenCases = openCases.filter((record) =>
        record.client_id === placement.client_id && (record.status || "Open") !== "Closed"
      );
      await Promise.all(relatedOpenCases.map((record) =>
        firebaseClient.entities.OpenCase.update(record.id, {
          status: "Closed",
          closed_date: now,
          last_activity_date: now,
          final_school_id: placement.school_id || "",
          final_school_name: placement.school_name || "",
        })
      ));
    } catch {
      // Closing the client placement should not fail just because case sync failed.
    }
  }
}
