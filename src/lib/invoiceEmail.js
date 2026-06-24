import { getFunctions, httpsCallable } from "firebase/functions";
import app from "@/lib/firebase";

const functions = getFunctions(app, "us-central1");

export async function sendInvoiceEmail(payload) {
  const callSendInvoiceEmail = httpsCallable(functions, "sendInvoiceEmail");
  const response = await callSendInvoiceEmail(payload);
  return response.data;
}
