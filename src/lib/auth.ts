import { getServerSession } from "next-auth";
import { authOptions } from "./auth-options";
import { UserRole } from "./types";

export async function getSession() {
  return await getServerSession(authOptions);
}

export async function getCurrentUser() {
  const session = await getSession();
  if (!session?.user) return null;
  return session.user as { id: string; name: string; email: string; role: UserRole };
}

export function hasRole(userRole: UserRole, allowedRoles: UserRole[]): boolean {
  return allowedRoles.includes(userRole);
}
