import { NextResponse } from "next/server";
import { getCollection } from "@/lib/db";

interface UserDoc {
  name: string;
  email: string;
  role?: string;
  createdAt: string;
  updatedAt: string;
}

export async function GET() {
  try {
    const users = await getCollection<UserDoc>("users", []);
    return NextResponse.json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }
}
