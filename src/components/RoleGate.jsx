import React from "react";
import { Navigate } from "react-router-dom";
import { useRole } from "@/lib/useRole";

// Wraps a protected route. Redirects unauthorized users to the Dashboard.
export default function RoleGate({ pageKey, children }) {
  const { role, canAccessPage } = useRole();

  // Role not resolved yet — render nothing briefly rather than redirecting.
  if (!role) return null;

  if (!canAccessPage(pageKey)) {
    return <Navigate to="/Dashboard" replace />;
  }

  return children;
}
