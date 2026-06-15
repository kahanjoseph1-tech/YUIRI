import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, hasRole } from "@/lib/auth";
import { getDocument, updateDocument, deleteDocument } from "@/lib/db";
import { User, UserRole } from "@/lib/types";
import bcrypt from "bcryptjs";

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
    const foundUser = await getDocument<User>("users", id);
    if (!foundUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { password, ...sanitized } = foundUser;
    return NextResponse.json(sanitized);
  } catch (error) {
    console.error("Error fetching user:", error);
    return NextResponse.json(
      { error: "Failed to fetch user" },
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

    if (!hasRole(user.role, ["ADMIN"] as UserRole[])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const existing = await getDocument<User>("users", id);
    if (!existing) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const body = await request.json();
    const updateData: Record<string, unknown> = { ...body };

    // Hash password if provided
    if (body.password) {
      updateData.password = await bcrypt.hash(body.password, 10);
    }

    await updateDocument("users", id, updateData);

    const updated = await getDocument<User>("users", id);
    if (!updated) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { password, ...sanitized } = updated;
    return NextResponse.json(sanitized);
  } catch (error) {
    console.error("Error updating user:", error);
    return NextResponse.json(
      { error: "Failed to update user" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasRole(user.role, ["ADMIN"] as UserRole[])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    // Cannot delete self
    if (id === user.id) {
      return NextResponse.json(
        { error: "Cannot delete your own account" },
        { status: 400 }
      );
    }

    const existing = await getDocument<User>("users", id);
    if (!existing) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    await deleteDocument("users", id);
    return NextResponse.json({ message: "User deleted" });
  } catch (error) {
    console.error("Error deleting user:", error);
    return NextResponse.json(
      { error: "Failed to delete user" },
      { status: 500 }
    );
  }
}
