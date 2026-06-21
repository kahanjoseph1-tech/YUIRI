// Maps a status / enum value to a color tone, then to Tailwind classes.
// Tones: green (complete/paid/accepted), yellow (pending/scheduled),
// red (overdue/cancelled/no-show/urgent), blue (in progress), gray (inactive/waived).

export const TONE_CLASSES = {
  green: "bg-emerald-50 text-emerald-700 border-emerald-200",
  yellow: "bg-amber-50 text-amber-700 border-amber-200",
  red: "bg-red-50 text-red-700 border-red-200",
  blue: "bg-blue-50 text-blue-700 border-blue-200",
  gray: "bg-gray-100 text-gray-600 border-gray-200",
};

const STATUS_TONE = {
  // Client
  "New Client": "blue",
  "Intake Scheduled": "yellow",
  "Evaluating": "blue",
  "School Match Needed": "yellow",
  "Yeshiva Match Needed": "yellow",
  "Referred": "blue",
  "Accepted": "green",
  "Inactive": "gray",
  // Appointment
  "Scheduled": "yellow",
  "Completed": "green",
  "Done": "green",
  "Open": "blue",
  "Closed": "green",
  "Logged": "gray",
  "Overdue": "red",
  "No Show": "red",
  "Rescheduled": "blue",
  "Cancelled": "red",
  // Evaluation
  "Pending": "yellow",
  "In Progress": "blue",
  // Urgency
  "Low": "gray",
  "Medium": "yellow",
  "High": "red",
  "Urgent": "red",
  // Placement
  "Recommended": "blue",
  "Applied": "yellow",
  "Interviewed": "blue",
  "Enrolled": "green",
  "Declined": "red",
  // Billing
  "Not Billed": "gray",
  "Invoice Sent": "blue",
  "Partially Paid": "yellow",
  "Paid": "green",
  "Waived": "gray",
  // Financials
  "Income": "green",
  "Expense": "red",
};

export function toneFor(value) {
  return STATUS_TONE[value] || "gray";
}

export function badgeClass(value) {
  return TONE_CLASSES[toneFor(value)];
}
