import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore, WriteBatch } from "firebase-admin/firestore";
import { hash } from "bcryptjs";

// ---------------------------------------------------------------------------
// Firebase Admin initialization
// ---------------------------------------------------------------------------

function initFirebase() {
  if (getApps().length > 0) return;

  // Option 1: Full service-account JSON in an env var
  const serviceAccountEnv = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (serviceAccountEnv) {
    const serviceAccount = JSON.parse(serviceAccountEnv);
    initializeApp({ credential: cert(serviceAccount) });
    return;
  }

  // Option 2: Individual env vars (matches src/lib/firebase-admin.ts)
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (projectId && clientEmail && privateKey) {
    initializeApp({
      credential: cert({ projectId, clientEmail, privateKey }),
    });
    return;
  }

  // Option 3: Application Default Credentials (e.g. running on GCP or with
  // GOOGLE_APPLICATION_CREDENTIALS set)
  initializeApp();
}

initFirebase();
const db = getFirestore();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isoNow(): string {
  return new Date().toISOString();
}

function isoDate(daysOffset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  return d.toISOString();
}

/** Delete every document in a collection (batched). */
async function clearCollection(name: string): Promise<void> {
  const snapshot = await db.collection(name).get();
  if (snapshot.empty) {
    console.log(`  ${name}: already empty`);
    return;
  }
  const batchSize = 500;
  let count = 0;
  let batch: WriteBatch = db.batch();
  for (const doc of snapshot.docs) {
    batch.delete(doc.ref);
    count++;
    if (count % batchSize === 0) {
      await batch.commit();
      batch = db.batch();
    }
  }
  if (count % batchSize !== 0) await batch.commit();
  console.log(`  ${name}: deleted ${count} docs`);
}

// ---------------------------------------------------------------------------
// Seed data
// ---------------------------------------------------------------------------

async function seedUsers() {
  console.log("Seeding users...");
  const now = isoNow();
  const users = [
    { name: "Admin User", email: "admin@yuiri.com", password: "admin123", role: "ADMIN" },
    { name: "Sarah Scheduler", email: "scheduler@yuiri.com", password: "scheduler123", role: "SCHEDULER" },
    { name: "Eli Evaluator", email: "evaluator@yuiri.com", password: "evaluator123", role: "EVALUATOR" },
    { name: "Beth Billing", email: "billing@yuiri.com", password: "billing123", role: "BILLING" },
  ];

  const batch = db.batch();
  const ids: string[] = [];

  for (const u of users) {
    const ref = db.collection("users").doc();
    const hashed = await hash(u.password, 10);
    batch.set(ref, {
      name: u.name,
      email: u.email,
      password: hashed,
      role: u.role,
      createdAt: now,
      updatedAt: now,
    });
    ids.push(ref.id);
  }

  await batch.commit();
  console.log(`  Created ${users.length} users`);
  // Return IDs keyed by role for linking
  return {
    adminId: ids[0],
    schedulerId: ids[1],
    evaluatorId: ids[2],
    billingId: ids[3],
  };
}

