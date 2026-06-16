import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

const ADMIN_EMAIL = "kahanjoseph1@gmail.com";

export async function GET(request: NextRequest) {
  const adminEmail = request.headers.get("x-user-email");
  if (adminEmail !== ADMIN_EMAIL) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const snapshot = await adminDb.collection("approvedUsers").get();
    const users = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    return NextResponse.json(users);
  } catch (error) {
    console.error("List users error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const adminEmail = request.headers.get("x-user-email");
  if (adminEmail !== ADMIN_EMAIL) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { email, approved, role } = await request.json();
    if (!email) {
      return NextResponse.json({ error: "Email required" }, { status: 400 });
    }

    const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };
    if (typeof approved === "boolean") updates.approved = approved;
    if (role) updates.role = role;

    await adminDb.collection("approvedUsers").doc(email).update(updates);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Update user error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const adminEmail = request.headers.get("x-user-email");
  if (adminEmail !== ADMIN_EMAIL) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { email } = await request.json();
    if (!email || email === ADMIN_EMAIL) {
      return NextResponse.json({ error: "Cannot delete admin" }, { status: 400 });
    }

    await adminDb.collection("approvedUsers").doc(email).delete();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete user error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
