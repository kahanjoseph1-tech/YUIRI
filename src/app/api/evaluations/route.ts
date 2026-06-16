import { NextRequest, NextResponse } from "next/server";
import {
  getCollection,
  getDocument,
  createDocument,
  where,
  orderBy,
} from "@/lib/db";
import { Evaluation, Client } from "@/lib/types";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const evaluatorId = searchParams.get("evaluatorId");
    const status = searchParams.get("status");

    const constraints = [];

    if (evaluatorId) {
      constraints.push(where("evaluatorId", "==", evaluatorId));
    }

    if (status) {
      constraints.push(where("status", "==", status));
    }

    constraints.push(orderBy("createdAt", "desc"));

    const evaluations = await getCollection<Evaluation>(
      "evaluations",
      constraints
    );

    const populated = await Promise.all(
      evaluations.map(async (eval_) => {
        const client = await getDocument<Client>("clients", eval_.clientId);
        return {
          ...eval_,
          clientName: client
            ? `${client.boyFirstName} ${client.boyLastName}`
            : "Unknown",
        };
      })
    );

    return NextResponse.json(populated);
  } catch (error) {
    console.error("Error fetching evaluations:", error);
    return NextResponse.json(
      { error: "Failed to fetch evaluations" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      appointmentId,
      clientId,
      evaluatorId,
      strengths,
      challenges,
      learningStyle,
      behaviorNotes,
      religiousLevel,
      familyExpectations,
      recommendedSchoolType,
      suggestedSchools,
      urgency,
      finalRecommendation,
      status,
    } = body;

    if (!appointmentId || !clientId || !evaluatorId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const evaluationData = {
      appointmentId,
      clientId,
      evaluatorId,
      strengths: strengths || "",
      challenges: challenges || "",
      learningStyle: learningStyle || "",
      behaviorNotes: behaviorNotes || "",
      religiousLevel: religiousLevel || "",
      familyExpectations: familyExpectations || "",
      recommendedSchoolType: recommendedSchoolType || "",
      suggestedSchools: suggestedSchools || "",
      urgency: urgency || "MEDIUM",
      finalRecommendation: finalRecommendation || "",
      status: status || "PENDING",
    };

    const id = await createDocument("evaluations", evaluationData);

    return NextResponse.json({ id, ...evaluationData }, { status: 201 });
  } catch (error) {
    console.error("Error creating evaluation:", error);
    return NextResponse.json(
      { error: "Failed to create evaluation" },
      { status: 500 }
    );
  }
}