async function seedClients(createdById: string) {
  console.log("Seeding clients...");
  const now = isoNow();

  const clients = [
    { boyFirstName: "Moshe", boyLastName: "Goldstein", age: 12, grade: "7th", parentNames: "Avi & Rivka Goldstein", phone: "718-555-1001", email: "goldstein@example.com", city: "Brooklyn, NY", currentSchool: "Yeshiva Chaim Berlin", referralSource: "Rabbi Weinberg", status: "NEW_LEAD" },
    { boyFirstName: "Yosef", boyLastName: "Katz", age: 14, grade: "9th", parentNames: "Shmuel & Leah Katz", phone: "718-555-1002", email: "katz@example.com", city: "Lakewood, NJ", currentSchool: "BMG Mesivta", referralSource: "School counselor", status: "INTAKE_SCHEDULED" },
    { boyFirstName: "Dovid", boyLastName: "Friedman", age: 10, grade: "5th", parentNames: "Menachem & Sarah Friedman", phone: "201-555-1003", email: "friedman@example.com", city: "Teaneck, NJ", currentSchool: "Yeshivat Noam", referralSource: "Parent referral", status: "EVALUATING" },
    { boyFirstName: "Ari", boyLastName: "Schwartz", age: 16, grade: "11th", parentNames: "Yaakov & Miriam Schwartz", phone: "732-555-1004", email: "schwartz@example.com", city: "Edison, NJ", currentSchool: "Torah Academy", referralSource: "Dr. Greenbaum", status: "SCHOOL_MATCH_NEEDED" },
    { boyFirstName: "Shlomo", boyLastName: "Rosenberg", age: 11, grade: "6th", parentNames: "Eli & Chana Rosenberg", phone: "718-555-1005", email: "rosenberg@example.com", city: "Monsey, NY", currentSchool: "Yeshiva Spring Valley", referralSource: "Community outreach", status: "REFERRED" },
    { boyFirstName: "Chaim", boyLastName: "Levy", age: 13, grade: "8th", parentNames: "Daniel & Rachel Levy", phone: "917-555-1006", email: "levy@example.com", city: "Queens, NY", currentSchool: "Yeshiva Tiferet Torah", referralSource: "Rabbi Marcus", status: "ACCEPTED" },
    { boyFirstName: "Baruch", boyLastName: "Cohen", age: 15, grade: "10th", parentNames: "Yitzchak & Devorah Cohen", phone: "646-555-1007", email: "cohen@example.com", city: "Manhattan, NY", currentSchool: "MTA", referralSource: "Family therapist", status: "EVALUATING" },
    { boyFirstName: "Noam", boyLastName: "Weiss", age: 9, grade: "4th", parentNames: "Reuven & Esther Weiss", phone: "201-555-1008", email: "weiss@example.com", city: "Passaic, NJ", currentSchool: "Hillel Academy", referralSource: "School principal", status: "INACTIVE" },
    { boyFirstName: "Tzvi", boyLastName: "Adler", age: 17, grade: "12th", parentNames: "Moshe & Tzipora Adler", phone: "718-555-1009", email: "adler@example.com", city: "Flatbush, NY", currentSchool: "Yeshiva of Flatbush", referralSource: "Guidance counselor", status: "NEW_LEAD" },
    { boyFirstName: "Eliyahu", boyLastName: "Stern", age: 8, grade: "3rd", parentNames: "Binyamin & Hadassah Stern", phone: "732-555-1010", email: "stern@example.com", city: "Highland Park, NJ", currentSchool: "JKHA", referralSource: "Pediatrician", status: "INTAKE_SCHEDULED" },
  ];

  const batch = db.batch();
  const ids: string[] = [];

  for (const c of clients) {
    const ref = db.collection("clients").doc();
    batch.set(ref, {
      ...c,
      createdById,
      createdAt: now,
      updatedAt: now,
    });
    ids.push(ref.id);
  }

  await batch.commit();
  console.log(`  Created ${clients.length} clients`);
  return ids;
}

async function seedAppointments(clientIds: string[], evaluatorId: string) {
  console.log("Seeding appointments...");
  const now = isoNow();

  const appointments = [
    { clientIdx: 0, dateTime: isoDate(-10), meetingType: "INTAKE", location: "Office - Brooklyn", status: "COMPLETED", notes: "Initial intake meeting with parents" },
    { clientIdx: 1, dateTime: isoDate(-5), meetingType: "INTAKE", location: "Office - Lakewood", status: "COMPLETED", notes: "Family very cooperative" },
    { clientIdx: 2, dateTime: isoDate(-2), meetingType: "EVALUATION", location: "Office - Brooklyn", status: "COMPLETED", notes: "Full evaluation session" },
    { clientIdx: 3, dateTime: isoDate(1), meetingType: "EVALUATION", location: "Office - Teaneck", status: "SCHEDULED", notes: "Scheduled evaluation" },
    { clientIdx: 4, dateTime: isoDate(-7), meetingType: "FOLLOW_UP", location: "Zoom", status: "NO_SHOW", notes: "Family did not join" },
    { clientIdx: 5, dateTime: isoDate(3), meetingType: "PARENT_MEETING", location: "Office - Brooklyn", status: "SCHEDULED", notes: "Discuss school options" },
    { clientIdx: 6, dateTime: isoDate(-3), meetingType: "EVALUATION", location: "Office - Manhattan", status: "RESCHEDULED", notes: "Rescheduled due to weather" },
    { clientIdx: 7, dateTime: isoDate(7), meetingType: "INTAKE", location: "Office - Passaic", status: "SCHEDULED", notes: "First meeting" },
  ];

  const batch = db.batch();
  const ids: string[] = [];

  for (const a of appointments) {
    const ref = db.collection("appointments").doc();
    batch.set(ref, {
      clientId: clientIds[a.clientIdx],
      evaluatorId,
      dateTime: a.dateTime,
      meetingType: a.meetingType,
      location: a.location,
      status: a.status,
      notes: a.notes,
      createdAt: now,
      updatedAt: now,
    });
    ids.push(ref.id);
  }

  await batch.commit();
  console.log(`  Created ${appointments.length} appointments`);
  return ids;
}

