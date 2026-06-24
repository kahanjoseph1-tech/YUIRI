import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { defineSecret } from "firebase-functions/params";
import { HttpsError, onCall } from "firebase-functions/v2/https";

initializeApp();

const db = getFirestore();

const GMAIL_CLIENT_ID = defineSecret("GMAIL_CLIENT_ID");
const GMAIL_CLIENT_SECRET = defineSecret("GMAIL_CLIENT_SECRET");
const GMAIL_REFRESH_TOKEN = defineSecret("GMAIL_REFRESH_TOKEN");
const GMAIL_SENDER_EMAIL = defineSecret("GMAIL_SENDER_EMAIL");

const MAX_ATTACHMENT_BYTES = 8 * 1024 * 1024;

function cleanString(value, fallback = "") {
  return String(value || fallback).trim();
}

function validateEmail(value) {
  const email = cleanString(value).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new HttpsError("invalid-argument", "Enter a valid recipient email address.");
  }
  return email;
}

function escapeHtml(value) {
  return cleanString(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function encodeHeader(value) {
  const text = cleanString(value);
  if (/^[\x00-\x7F]*$/.test(text)) return text;
  return `=?UTF-8?B?${Buffer.from(text, "utf8").toString("base64")}?=`;
}

function base64Url(value) {
  return Buffer.from(value, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function wrapBase64(value) {
  return cleanString(value).replace(/(.{76})/g, "$1\r\n");
}

function safeFileName(value) {
  const fileName = cleanString(value, "Yuiri-invoice.pdf")
    .replace(/[^\w.-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return fileName.endsWith(".pdf") ? fileName : `${fileName || "Yuiri-invoice"}.pdf`;
}

function stripDataUri(value) {
  return cleanString(value).replace(/^data:application\/pdf;base64,/i, "");
}

function senderDisplayName() {
  return "\u05d9\u05d0\u05d9\u05e8\u05d5";
}

function valueLine(label, value) {
  const text = cleanString(value);
  return text ? `${label}: ${text}` : "";
}

function normalizedUrl(value) {
  return cleanString(value).replace(/\/+$/, "").toLowerCase();
}

function linkButton(label, href, tone = "primary") {
  const cleanHref = cleanString(href);
  if (!cleanHref) return "";
  const styles = tone === "primary"
    ? "background:#1e3a5f;color:#ffffff;border:1px solid #1e3a5f"
    : "background:#ffffff;color:#1e3a5f;border:1px solid #bfdbfe";
  return `<a href="${escapeHtml(cleanHref)}" style="display:inline-block;margin:8px 8px 0 0;padding:10px 14px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px;${styles}">${escapeHtml(label)}</a>`;
}

function schoolLinks(school) {
  const links = [];
  const addLink = (label, href, tone) => {
    const cleanHref = cleanString(href);
    if (!cleanHref) return;
    const key = normalizedUrl(cleanHref);
    if (links.some((link) => link.key === key)) return;
    links.push({ label, href: cleanHref, tone, key });
  };

  addLink("Open Application", school.application_url, "primary");
  addLink("School Information", school.information_url, "secondary");
  return links;
}

function schoolTextBlock(school) {
  const links = schoolLinks(school);
  return [
    cleanString(school.name, "Yeshiva"),
    valueLine("Type", school.type),
    valueLine("Grades", school.grade_range),
    valueLine("Location", school.location),
    valueLine("Address", school.address),
    valueLine("Phone", school.phone),
    valueLine("Email", school.email),
    valueLine("Contact", school.contact_person),
    ...links.map((link) => valueLine(link.label, link.href)),
  ].filter(Boolean).join("\r\n");
}

function detailPill(label, value) {
  const text = cleanString(value);
  if (!text) return "";
  return `
    <div style="display:inline-block;margin:0 6px 6px 0;padding:6px 9px;border-radius:999px;background:#f8fafc;border:1px solid #e2e8f0;color:#475569;font-size:13px">
      <strong style="color:#64748b">${escapeHtml(label)}:</strong> <span dir="auto">${escapeHtml(text)}</span>
    </div>
  `.trim();
}

function contactRow(label, value) {
  const text = cleanString(value);
  if (!text) return "";
  return `
    <tr>
      <td style="padding:4px 14px 4px 0;color:#64748b;font-size:13px;font-weight:700;white-space:nowrap;vertical-align:top">${escapeHtml(label)}</td>
      <td dir="auto" style="padding:4px 0;color:#111827;font-size:14px;vertical-align:top">${escapeHtml(text)}</td>
    </tr>
  `.trim();
}

function schoolHtmlBlock(school, index) {
  const links = schoolLinks(school);
  const pills = [
    detailPill("Type", school.type),
    detailPill("Grades", school.grade_range),
    detailPill("Location", school.location),
  ].filter(Boolean).join("");

  const contactRows = [
    contactRow("Address", school.address),
    contactRow("Phone", school.phone),
    contactRow("Email", school.email),
    contactRow("Contact", school.contact_person),
    contactRow("Website", school.website),
  ].filter(Boolean).join("");

  return `
    <div style="border:1px solid #dbe4ef;border-radius:14px;padding:18px;margin:16px 0;background:#ffffff">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse">
        <tr>
          <td style="width:40px;vertical-align:top">
            <div style="width:30px;height:30px;line-height:30px;text-align:center;border-radius:999px;background:#1e3a5f;color:#ffffff;font-weight:700">${index + 1}</div>
          </td>
          <td style="vertical-align:top">
            <h3 dir="auto" style="margin:1px 0 10px;font-size:18px;line-height:1.35;color:#111827">${escapeHtml(school.name || "Yeshiva")}</h3>
            ${pills ? `<div style="margin-bottom:8px">${pills}</div>` : ""}
            ${contactRows ? `<table role="presentation" cellspacing="0" cellpadding="0" style="border-collapse:collapse;margin:8px 0 2px">${contactRows}</table>` : ""}
            ${links.length ? `<div style="margin-top:10px">${links.map((link) => linkButton(link.label, link.href, link.tone)).join("")}</div>` : `<p style="margin:10px 0 0;color:#b45309;font-size:13px">No application link saved for this yeshiva.</p>`}
          </td>
        </tr>
      </table>
    </div>
  `.trim();
}

async function requireApprovedUser(uid) {
  if (!uid) throw new HttpsError("unauthenticated", "Sign in before sending invoice email.");

  const snapshot = await db.collection("users").doc(uid).get();
  if (!snapshot.exists) {
    throw new HttpsError("permission-denied", "Your Yuiri user record was not found.");
  }

  const user = snapshot.data() || {};
  if (user.approval_status !== "approved") {
    throw new HttpsError("permission-denied", "Your Yuiri account is not approved yet.");
  }
  return user;
}

async function readOptionalDocument(collectionName, id) {
  const cleanId = cleanString(id);
  if (!cleanId) return null;
  const snapshot = await db.collection(collectionName).doc(cleanId).get();
  return snapshot.exists ? { id: snapshot.id, ...snapshot.data() } : null;
}

async function getAccessToken() {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: cleanString(GMAIL_CLIENT_ID.value()),
      client_secret: cleanString(GMAIL_CLIENT_SECRET.value()),
      refresh_token: cleanString(GMAIL_REFRESH_TOKEN.value()),
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    console.error("Gmail token refresh failed", { status: response.status });
    throw new HttpsError("internal", "Gmail authorization failed.");
  }

  const body = await response.json();
  return body.access_token;
}

async function sendGmailMessage(rawMessage) {
  const accessToken = await getAccessToken();
  const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ raw: base64Url(rawMessage) }),
  });

  if (!response.ok) {
    console.error("Gmail send failed", { status: response.status });
    throw new HttpsError("internal", "Gmail could not send the invoice email.");
  }

  return response.json();
}

function buildInvoiceMessage({ toEmail, senderEmail, fatherName, boyName, serviceType, invoiceNumber, attachmentBase64, attachmentFileName }) {
  const fromName = senderDisplayName();
  const subject = `Yuiri invoice${invoiceNumber ? ` ${invoiceNumber}` : ""}`;
  const greetingName = fatherName || boyName || "there";
  const service = serviceType || "Evaluation";
  const mixedBoundary = `yuiri_mixed_${Date.now()}`;
  const alternativeBoundary = `yuiri_alt_${Date.now()}`;

  const textBody = [
    `Dear ${greetingName},`,
    "",
    `Hi, please see attached your invoice for ${service}.`,
    "",
    "Please let me know if you have any questions or require any further information.",
    "",
    "Best regards,",
    fromName,
  ].join("\r\n");

  const htmlBody = `
    <div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#111827">
      <p>Dear <span dir="auto">${escapeHtml(greetingName)}</span>,</p>
      <p>Hi, please see attached your invoice for <strong>${escapeHtml(service)}</strong>.</p>
      <p>Please let me know if you have any questions or require any further information.</p>
      <p>Best regards,<br><span dir="rtl">${escapeHtml(fromName)}</span></p>
    </div>
  `.trim();

  return [
    `From: ${encodeHeader(fromName)} <${senderEmail}>`,
    `To: ${toEmail}`,
    `Subject: ${encodeHeader(subject)}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/mixed; boundary="${mixedBoundary}"`,
    "",
    `--${mixedBoundary}`,
    `Content-Type: multipart/alternative; boundary="${alternativeBoundary}"`,
    "",
    `--${alternativeBoundary}`,
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: 8bit",
    "",
    textBody,
    "",
    `--${alternativeBoundary}`,
    "Content-Type: text/html; charset=UTF-8",
    "Content-Transfer-Encoding: 8bit",
    "",
    htmlBody,
    "",
    `--${alternativeBoundary}--`,
    "",
    `--${mixedBoundary}`,
    `Content-Type: application/pdf; name="${attachmentFileName}"`,
    `Content-Disposition: attachment; filename="${attachmentFileName}"`,
    "Content-Transfer-Encoding: base64",
    "",
    wrapBase64(attachmentBase64),
    "",
    `--${mixedBoundary}--`,
    "",
  ].join("\r\n");
}

function buildApplicationLinksMessage({ toEmail, senderEmail, fatherName, boyName, schools }) {
  const fromName = senderDisplayName();
  const greetingName = fatherName || boyName || "there";
  const subject = `Yeshiva applications${boyName ? ` for ${boyName}` : ""}`;
  const boundary = `yuiri_application_${Date.now()}`;

  const textBody = [
    `Dear ${greetingName},`,
    "",
    `Please see below the recommended yeshivas and application links for ${boyName || "your son"}.`,
    "",
    ...schools.flatMap((school, index) => [
      `${index + 1}. ${schoolTextBlock(school)}`,
      "",
    ]),
    "Please let me know if you have any questions or require any further information.",
    "",
    "Best regards,",
    fromName,
  ].join("\r\n");

  const htmlBody = `
    <div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#111827;background:#f8fafc;padding:22px">
      <div style="max-width:720px;margin:0 auto;background:#ffffff;border-radius:18px;border:1px solid #e5e7eb;overflow:hidden">
        <div style="background:#1e3a5f;color:#ffffff;padding:20px 24px">
          <div style="font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:#bfdbfe;font-weight:700">Yuiri Support</div>
          <div style="font-size:24px;font-weight:800;margin-top:4px">Yeshiva Recommendations</div>
        </div>
        <div style="padding:22px 24px">
          <p style="margin:0 0 12px">Dear <span dir="auto">${escapeHtml(greetingName)}</span>,</p>
          <p style="margin:0 0 18px">Please see below the recommended yeshivas and application links for <strong dir="auto">${escapeHtml(boyName || "your son")}</strong>.</p>
          ${schools.map((school, index) => schoolHtmlBlock(school, index)).join("")}
          <p style="margin:20px 0 0">Please let me know if you have any questions or require any further information.</p>
          <p style="margin:18px 0 0">Best regards,<br><span dir="rtl">${escapeHtml(fromName)}</span></p>
        </div>
      </div>
    </div>
  `.trim();

  return [
    `From: ${encodeHeader(fromName)} <${senderEmail}>`,
    `To: ${toEmail}`,
    `Subject: ${encodeHeader(subject)}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: 8bit",
    "",
    textBody,
    "",
    `--${boundary}`,
    "Content-Type: text/html; charset=UTF-8",
    "Content-Transfer-Encoding: 8bit",
    "",
    htmlBody,
    "",
    `--${boundary}--`,
    "",
  ].join("\r\n");
}

export const sendInvoiceEmail = onCall(
  {
    region: "us-central1",
    secrets: [GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN, GMAIL_SENDER_EMAIL],
  },
  async (request) => {
    const authUser = await requireApprovedUser(request.auth?.uid);
    const data = request.data || {};
    const toEmail = validateEmail(data.toEmail);
    const attachmentBase64 = stripDataUri(data.attachmentBase64);
    const attachmentFileName = safeFileName(data.attachmentFileName);
    const attachmentBytes = Buffer.from(attachmentBase64, "base64");

    if (!attachmentBase64 || attachmentBytes.length < 100) {
      throw new HttpsError("invalid-argument", "Invoice PDF attachment is missing.");
    }
    if (attachmentBytes.length > MAX_ATTACHMENT_BYTES) {
      throw new HttpsError("invalid-argument", "Invoice PDF is too large to email.");
    }

    const billingRecord = await readOptionalDocument("billing", data.billingRecordId);
    const client = await readOptionalDocument("clients", data.clientId || billingRecord?.client_id);
    const senderEmail = validateEmail(GMAIL_SENDER_EMAIL.value());
    const boyName = cleanString(data.clientName || billingRecord?.client_name || `${client?.boy_first_name || ""} ${client?.boy_last_name || ""}`);
    const fatherName = cleanString(data.fatherName || client?.father_name);
    const serviceType = cleanString(data.serviceType || billingRecord?.service_type, "Evaluation");
    const invoiceNumber = cleanString(data.invoiceNumber || billingRecord?.invoice_number);

    const rawMessage = buildInvoiceMessage({
      toEmail,
      senderEmail,
      fatherName,
      boyName,
      serviceType,
      invoiceNumber,
      attachmentBase64,
      attachmentFileName,
    });

    const gmailResult = await sendGmailMessage(rawMessage);
    const sentAt = new Date().toISOString();
    const log = {
      type: "invoice",
      provider: "gmail",
      to_email: toEmail,
      from_email: senderEmail,
      message_id: gmailResult.id || "",
      thread_id: gmailResult.threadId || "",
      client_id: data.clientId || billingRecord?.client_id || "",
      billing_record_id: data.billingRecordId || "",
      invoice_number: invoiceNumber,
      service_type: serviceType,
      sent_by_uid: request.auth.uid,
      sent_by_email: authUser.email || request.auth.token?.email || "",
      sent_at: sentAt,
      created_date: sentAt,
      updated_date: sentAt,
    };

    await db.collection("email_logs").add(log);
    if (data.billingRecordId) {
      await db.collection("billing").doc(data.billingRecordId).set(
        {
          invoice_email_sent_at: sentAt,
          invoice_email_to: toEmail,
          invoice_email_message_id: gmailResult.id || "",
          invoice_email_thread_id: gmailResult.threadId || "",
          updated_date: sentAt,
        },
        { merge: true },
      );
    }

    return {
      sent: true,
      toEmail,
      messageId: gmailResult.id || "",
      threadId: gmailResult.threadId || "",
      sentAt,
    };
  },
);

export const sendApplicationLinksEmail = onCall(
  {
    region: "us-central1",
    secrets: [GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN, GMAIL_SENDER_EMAIL],
  },
  async (request) => {
    const authUser = await requireApprovedUser(request.auth?.uid);
    const data = request.data || {};
    const toEmail = validateEmail(data.toEmail);
    const client = await readOptionalDocument("clients", data.clientId);
    if (!client) throw new HttpsError("not-found", "Client was not found.");

    const schoolIds = Array.isArray(data.schoolIds) ? data.schoolIds.map(cleanString).filter(Boolean) : [];
    if (schoolIds.length === 0) {
      throw new HttpsError("invalid-argument", "Choose at least one yeshiva to email.");
    }

    const schoolSnapshots = await Promise.all(schoolIds.map((schoolId) => db.collection("schools").doc(schoolId).get()));
    const schools = schoolSnapshots
      .filter((snapshot) => snapshot.exists)
      .map((snapshot) => ({ id: snapshot.id, ...snapshot.data() }));

    if (schools.length === 0) {
      throw new HttpsError("invalid-argument", "No yeshivas were found for this email.");
    }

    const senderEmail = validateEmail(GMAIL_SENDER_EMAIL.value());
    const boyName = cleanString(data.clientName || `${client.boy_first_name || ""} ${client.boy_last_name || ""}`, "Client");
    const fatherName = cleanString(data.fatherName || client.father_name);
    const rawMessage = buildApplicationLinksMessage({
      toEmail,
      senderEmail,
      fatherName,
      boyName,
      schools,
    });

    const gmailResult = await sendGmailMessage(rawMessage);
    const sentAt = new Date().toISOString();
    const log = {
      type: "application_links",
      provider: "gmail",
      to_email: toEmail,
      from_email: senderEmail,
      message_id: gmailResult.id || "",
      thread_id: gmailResult.threadId || "",
      client_id: client.id,
      client_name: boyName,
      school_ids: schools.map((school) => school.id),
      school_names: schools.map((school) => school.name || "Yeshiva"),
      sent_by_uid: request.auth.uid,
      sent_by_email: authUser.email || request.auth.token?.email || "",
      sent_at: sentAt,
      created_date: sentAt,
      updated_date: sentAt,
    };

    await db.collection("email_logs").add(log);
    await db.collection("clients").doc(client.id).set(
      {
        application_links_email_sent_at: sentAt,
        application_links_email_to: toEmail,
        application_links_email_school_ids: log.school_ids,
        updated_date: sentAt,
      },
      { merge: true },
    );

    return {
      sent: true,
      toEmail,
      messageId: gmailResult.id || "",
      threadId: gmailResult.threadId || "",
      sentAt,
    };
  },
);
