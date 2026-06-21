// Centralized enums and option lists for the Yuiri CRM.

export const GRADE_LEVELS = [
  "Pre-1A", "1st", "2nd", "3rd", "4th", "5th", "6th",
  "7th", "8th", "9th", "10th", "11th", "12th", "Beis Medrash",
];

// ---- Client ----
export const CLIENT_STATUSES = [
  "New Client",
  "Intake Scheduled",
  "Evaluating",
  "Yeshiva Match Needed",
  "Referred",
  "Accepted",
  "Inactive",
];

export const PHONE_NUMBER_TAGS = [
  "Father's Cell",
  "Home Phone",
  "Mother's Cell",
  "Custom",
];

export const DEFAULT_CALLER_OPTIONS = [
  "טאטע",
  "מאמע",
  "ביידע עלטערן",
  "בחור",
  "רבי / ראש ישיבה",
  "ישיבה",
  "אנדערע",
];

export const DEFAULT_RESPONSIBLE_OPTIONS = [
  "Father",
  "Mother",
  "Parents",
  "Boy",
  "Rabbi",
  "Yeshiva",
  "Other",
];

export const REFERRAL_SOURCES = [
  "Word of Mouth",
  "Rabbi/Rav",
  "Yeshiva",
  "Website",
  "Social Media",
  "Repeat Client",
  "Other",
];

export const RELIGIOUS_LEVELS = [
  "Chassidish",
  "Yeshivish",
  "Modern Orthodox",
  "Traditional",
  "Other",
];

// ---- School ----
export const SCHOOL_HASHKAFAS = [
  "Satmar",
  "Bobov",
  "Belz",
  "Ger",
  "Vizhnitz",
  "Skver",
  "Lubavitch",
  "Litvish/Yeshivish",
  "Modern Orthodox",
  "Sephardi",
  "Mixed",
  "Other",
];

export const SCHOOL_TYPES = [
  "Cheder",
  "Yeshiva Ketana",
  "Mesivta",
  "Beis Medrash",
  "Talmud Torah",
  "Special Education",
  "Other",
];

export const ENVIRONMENT_TYPES = [
  "Small Class Size",
  "Structured",
  "Warm/Nurturing",
  "Academically Rigorous",
  "Special Needs Friendly",
  "Mixed",
];

// ---- Appointment ----
export const MEETING_TYPES = [
  "Evaluation",
  "Follow-Up",
  "Parent Meeting",
  "Phone Call",
  "Other",
];

export const APPOINTMENT_STATUSES = [
  "Scheduled",
  "Completed",
  "No Show",
  "Rescheduled",
  "Cancelled",
];

// ---- Evaluation ----
export const LEARNING_STYLES = [
  "Visual",
  "Auditory",
  "Kinesthetic",
  "Reading/Writing",
  "Mixed",
];

export const EVALUATION_URGENCY = ["Low", "Medium", "High", "Urgent"];

export const EVALUATION_STATUSES = ["Pending", "In Progress", "Completed"];

// ---- Placement ----
export const PLACEMENT_STATUSES = [
  "Recommended",
  "Applied",
  "Interviewed",
  "Accepted",
  "Enrolled",
  "Declined",
];

// ---- Billing ----
export const SERVICE_TYPES = [
  "Initial Consultation",
  "Evaluation",
  "Yeshiva Placement",
  "Follow-Up",
  "Other",
];

export const BILLING_STATUSES = [
  "Not Billed",
  "Invoice Sent",
  "Partially Paid",
  "Paid",
  "Waived",
];

export const PAYMENT_METHODS = [
  "Cash",
  "Check",
  "Credit Card",
  "Zelle",
  "Bank Transfer",
  "Other",
];

// ---- Users / Roles ----
export const ROLES = ["admin", "user"];

export const ROLE_LABELS = {
  admin: "Admin",
  user: "User",
};
