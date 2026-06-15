import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  getDocument,
  updateDocument,
  createDocument,
} from "@/lib/db";
import { Appointment, Client, User, Evaluation } from "@/lib/types";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const appointment = await getDocument<Appointment>("appointments", id);
    if (!appointment) {
      return NextResponse.json(
        { error: "Appointment not found" },
        { status: 404 }
      );
    }

    const [client, evaluator] = await Promise.all([
      getDocument<Client>("clients", appointment.clientId),
      getDocument<User>("users", appointment.evaluatorId),
    ]);

    return NextResponse.json({
      ...appointment,
      client: client || null,
      evaluator: evaluator
        ? { id: evaluator.id, name: evaluator.name, email: evaluator.email, role: evaluator.role }
        : null,
    });
  } catch (error) {
    console.error("Error fetching appointment:", error);
    return NextResponse.json(
      { error: "Failed to fetch appointment" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const existing = await getDocument<Appointment>("appointments", id);
    if (!existing) {
      return NextResponse.json(
        { error: "Appointment not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    await updateDocument("appointments", id, body);

    // AUTOMATION: If status changed to COMPLETED
    if (body.status === "COMPLETED" && existing.status !== "COMPLETED") {
      // 1. Create an Evaluation record with status PENDING
      const evaluationData = {
        appointmentId: id,
        clientId: existing.clientId,
        evaluatorId: existing.evaluatorId,
        strengths: "",
        challenges: "",
        learningStyle: "",
        behaviorNotes: "",
        religiousLevel: "",
        familyExpectations: "",
        recommendedSchoolType: "",
        suggestedSchools: "",
        urgency: "MEDIUM",
        finalRecommendation: "",
        status: "PENDING",
      };
      await createDocument("evaluations", evaluationData);

      // 2. Update the client's status to EVALUATING
      await updateDocument("clients", existing.clientId, {
        status: "EVALUATING",
      });
    }

    const updated = await getDocument<Appointment>("appointments", id);
    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating appointment:", error);
    return NextResponse.json(
      { error: "Failed to update appointment" },
      { status: 500 }
    );
  }
}
