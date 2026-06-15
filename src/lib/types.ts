export type UserRole = 'ADMIN' | 'SCHEDULER' | 'EVALUATOR' | 'BILLING';

export type ClientStatus =
  | 'NEW_LEAD'
  | 'INTAKE_SCHEDULED'
  | 'EVALUATING'
  | 'SCHOOL_MATCH_NEEDED'
  | 'REFERRED'
  | 'ACCEPTED'
  | 'INACTIVE';

export type MeetingType = 'INTAKE' | 'EVALUATION' | 'FOLLOW_UP' | 'PARENT_MEETING' | 'OTHER';

export type AppointmentStatus = 'SCHEDULED' | 'COMPLETED' | 'NO_SHOW' | 'RESCHEDULED' | 'CANCELLED';

export type EvaluationStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';

export type Urgency = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export type BillingStatus = 'NOT_BILLED' | 'INVOICE_SENT' | 'PARTIALLY_PAID' | 'PAID' | 'WAIVED';

export interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}

export interface Client {
  id: string;
  boyFirstName: string;
  boyLastName: string;
  age: number;
  grade: string;
  parentNames: string;
  phone: string;
  email: string;
  city: string;
  currentSchool: string;
  referralSource: string;
  notes?: string;
  status: ClientStatus;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

export interface Appointment {
  id: string;
  clientId: string;
  evaluatorId: string;
  dateTime: string;
  meetingType: MeetingType;
  location: string;
  status: AppointmentStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  client?: Client;
  evaluator?: User;
}

export interface Evaluation {
  id: string;
  appointmentId: string;
  clientId: string;
  evaluatorId: string;
  strengths: string;
  challenges: string;
  learningStyle: string;
  behaviorNotes: string;
  religiousLevel: string;
  familyExpectations: string;
  recommendedSchoolType: string;
  suggestedSchools: string;
  urgency: Urgency;
  finalRecommendation: string;
  status: EvaluationStatus;
  createdAt: string;
  updatedAt: string;
  client?: Client;
  evaluator?: User;
  appointment?: Appointment;
}

export interface BillingRecord {
  id: string;
  clientId: string;
  serviceType: string;
  appointmentDate: string;
  amount: number;
  billingStatus: BillingStatus;
  invoiceNumber?: string;
  paidDate?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  client?: Client;
}

export interface DashboardStats {
  newLeads: number;
  upcomingAppointments: number;
  pendingFollowUps: number;
  readyToBill: number;
  unpaidTotal: number;
}
