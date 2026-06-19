import { useAuth } from "@/lib/AuthContext";
import { getEffectiveRole, can, canAccessPage } from "@/lib/roles";

// Convenience hook: current user, their effective CRM role, and helpers.
export function useRole() {
  const { user } = useAuth();
  const role = getEffectiveRole(user);
  return {
    user,
    role,
    can: (capability) => can(role, capability),
    canAccessPage: (pageKey) => canAccessPage(role, pageKey),
    isAdmin: role === "admin",
  };
}
