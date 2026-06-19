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

// 1. Appointment -> "Completed": create a Pending Evaluation (once) and move
//    the client to "Evaluating".
export async function onAppointmentCompleted(appointment) {
  if (!appointment) return;

  let alreadyHasEval = false;
  try {
    const evals = await firebaseClient.entities.Evaluation.list("-created_date", 1000);
    alreadyHasEval = evals.some((e) => e.appointment_id === appointment.id);
  } catch {
    alreadyHasEval = false;
  }

  if (!alreadyHasEval) {
    await firebaseClient.entities.Evaluation.create({
      appointment_id: appointment.id,
      client_id: appointment.client_id,
      client_name: appointment.client_name,
      evaluator_id: appointment.evaluator_id,
      evaluator_name: appointment.evaluator_name,
      status: "Pending",
    });
  }

  if (appointment.client_id) {
    await firebaseClient.entities.Client.update(appointment.client_id, { status: "Evaluating" });
  }
}

// 2. Evaluation -> "Completed": flag the client for school matching + billing,
//    and open a "Not Billed" Evaluation billing record for billing staff.
export async function onEvaluationCompleted(evaluation) {
  if (!evaluation) return;

  if (evaluation.client_id) {
    await firebaseClient.entities.Client.update(evaluation.client_id, {
      status: "School Match Needed",
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
    const alreadyBilled = billing.some((record) =>
      (evaluation.appointment_id && record.appointment_id === evaluation.appointment_id) ||
      (record.client_id === evaluation.client_id &&
        record.service_type === "Evaluation" &&
        (!appointmentDate || record.appointment_date === appointmentDate))
    );
    if (alreadyBilled) return;
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
    await firebaseClient.entities.Client.update(placement.client_id, { status: "Accepted" });
  }
}
