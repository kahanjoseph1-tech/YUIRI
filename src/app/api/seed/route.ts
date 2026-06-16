import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import bcrypt from "bcryptjs";

const SEED_SECRET = "SEED_SECRET_123";

function isoNow(): string {
  return new Date().toISOString();
}

function isoDate(daysOffset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  return d.toISOString();
}

async function clearCollection(name: string): Promise<number> {
  const snapshot = await adminDb.collection(name).get();
  if (snapshot.empty) return 0;
  const batch = adminDb.batch();
  snapshot.docs.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();
  return snapshot.size;
}

export async function GET(request: NextRequest) {
  const key = new URL(request.url).searchParams.get("key");
  if (key !== SEED_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  // Check if already seeded
  const existingUsers = await adminDb.collection("users").limit(1).get();
  if (!existingUsers.empty) {
    return NextResponse.json({
      message: "Database already seeded. Delete existing data manually to re-seed.",
      seeded: true,
    });
  }

  try {
    const now = isoNow();

    // Clear collections
    for (const col of ["users", "clients", "appointments", "evaluations", "billing"]) {
      await clearCollection(col);
    }

    // --- Users ---
    const users = [
      { name: "Admin User", email: "admin@yuiri.com", password: "admin123", role: "ADMIN" },
      { name: "Sarah Scheduler", email: "scheduler@yuiri.com", password: "scheduler123", role: "SCHEDULER" },
      { name: "Eli Evaluator", email: "evaluator@yuiri.com", password: "evaluator123", role: "EVALUATOR" },
      { name: "Beth Billing", email: "billing@yuiri.com", password: "billing123", role: "BILLING" },
    ];

    const userBatch = adminDb.batch();
    const userIds: string[] = [];
    for (const u of users) {
      const ref = adminDb.collection("users").doc();
      const hashed = await bcrypt.hash(u.password, 10);
      userBatch.set(ref, {
        name: u.name,
        email: u.email,
        password: hashed,
        role: u.role,
        createdAt: now,
        updatedAt: now,
      });
      userIds.push(ref.id);
    }
    await userBatch.commit();
    const [adminId, , evaluatorId] = userIds;

    // --- Clients ---
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

    const clientBatch = adminDb.batch();
    const clientIds: string[] = [];
    for (const c of clients) {
      const ref = adminDb.collection("clients").doc();
      clientBatch.set(ref, { ...c, notes: "", createdById: adminId, createdAt: now, updatedAt: now });
      clientIds.push(ref.id);
    }
    await clientBatch.commit();

    // --- Appointments ---
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

    const apptBatch = adminDb.batch();
    const apptIds: string[] = [];
    for (const a of appointments) {
      const ref = adminDb.collection("appointments").doc();
      apptBatch.set(ref, {
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
      apptIds.push(ref.id);
    }
    await apptBatch.commit();

    // --- Evaluations ---
    const evaluations = [
      { appointmentIdx: 0, clientIdx: 0, strengths: "Strong in Gemara, good middos, well-liked by peers", challenges: "Difficulty focusing in large classroom settings", learningStyle: "Auditory learner, benefits from one-on-one instruction", behaviorNotes: "Well-behaved, occasionally restless", religiousLevel: "Yeshivish family, davens with kavana", familyExpectations: "Parents want strong limudei kodesh and small class sizes", recommendedSchoolType: "Small yeshiva mesivta with individualized attention", suggestedSchools: "Yeshiva Darchei Torah, Yeshiva Tiferet Torah", urgency: "MEDIUM", finalRecommendation: "Recommend Darchei Torah for supportive environment", status: "COMPLETED" },
      { appointmentIdx: 1, clientIdx: 1, strengths: "Exceptional beki'us, leadership qualities, athletic", challenges: "Social friction with current peer group", learningStyle: "Visual and kinesthetic learner", behaviorNotes: "Mature for his age, takes initiative", religiousLevel: "Modern Orthodox family leaning yeshivish", familyExpectations: "Competitive academic environment with sports", recommendedSchoolType: "Mesivta with college prep track", suggestedSchools: "DRS, MTA, HAFTR", urgency: "LOW", finalRecommendation: "DRS excellent fit for academic and athletic interests", status: "COMPLETED" },
      { appointmentIdx: 2, clientIdx: 2, strengths: "Creative thinker, excellent in math", challenges: "Reading comprehension below grade level, test anxiety", learningStyle: "Hands-on, project-based learning", behaviorNotes: "Quiet in class, opens up in small groups", religiousLevel: "Traditional family, warm to growth", familyExpectations: "Nurturing environment supporting learning differences", recommendedSchoolType: "Yeshiva with strong resource room", suggestedSchools: "Sinai Academy, Kulanu Academy", urgency: "HIGH", finalRecommendation: "Sinai Academy has the specialized support he needs", status: "IN_PROGRESS" },
      { appointmentIdx: 6, clientIdx: 6, strengths: "Deep thinker, passionate about learning, musical", challenges: "Difficulty with authority, needs mentorship", learningStyle: "Discussion-based, Socratic method", behaviorNotes: "Can be argumentative but responds to respect", religiousLevel: "Yeshivish background, exploring hashkafa", familyExpectations: "Yeshiva tolerating questioning", recommendedSchoolType: "Open-minded yeshiva with strong hashkafa", suggestedSchools: "Sha'alvim, Reishit Yerushalayim", urgency: "MEDIUM", finalRecommendation: "", status: "PENDING" },
      { appointmentIdx: 4, clientIdx: 4, strengths: "Social butterfly, strong oral skills, loves chesed", challenges: "Behind in core Judaic subjects, limited attention span", learningStyle: "Interactive and group-based", behaviorNotes: "Very friendly but easily distracted", religiousLevel: "Heimish family, strong community ties", familyExpectations: "Warm community-oriented yeshiva", recommendedSchoolType: "Community yeshiva with experiential learning", suggestedSchools: "Yeshiva Spring Valley, Torah Academy of Bergen County", urgency: "URGENT", finalRecommendation: "Urgent placement needed before next semester", status: "COMPLETED" },
    ];

    const evalBatch = adminDb.batch();
    for (const e of evaluations) {
      const ref = adminDb.collection("evaluations").doc();
      evalBatch.set(ref, {
        appointmentId: apptIds[e.appointmentIdx],
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
    await evalBatch.commit();

    // --- Billing Records (using "billing" collection to match API routes) ---
    const billingRecords = [
      { clientIdx: 0, serviceType: "Full Evaluation", appointmentDate: isoDate(-10), amount: 1200, billingStatus: "PAID", invoiceNumber: "YUI-2026-0001", paidDate: isoDate(-3), notes: "Paid in full by check" },
      { clientIdx: 1, serviceType: "Full Evaluation", appointmentDate: isoDate(-5), amount: 1200, billingStatus: "INVOICE_SENT", invoiceNumber: "YUI-2026-0002", notes: "Invoice sent via email" },
      { clientIdx: 2, serviceType: "Intake Session", appointmentDate: isoDate(-2), amount: 500, billingStatus: "NOT_BILLED", notes: "Awaiting evaluation completion" },
      { clientIdx: 4, serviceType: "Follow-Up Consultation", appointmentDate: isoDate(-7), amount: 250, billingStatus: "WAIVED", notes: "Pro-bono case" },
      { clientIdx: 5, serviceType: "Full Evaluation", appointmentDate: isoDate(-15), amount: 1500, billingStatus: "PARTIALLY_PAID", invoiceNumber: "YUI-2026-0003", notes: "Received $750 deposit, balance due" },
      { clientIdx: 6, serviceType: "Evaluation + School Placement", appointmentDate: isoDate(-3), amount: 1400, billingStatus: "INVOICE_SENT", invoiceNumber: "YUI-2026-0004", notes: "Payment plan requested" },
    ];

    const billBatch = adminDb.batch();
    for (const r of billingRecords) {
      const ref = adminDb.collection("billing").doc();
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
      billBatch.set(ref, data);
    }
    await billBatch.commit();

    return NextResponse.json({
      message: "Database seeded successfully!",
      seeded: true,
      counts: {
        users: users.length,
        clients: clients.length,
        appointments: appointments.length,
        evaluations: evaluations.length,
        billingRecords: billingRecords.length,
      },
      credentials: {
        admin: "admin@yuiri.com / admin123",
        scheduler: "scheduler@yuiri.com / scheduler123",
        evaluator: "evaluator@yuiri.com / evaluator123",
        billing: "billing@yuiri.com / billing123",
      },
    });
  } catch (error) {
    console.error("Seed failed:", error);
    return NextResponse.json(
      { error: "Seed failed", details: String(error) },
      { status: 500 }
    );
  }
}