async function seedEvaluations(
  appointmentIds: string[],
  clientIds: string[],
  evaluatorId: string,
) {
  console.log("Seeding evaluations...");
  const now = isoNow();

  const evaluations = [
    {
      appointmentIdx: 0, clientIdx: 0,
      strengths: "Strong in Gemara, good middos, well-liked by peers",
      challenges: "Difficulty focusing in large classroom settings, struggles with written assignments",
      learningStyle: "Auditory learner, benefits from one-on-one instruction",
      behaviorNotes: "Well-behaved, occasionally restless during long sederim",
      religiousLevel: "Yeshivish family, davens with kavana",
      familyExpectations: "Parents want a yeshiva with strong limudei kodesh and small class sizes",
      recommendedSchoolType: "Small yeshiva mesivta with individualized attention",
      suggestedSchools: "Yeshiva Darchei Torah, Yeshiva Tiferet Torah",
      urgency: "MEDIUM",
      finalRecommendation: "Recommend Darchei Torah for the supportive environment and smaller classes",
      status: "COMPLETED",
    },
    {
      appointmentIdx: 1, clientIdx: 1,
      strengths: "Exceptional beki'us, leadership qualities, athletic",
      challenges: "Social friction with current peer group, needs more challenge",
      learningStyle: "Visual and kinesthetic learner",
      behaviorNotes: "Mature for his age, takes initiative",
      religiousLevel: "Modern Orthodox family leaning yeshivish",
      familyExpectations: "Looking for a competitive academic environment with strong sports program",
      recommendedSchoolType: "Mesivta with college prep track",
      suggestedSchools: "DRS, MTA, HAFTR",
      urgency: "LOW",
      finalRecommendation: "DRS would be an excellent fit given his academic and athletic interests",
      status: "COMPLETED",
    },
    {
      appointmentIdx: 2, clientIdx: 2,
      strengths: "Creative thinker, excellent in math, kind-hearted",
      challenges: "Reading comprehension below grade level, some anxiety around tests",
      learningStyle: "Hands-on, project-based learning",
      behaviorNotes: "Quiet in class, opens up in small groups",
      religiousLevel: "Traditional family, warm to growth",
      familyExpectations: "Want a nurturing environment that supports learning differences",
      recommendedSchoolType: "Yeshiva with strong resource room and learning support",
      suggestedSchools: "Sinai Academy, Kulanu Academy",
      urgency: "HIGH",
      finalRecommendation: "Sinai Academy has the specialized support he needs",
      status: "IN_PROGRESS",
    },
    {
      appointmentIdx: 6, clientIdx: 6,
      strengths: "Deep thinker, passionate about learning, musical talent",
      challenges: "Difficulty with authority, needs mentorship-style relationship with rebbeim",
      learningStyle: "Discussion-based, Socratic method",
      behaviorNotes: "Can be argumentative but responds well to respect",
      religiousLevel: "Yeshivish background, exploring hashkafa questions",
      familyExpectations: "Need a yeshiva that tolerates questioning and encourages intellectual growth",
      recommendedSchoolType: "Open-minded yeshiva with strong hashkafa program",
      suggestedSchools: "Sha'alvim, Reishit Yerushalayim",
      urgency: "MEDIUM",
      finalRecommendation: "",
      status: "PENDING",
    },
    {
      appointmentIdx: 4, clientIdx: 4,
      strengths: "Social butterfly, strong oral skills, loves chesed projects",
      challenges: "Behind in core Judaic subjects, limited attention span",
      learningStyle: "Interactive and group-based",
      behaviorNotes: "Very friendly but easily distracted",
      religiousLevel: "Heimish family, strong community ties",
      familyExpectations: "Want a warm community-oriented yeshiva",
      recommendedSchoolType: "Community yeshiva with experiential learning",
      suggestedSchools: "Yeshiva Spring Valley, Torah Academy of Bergen County",
      urgency: "URGENT",
      finalRecommendation: "Urgent placement needed before next semester",
      status: "COMPLETED",
    },
  ];

  const batch = db.batch();

  for (const e of evaluations) {
    const ref = db.collection("evaluations").doc();
    batch.set(ref, {
      appointmentId: appointmentIds[e.appointmentIdx],
      clientId: clientIds[e.clientIdx],
      evaluatorId,
      strengths: e.strengths,
      challenges: e.challenges,
      learningStyle: e.learningStyle,
      behaviorNotes: e.behaviorNotes,
      religiousLevel: e.religiousLevel,
      familyExpectations: e.familyExpectations,
      recommendedSchoolType: e.recommendedSchoolType,
      suggestedSchools: e.suggestedSchools,
      urgency: e.urgency,
      finalRecommendation: e.finalRecommendation,
      status: e.status,
      createdAt: now,
      updatedAt: now,
    });
  }

  await batch.commit();
  console.log(`  Created ${evaluations.length} evaluations`);
}

