import { NextRequest, NextResponse } from "next/server";
import {
  getCollection,
  getDocument,
  createDocument,
  where,
  orderBy,
} from "@/lib/db";
import { Appointment, Client, User } from "@/lib/types";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const evaluatorId = searchParams.get("evaluatorId");
    const status = searchParams.get("status");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const constraints = [];
    if (evaluatorId) {
      constraints.push(where("evaluatorId", "==", evaluatorId));
    }
    if (status) {
      constraints.push(where("status", "==", status));
    }
    if (startDate) {
      constraints.push(where("dateTime", ">=", startDate));
    }
    if (endDate) {
      constraints.push(where("dateTime", "<=", endDate));
    }
    constraints.push(orderBy("dateTime", "desc"));

    const appointments = await getCollection<Appointment>(
      "appointments",
      constraints
    );

    const populated = await Promise.all(
      appointments.map(async (appt) => {
        const [client, evaluator] = await Promise.all([
          getDocument<Client>("clients", appt.clientId),
          getDocument<User>("users", appt.evaluatorId),
        ]);
        return {
          ...appt,
          clientName: client
            ? `${client.boyFirstName} ${client.boyLastName}`
            : "Unknown",
          evaluatorName: evaluator ? evaluator.name : "Unknown",
        };
      })
    );

    return NextResponse.json(populated);
  } catch (error) {
    console.error("Error fetching appointments:", error);
    return NextResponse.json(
      { error: "Failed to fetch appointments" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { clientId, evaluatorId, dateTime, meetingType, location, notes } =
      body;

    if (!clientId || !evaluatorId || !dateTime || !meetingType) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const appointmentData = {
      clientId,
      evaluatorId,
      dateTime,
      meetingType,
      location: location || "",
      status: "SCHEDULED",
      notes: notes || "",
    };

    const id = await createDocument("appointments", appointmentData);

    return NextResponse.json({ id, ...appointmentData }, { status: 201 });
  } catch (error) {
    console.error("Error creating appointment:", error);
    return NextResponse.json(
      { error: "Failed to create appointment" },
      { status: 500 }
    );
  }
}
