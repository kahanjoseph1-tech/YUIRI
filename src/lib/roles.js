// Role-based access control for the Yuiri CRM.
// The effective role is read from the Firebase `users` collection.

export function getEffectiveRole(user) {
  if (!user) return null;
  if (user.crm_role) return user.crm_role;
  if (String(user.role).toLowerCase() === "admin") return "admin";
  return "scheduler";
}

// Which page keys each role may open. ClientDetail follows Clients access.
const PAGE_ACCESS = {
  admin: [
    "Dashboard", "Clients", "ClientDetail", "Appointments", "Evaluations",
    "Schools", "Placements", "Billing", "Reports", "Users",
  ],
  scheduler: ["Dashboard", "Clients", "ClientDetail", "Appointments", "Schools"],
  evaluator: [
    "Dashboard", "Clients", "ClientDetail", "Appointments",
    "Evaluations", "Schools", "Placements",
  ],
  billing: ["Dashboard", "Clients", "ClientDetail", "Billing"],
};

export function canAccessPage(role, pageKey) {
  if (!role) return false;
  return (PAGE_ACCESS[role] || []).includes(pageKey);
}

// Write/action capabilities per role.
const CAPABILITIES = {
  admin: {
    "clients.write": true, "appointments.write": true, "evaluations.write": true,
    "placements.write": true, "billing.write": true, "schools.write": true,
    "users.write": true,
  },
  scheduler: { "clients.write": true, "appointments.write": true },
  evaluator: { "evaluations.write": true, "placements.write": true },
  billing: { "billing.write": true },
};

export function can(role, capability) {
  if (!role) return false;
  return Boolean((CAPABILITIES[role] || {})[capability]);
}

// Navigation entries; `key` matches the page key used for routing.
export const NAV_ITEMS = [
  { key: "Dashboard", label: "Dashboard", icon: "LayoutDashboard" },
  { key: "Clients", label: "Clients", icon: "Users" },
  { key: "Appointments", label: "Appointments", icon: "Calendar" },
  { key: "Evaluations", label: "Evaluations", icon: "ClipboardList" },
  { key: "Schools", label: "Schools", icon: "GraduationCap" },
  { key: "Placements", label: "Placements", icon: "ArrowRightLeft" },
  { key: "Billing", label: "Billing", icon: "DollarSign" },
  { key: "Reports", label: "Reports", icon: "BarChart3" },
  { key: "Users", label: "Users", icon: "Settings" },
];

export function navItemsForRole(role) {
  return NAV_ITEMS.filter((item) => canAccessPage(role, item.key));
}