async function seedBillingRecords(clientIds: string[]) {
  console.log("Seeding billing records...");
  const now = isoNow();

  const records = [
    { clientIdx: 0, serviceType: "Full Evaluation", appointmentDate: isoDate(-10), amount: 1200, billingStatus: "PAID", invoiceNumber: "YUI-2025-001", paidDate: isoDate(-3), notes: "Paid in full by check" },
    { clientIdx: 1, serviceType: "Full Evaluation", appointmentDate: isoDate(-5), amount: 1200, billingStatus: "INVOICE_SENT", invoiceNumber: "YUI-2025-002", notes: "Invoice sent via email" },
    { clientIdx: 2, serviceType: "Intake Session", appointmentDate: isoDate(-2), amount: 500, billingStatus: "NOT_BILLED", notes: "Awaiting evaluation completion" },
    { clientIdx: 4, serviceType: "Follow-Up Consultation", appointmentDate: isoDate(-7), amount: 250, billingStatus: "WAIVED", notes: "Pro-bono case" },
    { clientIdx: 5, serviceType: "Full Evaluation", appointmentDate: isoDate(-15), amount: 1500, billingStatus: "PARTIALLY_PAID", invoiceNumber: "YUI-2025-003", notes: "Received $750 deposit, balance due" },
    { clientIdx: 6, serviceType: "Evaluation + School Placement", appointmentDate: isoDate(-3), amount: 1400, billingStatus: "INVOICE_SENT", invoiceNumber: "YUI-2025-004", notes: "Payment plan requested" },
  ];

  const batch = db.batch();

  for (const r of records) {
    const ref = db.collection("billingRecords").doc();
    const data: Record<string, unknown> = {
      clientId: clientIds[r.clientIdx],
      serviceType: r.serviceType,
      appointmentDate: r.appointmentDate,
      amount: r.amount,
      billingStatus: r.billingStatus,
      notes: r.notes,
      createdAt: now,
      updatedAt: now,
    };
    if (r.invoiceNumber) data.invoiceNumber = r.invoiceNumber;
    if (r.paidDate) data.paidDate = r.paidDate;
    batch.set(ref, data);
  }

  await batch.commit();
  console.log(`  Created ${records.length} billing records`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("=== Yuiri Firestore Seed Script ===\n");

  console.log("Clearing existing data...");
  await clearCollection("users");
  await clearCollection("clients");
  await clearCollection("appointments");
  await clearCollection("evaluations");
  await clearCollection("billingRecords");
  console.log();

  const userIds = await seedUsers();
  const clientIds = await seedClients(userIds.adminId);
  const appointmentIds = await seedAppointments(clientIds, userIds.evaluatorId);
  await seedEvaluations(appointmentIds, clientIds, userIds.evaluatorId);
  await seedBillingRecords(clientIds);

  console.log("\nSeed complete!");
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
