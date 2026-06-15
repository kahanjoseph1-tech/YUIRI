import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, hasRole } from "@/lib/auth";
import { getCollection, createDocument, where, orderBy } from "@/lib/db";
import { Client, UserRole } from "@/lib/types";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const search = searchParams.get("search");

    const constraints = [];
    if (status) {
      constraints.push(where("status", "==", status));
    }
    constraints.push(orderBy("createdAt", "desc"));

    let clients = await getCollection<Client>("clients", constraints);

    if (search) {
      const term = search.toLowerCase();
      clients = clients.filter(
        (c) =>
          c.boyFirstName.toLowerCase().includes(term) ||
          c.boyLastName.toLowerCase().includes(term)
      );
    }

    return NextResponse.json(clients);
  } catch (error) {
    console.error("Error fetching clients:", error);
    return NextResponse.json(
      { error: "Failed to fetch clients" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasRole(user.role, ["ADMIN", "SCHEDULER"] as UserRole[])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const {
      boyFirstName,
      boyLastName,
      age,
      grade,
      parentNames,
      phone,
      email,
      city,
      currentSchool,
      referralSource,
      notes,
      status,
    } = body;

    if (!boyFirstName || !boyLastName || !parentNames || !phone || !email) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const clientData = {
      boyFirstName,
      boyLastName,
      age: age || 0,
      grade: grade || "",
      parentNames,
      phone,
      email,
      city: city || "",
      currentSchool: currentSchool || "",
      referralSource: referralSource || "",
      notes: notes || "",
      status: status || "NEW_LEAD",
      createdById: user.id,
    };

    const id = await createDocument("clients", clientData);

    return NextResponse.json({ id, ...clientData }, { status: 201 });
  } catch (error) {
    console.error("Error creating client:", error);
    return NextResponse.json(
      { error: "Failed to create client" },
      { status: 500 }
    );
  }
}
