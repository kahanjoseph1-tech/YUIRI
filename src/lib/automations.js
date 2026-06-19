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

  let appointmentDate;
  if (evaluation.appointment_id) {
    const appt = await getById("Appointment", evaluation.appointment_id);
    appointmentDate = appt?.date_time;
  }

  await firebaseClient.entities.BillingRecord.create({
    client_id: evaluation.client_id,
    client_name: evaluation.client_name,
    service_type: "Evaluation",
    billing_status: "Not Billed",
    amount: 0,
    appointment_date: appointmentDate,
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
