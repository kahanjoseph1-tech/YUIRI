import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

const ADMIN_EMAIL = "kahanjoseph1@gmail.com";

export async function POST(request: NextRequest) {
  try {
    const { email, displayName, photoURL } = await request.json();
    if (!email) {
      return NextResponse.json({ error: "Email required" }, { status: 400 });
    }

    if (email === ADMIN_EMAIL) {
      const adminRef = adminDb.collection("approvedUsers").doc(email);
      const adminDoc = await adminRef.get();
      if (!adminDoc.exists) {
        await adminRef.set({
          email,
          displayName: displayName || "",
          photoURL: photoURL || "",
          role: "admin",
          approved: true,
          createdAt: new Date().toISOString(),
        });
      }
      return NextResponse.json({ status: "approved", role: "admin" });
    }

    const approvedDoc = await adminDb.collection("approvedUsers").doc(email).get();
    if (approvedDoc.exists) {
      const data = approvedDoc.data()!;
      if (data.approved) {
        return NextResponse.json({ status: "approved", role: data.role || "user" });
      }
      return NextResponse.json({ status: "pending" });
    }

    await adminDb.collection("approvedUsers").doc(email).set({
      email,
      displayName: displayName || "",
      photoURL: photoURL || "",
      role: "user",
      approved: false,
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({ status: "pending" });
  } catch (error) {
    console.error("Auth status error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
