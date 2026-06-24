import React, { useState } from "react";
import { firebaseClient } from "@/api/firebaseClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  Bell,
  CalendarPlus,
  CheckCircle2,
  Clock,
  CreditCard,
  DollarSign,
  FileText,
  GraduationCap,
  ListTodo,
  Mail,
  MapPin,
  MessageSquare,
  Pencil,
  Phone,
  Plus,
  Trash2,
  UserRound,
} from "lucide-react";
import StatusBadge from "@/components/StatusBadge";
import Combobox from "@/components/common/Combobox";
import ClientFormDrawer from "@/components/clients/ClientFormDrawer";
import AppointmentFormDialog from "@/components/appointments/AppointmentFormDialog";
import BillingFormDialog from "@/components/billing/BillingFormDialog";
import InvoiceDialog from "@/components/billing/InvoiceDialog";
import RecordPaymentDialog from "@/components/billing/RecordPaymentDialog";
import SchoolInfoDialog from "@/components/schools/SchoolInfoDialog";
import {
  ensureEvaluationBillingForAppointment,
  nextInvoiceNumber,
  recordFinancialTransactionForBillingPayment,
  syncFinancialTransactionForBillingPayment,
} from "@/lib/automations";
import { can } from "@/lib/roles";
import { useRole } from "@/lib/useRole";
import { fmtCurrency, fmtDate, fmtDateTime, initials, toDate } from "@/lib/format";

const QUESTION_FIELDS = [
  { key: "fartags", label: "פארטאגס" },
  { key: "davening", label: "דאווענען" },
  { key: "learning", label: "לערנען" },
  { key: "friends", label: "חברים" },
  { key: "chavrusas", label: "חברותה'ס" },
  { key: "liked_current_yeshiva", label: "וועלכע זאך האסטו ליב געהאט און דיין יעצטיגע ישיבה" },
  { key: "dormitory", label: "דארמאטארי" },
  { key: "watches_videos", label: "קוקט ווידיאויס" },
  { key: "smartphone", label: "האסט א סמארטפאון" },
  { key: "emotional", label: "געפילישער" },
  { key: "midos", label: "מידות" },
  { key: "derech_eretz", label: "דרך ארץ'דיגע" },
  { key: "reason_switching_yeshiva", label: "סיבה פון טוישען ישיבה" },
  { key: "strengthened_learning_davening", label: "זיך געשטארקט ביי לערנען/דאווענען" },
  { key: "bad_friend_strengthened", label: "זיך געשטארקט פון חבר השפעה" },
  { key: "likes_music", label: "האט ליב מוזיק" },
  { key: "notes", label: "הערות" },
];

const KEY_POINT_FIELDS = [
  { key: "zicht_far", label: "זיכט פאר" },
  { key: "shiur", label: "שיעור" },
  { key: "style", label: "סטייל" },
  { key: "dormitory", label: "דארמעטארי" },
];

const FOLLOW_UP_EMPTY = {
  type: "Task",
  evaluation_id: "none",
  title: "",
  details: "",
  due_date: "",
  reminder_date: "",
  priority: "Medium",
};

function fullName(client) {
  return `${client?.boy_first_name || ""} ${client?.boy_last_name || ""}`.trim() || "Client";
}

function yeshivaOptionLabel(yeshiva) {
  return [yeshiva?.name, yeshiva?.location, yeshiva?.hashkafa].filter(Boolean).join(" - ");
}

function phoneLabel(phone) {
  if (!phone) return "";
  return phone.tag === "Custom" && phone.custom_label ? phone.custom_label : phone.tag;
}

function labelWithName(label, name) {
  if (!label && !name) return "";
  if (!name) return label;
  if (!label) return name;
  return `${label} - ${name}`;
}

function clientPhoneRows(client) {
  if (Array.isArray(client.phone_numbers) && client.phone_numbers.some((phone) => phone.number)) {
    return client.phone_numbers.filter((phone) => phone.number);
  }
  return client.parent_phone ? [{ tag: "Phone", number: client.parent_phone }] : [];
}

function formatList(value) {
  if (Array.isArray(value)) return value.filter(Boolean).join(", ");
  return value || "";
}

function questionnaireAnswer(evaluation, key) {
  const questionnaire = evaluation?.questionnaire || {};
  const answer = formatList(questionnaire[key]);
  const other = questionnaire[`${key}_other`];
  return other ? `${answer}${answer ? " - " : ""}${other}` : answer;
}

function keyPointRows(evaluation) {
  const keyPoints = evaluation?.key_points || {};
  return KEY_POINT_FIELDS
    .map((field) => ({ ...field, value: keyPoints[field.key] || "" }))
    .filter((field) => field.value);
}

function isoFromLocalInput(value) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

function shortDateKey(value) {
  const date = toDate(value);
  return date ? date.toISOString().slice(0, 10) : "";
}

function isOverdue(record) {
  if (record.status === "Done" || !record.due_date) return false;
  const due = toDate(record.due_date);
  if (!due) return false;
  return due.getTime() < Date.now();
}

function dueLabel(record) {
  if (record.status === "Done") return "Done";
  if (!record.due_date) return "";
  if (isOverdue(record)) return "Overdue";
  if (shortDateKey(record.due_date) === shortDateKey(new Date())) return "Due Today";
  return `Due ${fmtDate(record.due_date)}`;
}

function Section({ title, action, children }) {
  return (
    <section className="bg-white border border-gray-100 rounded-2xl">
      <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between gap-3">
        <h2 className="font-semibold text-gray-900">{title}</h2>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

function InfoItem({ icon: Icon, label, value, onClick }) {
  if (!value) return null;
  const className = `flex items-start gap-3 rounded-lg border border-gray-100 px-3 py-3 ${
    onClick ? "text-left hover:border-blue-200 hover:bg-blue-50/60" : ""
  }`;
  const content = (
    <>
      <Icon className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
      <div className="min-w-0">
        <p className="text-xs text-gray-400">{label}</p>
        <p className="text-sm font-medium text-gray-800 break-words">{value}</p>
      </div>
    </>
  );
  if (onClick) {
    return (
      <button type="button" className={className} onClick={onClick}>
        {content}
      </button>
    );
  }
  return (
    <div className={className}>
      {content}
    </div>
  );
}

function Stat({ label, value, tone = "blue" }) {
  const tones = {
    blue: "bg-blue-50 text-blue-700",
    green: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
    gray: "bg-gray-100 text-gray-700",
  };
  return (
    <div className={`rounded-lg px-4 py-3 ${tones[tone] || tones.blue}`}>
      <p className="text-xs font-medium opacity-75">{label}</p>
      <p className="text-xl font-bold mt-1">{value}</p>
    </div>
  );
}

function billingPaidAmount(record) {
  const amountPaid = Number(record?.amount_paid || 0);
  if (amountPaid > 0) return amountPaid;
  return record?.billing_status === "Paid" ? Number(record?.amount || 0) : 0;
}

function billingBalance(record) {
  if (record?.billing_status === "Waived") return 0;
  return Math.max((Number(record?.amount) || 0) - billingPaidAmount(record), 0);
}

function billingSortDate(record) {
  return record?.payment_date || record?.paid_date || record?.appointment_date || record?.updated_date || record?.created_date || "";
}

function EvaluationCard({ evaluation, index, onAddFollowUp }) {
  const answers = QUESTION_FIELDS
    .map((field) => ({ ...field, value: questionnaireAnswer(evaluation, field.key) }))
    .filter((field) => field.value);
  const keyPoints = keyPointRows(evaluation);

  return (
    <div className="rounded-xl border border-gray-100 overflow-hidden">
      <div className="px-4 py-3 bg-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-gray-900">Evaluation {index + 1}</h3>
            <StatusBadge status={evaluation.status} />
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {fmtDateTime(evaluation.appointment_date || evaluation.created_date)}
            {evaluation.evaluator_name ? ` - ${evaluation.evaluator_name}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" className="h-8 gap-1 text-xs" onClick={() => onAddFollowUp("Task", evaluation)}>
            <ListTodo className="w-3 h-3" /> Task
          </Button>
          <Button size="sm" variant="outline" className="h-8 gap-1 text-xs" onClick={() => onAddFollowUp("Note", evaluation)}>
            <FileText className="w-3 h-3" /> Note
          </Button>
          <Button size="sm" variant="outline" className="h-8 gap-1 text-xs" onClick={() => onAddFollowUp("Message", evaluation)}>
            <MessageSquare className="w-3 h-3" /> Message
          </Button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {(evaluation.evaluation_billing_answer || evaluation.evaluation_billing_note) && (
          <div className="rounded-lg bg-amber-50 border border-amber-100 px-3 py-2 text-sm text-amber-800">
            <span className="font-medium">Billing:</span> {evaluation.evaluation_billing_answer || "No answer"}
            {evaluation.evaluation_billing_note ? ` - ${evaluation.evaluation_billing_note}` : ""}
          </div>
        )}

        {keyPoints.length > 0 && (
          <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-3">
            <h4 className="text-sm font-semibold text-gray-900 mb-3">Key points</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2" dir="rtl">
              {keyPoints.map((point) => (
                <div key={point.key} className="rounded-lg bg-white border border-blue-100 px-3 py-2">
                  <p className="text-[11px] text-gray-400">{point.label}</p>
                  <p className="text-sm font-semibold text-gray-900 mt-1">{point.value}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {answers.length === 0 ? (
          <p className="text-sm text-gray-400">No questionnaire answers saved.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {answers.map((answer) => (
              <div key={answer.key} className="rounded-lg border border-gray-100 px-3 py-2">
                <p className="text-xs text-gray-400" dir="rtl">{answer.label}</p>
                <p className="text-sm font-medium text-gray-800 mt-1" dir="rtl">{answer.value}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function FollowUpIcon({ type }) {
  if (type === "Message") return <MessageSquare className="w-4 h-4 text-blue-500" />;
  if (type === "Note") return <FileText className="w-4 h-4 text-gray-500" />;
  return <ListTodo className="w-4 h-4 text-emerald-600" />;
}

export default function ClientDetail() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const id = params.get("id");
  const queryClient = useQueryClient();
  const { role } = useRole();
  const canEditClient = can(role, "clients.write");
  const canSchedule = can(role, "appointments.write");
  const canBill = can(role, "billing.write");
  const canPlace = can(role, "placements.write");

  const [editOpen, setEditOpen] = useState(false);
  const [apptOpen, setApptOpen] = useState(false);
  const [billOpen, setBillOpen] = useState(false);
  const [editBillingRecord, setEditBillingRecord] = useState(null);
  const [payBillingRecord, setPayBillingRecord] = useState(null);
  const [invoiceBillingRecord, setInvoiceBillingRecord] = useState(null);
  const [followFormOpen, setFollowFormOpen] = useState(false);
  const [followForm, setFollowForm] = useState(FOLLOW_UP_EMPTY);
  const [recommendSchoolId, setRecommendSchoolId] = useState("");
  const [finalSchoolId, setFinalSchoolId] = useState("");
  const [schoolInfoOpen, setSchoolInfoOpen] = useState(false);

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ["clients"], queryFn: () => firebaseClient.entities.Client.list("-created_date", 1000),
  });
  const { data: appointments = [] } = useQuery({
    queryKey: ["appointments"], queryFn: () => firebaseClient.entities.Appointment.list("-date_time", 1000),
  });
  const { data: evaluations = [] } = useQuery({
    queryKey: ["evaluations"], queryFn: () => firebaseClient.entities.Evaluation.list("-created_date", 1000),
  });
  const { data: billing = [] } = useQuery({
    queryKey: ["billing"], queryFn: () => firebaseClient.entities.BillingRecord.list("-created_date", 1000),
  });
  const { data: placements = [] } = useQuery({
    queryKey: ["placements"], queryFn: () => firebaseClient.entities.Placement.list("-created_date", 1000),
  });
  const { data: schools = [] } = useQuery({
    queryKey: ["schools"], queryFn: () => firebaseClient.entities.School.list("-created_date", 1000),
  });
  const { data: openCases = [] } = useQuery({
    queryKey: ["open_cases"], queryFn: () => firebaseClient.entities.OpenCase.list("-created_date", 1000),
  });
  const { data: followUps = [] } = useQuery({
    queryKey: ["follow_ups"], queryFn: () => firebaseClient.entities.FollowUp.list("-created_date", 1000),
  });

  const client = clients.find((record) => record.id === id);
  const currentSchool = client
    ? schools.find((school) => school.id === client.current_school_id) ||
      schools.find((school) => school.name && school.name === client.current_school) ||
      null
    : null;

  const updateMutation = useMutation({
    mutationFn: ({ data }) => firebaseClient.entities.Client.update(id, data),
    onSuccess: (record) => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast.success(record?.status === "Draft" ? "Draft saved" : "Client updated");
    },
    onError: () => toast.error("Update failed"),
  });

  const createAppt = useMutation({
    mutationFn: async (data) => {
      const appointment = await firebaseClient.entities.Appointment.create(data);
      await ensureEvaluationBillingForAppointment(appointment);
      return appointment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      queryClient.invalidateQueries({ queryKey: ["billing"] });
      toast.success("Appointment scheduled");
    },
    onError: () => toast.error("Failed to schedule"),
  });

  const createBill = useMutation({
    mutationFn: async (data) => {
      const record = await firebaseClient.entities.BillingRecord.create(data);
      await syncFinancialTransactionForBillingPayment(record);
      return record;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["billing"] });
      queryClient.invalidateQueries({ queryKey: ["financials"] });
      toast.success("Billing record created");
    },
    onError: () => toast.error("Failed to create record"),
  });

  const updateBill = useMutation({
    mutationFn: async ({ billingId, data }) => {
      const {
        payment_amount_received,
        payment_event_id,
        ...billingPatch
      } = data;
      const updated = await firebaseClient.entities.BillingRecord.update(billingId, billingPatch);

      if (payment_event_id && Number(payment_amount_received || 0) > 0) {
        await recordFinancialTransactionForBillingPayment(updated, {
          amount: Number(payment_amount_received),
          eventId: payment_event_id,
          transactionDate: billingPatch.payment_date,
          paymentMethod: billingPatch.payment_method,
          notes: billingPatch.payment_note,
        });
      } else {
        await syncFinancialTransactionForBillingPayment(updated);
      }

      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["billing"] });
      queryClient.invalidateQueries({ queryKey: ["financials"] });
      toast.success("Billing updated");
    },
    onError: () => toast.error("Failed to update billing"),
  });

  const invoiceBill = useMutation({
    mutationFn: async (record) => {
      if (record.invoice_number) return record;
      const invoice_number = nextInvoiceNumber(billing);
      return firebaseClient.entities.BillingRecord.update(record.id, {
        invoice_number,
        billing_status: record.billing_status === "Not Billed" ? "Invoice Sent" : record.billing_status,
      });
    },
    onSuccess: (record) => {
      queryClient.invalidateQueries({ queryKey: ["billing"] });
      setInvoiceBillingRecord(record);
      toast.success(`Invoice ${record.invoice_number} ready`);
    },
    onError: () => toast.error("Failed to create invoice"),
  });

  const createFollowUp = useMutation({
    mutationFn: (data) => firebaseClient.entities.FollowUp.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["follow_ups"] });
      setFollowFormOpen(false);
      setFollowForm(FOLLOW_UP_EMPTY);
      toast.success("Follow-up added");
    },
    onError: (error) => {
      console.error("Failed to add follow-up:", error);
      toast.error(error?.message || "Failed to add follow-up");
    },
  });

  const updateFollowUp = useMutation({
    mutationFn: ({ followUpId, data }) => firebaseClient.entities.FollowUp.update(followUpId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["follow_ups"] });
      toast.success("Follow-up updated");
    },
    onError: () => toast.error("Failed to update follow-up"),
  });

  const invalidatePlacementData = () => {
    ["placements", "clients", "open_cases"].forEach((key) =>
      queryClient.invalidateQueries({ queryKey: [key] })
    );
  };

  const addRecommendation = useMutation({
    mutationFn: async (schoolId) => {
      if (!client) throw new Error("Client not loaded");
      const school = schools.find((record) => record.id === schoolId);
      if (!school) throw new Error("Choose a yeshiva");

      const existing = placements.find((record) =>
        record.client_id === id &&
        record.school_id === school.id &&
        record.status !== "Enrolled" &&
        !record.is_final
      );
      if (existing) return existing;

      return firebaseClient.entities.Placement.create({
        client_id: id,
        client_name: fullName(client),
        school_id: school.id,
        school_name: school.name,
        status: "Recommended",
        placement_type: "Recommendation",
        recommended_date: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["placements"] });
      setRecommendSchoolId("");
      toast.success("Yeshiva recommendation added");
    },
    onError: (error) => toast.error(error?.message || "Failed to add recommendation"),
  });

  const closePlacementCase = useMutation({
    mutationFn: async (schoolId) => {
      if (!client) throw new Error("Client not loaded");
      const school = schools.find((record) => record.id === schoolId);
      if (!school) throw new Error("Choose the final yeshiva");

      const now = new Date().toISOString();
      const today = now.slice(0, 10);
      const finalRecord = placements.find((record) => record.client_id === id && record.school_id === school.id) ||
        placements.find((record) => record.client_id === id && (record.is_final || record.placement_type === "Final Placement"));

      const placementData = {
        client_id: id,
        client_name: fullName(client),
        school_id: school.id,
        school_name: school.name,
        status: "Enrolled",
        placement_type: "Final Placement",
        is_final: true,
        decision_date: today,
        enrolled_date: now,
        closed_date: now,
      };

      const placement = finalRecord
        ? await firebaseClient.entities.Placement.update(finalRecord.id, placementData)
        : await firebaseClient.entities.Placement.create(placementData);

      await firebaseClient.entities.Client.update(id, {
        status: "Accepted",
        placement_status: "Closed",
        final_school_id: school.id,
        final_school_name: school.name,
        final_placement_id: placement.id,
        placement_closed_date: now,
      });

      const relatedOpenCases = openCases.filter((record) => record.client_id === id && (record.status || "Open") !== "Closed");
      await Promise.all(relatedOpenCases.map((record) =>
        firebaseClient.entities.OpenCase.update(record.id, {
          status: "Closed",
          closed_date: now,
          last_activity_date: now,
          final_school_id: school.id,
          final_school_name: school.name,
        })
      ));

      return placement;
    },
    onSuccess: () => {
      invalidatePlacementData();
      setFinalSchoolId("");
      toast.success("Case closed and saved to placements");
    },
    onError: (error) => toast.error(error?.message || "Failed to close case"),
  });

  const reopenPlacementCase = useMutation({
    mutationFn: async () => {
      if (!client) throw new Error("Client not loaded");
      const now = new Date().toISOString();
      const latestCase = [...openCases]
        .filter((record) => record.client_id === id)
        .sort((a, b) => new Date(b.updated_date || b.closed_date || b.created_date || 0) - new Date(a.updated_date || a.closed_date || a.created_date || 0))[0];

      if (latestCase) {
        await firebaseClient.entities.OpenCase.update(latestCase.id, {
          status: "Open",
          reopened_date: now,
          last_activity_date: now,
        });
      } else {
        await firebaseClient.entities.OpenCase.create({
          client_id: id,
          client_name: fullName(client),
          status: "Open",
          priority: "Medium",
          opened_date: now,
          reopened_date: now,
          last_activity_date: now,
        });
      }

      await firebaseClient.entities.Client.update(id, {
        status: "Yeshiva Match Needed",
        placement_status: "Open",
        placement_reopened_date: now,
      });
    },
    onSuccess: () => {
      invalidatePlacementData();
      toast.success("Case reopened");
    },
    onError: (error) => toast.error(error?.message || "Failed to reopen case"),
  });

  const deleteClient = useMutation({
    mutationFn: async () => {
      const relatedDeletes = [
        ...appointments.filter((record) => record.client_id === id).map((record) => firebaseClient.entities.Appointment.delete(record.id)),
        ...evaluations.filter((record) => record.client_id === id).map((record) => firebaseClient.entities.Evaluation.delete(record.id)),
        ...billing.filter((record) => record.client_id === id).map((record) => firebaseClient.entities.BillingRecord.delete(record.id)),
        ...placements.filter((record) => record.client_id === id).map((record) => firebaseClient.entities.Placement.delete(record.id)),
        ...openCases.filter((record) => record.client_id === id).map((record) => firebaseClient.entities.OpenCase.delete(record.id)),
        ...followUps.filter((record) => record.client_id === id).map((record) => firebaseClient.entities.FollowUp.delete(record.id)),
      ];
      await Promise.all(relatedDeletes);
      await firebaseClient.entities.Client.delete(id);
    },
    onSuccess: () => {
      ["clients", "appointments", "evaluations", "billing", "placements", "open_cases", "follow_ups"].forEach((key) =>
        queryClient.invalidateQueries({ queryKey: [key] })
      );
      toast.success("Client deleted");
      navigate(createPageUrl("Clients"));
    },
    onError: (error) => {
      console.error("Failed to delete client:", error);
      toast.error(error?.message || "Failed to delete client");
    },
  });

  if (isLoading) {
    return <div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-44 rounded-2xl" /></div>;
  }

  if (!client) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500">Client not found.</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate(createPageUrl("Clients"))}>Back to Clients</Button>
      </div>
    );
  }

  const myAppts = appointments.filter((record) => record.client_id === id);
  const myEvals = evaluations
    .filter((record) => record.client_id === id)
    .sort((a, b) => new Date(b.appointment_date || b.created_date) - new Date(a.appointment_date || a.created_date));
  const myBilling = billing
    .filter((record) => record.client_id === id)
    .sort((a, b) => new Date(billingSortDate(b) || 0) - new Date(billingSortDate(a) || 0));
  const totalCharged = myBilling.reduce((sum, record) => sum + (Number(record.amount) || 0), 0);
  const totalPaid = myBilling.reduce((sum, record) => sum + billingPaidAmount(record), 0);
  const totalBalance = myBilling.reduce((sum, record) => sum + billingBalance(record), 0);
  const lastPayment = myBilling.find((record) => billingPaidAmount(record) > 0 && (record.payment_date || record.paid_date));
  const myPlacements = placements
    .filter((record) => record.client_id === id)
    .sort((a, b) => new Date(b.closed_date || b.updated_date || b.created_date || 0) - new Date(a.closed_date || a.updated_date || a.created_date || 0));
  const finalPlacement = myPlacements.find((record) => record.is_final || record.placement_type === "Final Placement" || record.status === "Enrolled");
  const recommendationPlacements = myPlacements.filter((record) =>
    record.id !== finalPlacement?.id &&
    !record.is_final &&
    record.placement_type !== "Final Placement" &&
    record.status !== "Enrolled"
  );
  const myFollowUps = followUps
    .filter((record) => record.client_id === id)
    .sort((a, b) => {
      const statusA = a.status === "Done" ? 1 : 0;
      const statusB = b.status === "Done" ? 1 : 0;
      if (statusA !== statusB) return statusA - statusB;
      const dueA = toDate(a.due_date)?.getTime() || Number.MAX_SAFE_INTEGER;
      const dueB = toDate(b.due_date)?.getTime() || Number.MAX_SAFE_INTEGER;
      if (dueA !== dueB) return dueA - dueB;
      return new Date(b.created_date || 0) - new Date(a.created_date || 0);
    });

  const openTasks = myFollowUps.filter((record) => record.type === "Task" && record.status !== "Done");
  const latestEval = myEvals[0];
  const latestKeyPoints = keyPointRows(latestEval);
  const name = fullName(client);
  const yeshivaOptions = schools.map((school) => ({
    value: school.id,
    label: yeshivaOptionLabel(school),
  }));
  const selectedFinalSchoolId = finalSchoolId || finalPlacement?.school_id || client.final_school_id || "";
  const caseIsClosed = client.placement_status ? client.placement_status === "Closed" : Boolean(finalPlacement?.closed_date);

  const timeline = [
    ...myAppts.map((record) => ({ ts: record.date_time || record.created_date, type: "Appointment", label: `${record.meeting_type || "Meeting"}`, status: record.status })),
    ...myEvals.map((record) => ({ ts: record.created_date, type: "Evaluation", label: record.evaluator_name || "Evaluation", status: record.status })),
    ...myBilling.map((record) => ({ ts: record.created_date, type: "Billing", label: `${record.service_type || "Service"}${record.invoice_number ? ` - ${record.invoice_number}` : ""}`, status: record.billing_status })),
    ...myPlacements.map((record) => ({ ts: record.closed_date || record.updated_date || record.created_date, type: "Placement", label: `${record.school_name || "Yeshiva"}${record.placement_type ? ` - ${record.placement_type}` : ""}`, status: record.status })),
    ...myFollowUps.map((record) => ({ ts: record.created_date, type: record.type || "Follow-up", label: record.title || record.details || "Follow-up", status: record.status })),
  ].sort((a, b) => new Date(b.ts) - new Date(a.ts));

  const handleDeleteClient = () => {
    const confirmed = window.confirm(`Delete ${name} and all related appointments, evaluations, billing records, placements, open cases, and follow-ups?`);
    if (confirmed) deleteClient.mutate();
  };

  const startFollowUp = (type = "Task", evaluation = latestEval) => {
    setFollowForm({
      ...FOLLOW_UP_EMPTY,
      type,
      evaluation_id: evaluation?.id || "none",
      title: type === "Task" ? "Call a principal" : "",
    });
    setFollowFormOpen(true);
  };

  const submitFollowUp = () => {
    const title = String(followForm.title || "").trim();
    const details = String(followForm.details || "").trim();
    if (!title && !details) {
      toast.error("Add a title or note");
      return;
    }

    createFollowUp.mutate({
      client_id: id,
      client_name: name,
      evaluation_id: followForm.evaluation_id === "none" ? "" : followForm.evaluation_id,
      type: followForm.type,
      title: title || followForm.type,
      details,
      due_date: isoFromLocalInput(followForm.due_date),
      reminder_date: isoFromLocalInput(followForm.reminder_date),
      priority: followForm.priority,
      status: followForm.type === "Task" ? "Open" : "Logged",
    });
  };

  const toggleTaskDone = (record, done) => {
    updateFollowUp.mutate({
      followUpId: record.id,
      data: {
        status: done ? "Done" : "Open",
        completed_date: done ? new Date().toISOString() : "",
      },
    });
  };

  return (
    <div className="space-y-6">
      <Link to={createPageUrl("Clients")} className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900">
        <ArrowLeft className="w-4 h-4" /> Back to Clients
      </Link>

      <section className="bg-white border border-gray-100 rounded-2xl p-5">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-5">
          <div className="flex items-start gap-4 min-w-0">
            <div className="h-24 w-24 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center overflow-hidden shrink-0">
              {client.profile_photo?.url ? (
                <img src={client.profile_photo.url} alt={name} className="h-full w-full object-cover" />
              ) : (
                <span className="text-2xl font-bold text-blue-700">{initials(client.boy_first_name, client.boy_last_name)}</span>
              )}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-3xl font-bold text-gray-900 truncate">{name}</h1>
                <StatusBadge status={client.status} />
              </div>
              <p className="text-sm text-gray-500 mt-1">
                {client.client_id ? `Client ID ${client.client_id}` : "No client ID"}
                {client.age ? ` - ווי אלט ${client.age}` : ""}
                {client.current_school ? ` - ${client.current_school}` : ""}
              </p>
              <div className="flex flex-wrap gap-2 mt-4">
                {canSchedule && (
                  <Button variant="outline" className="gap-2" onClick={() => setApptOpen(true)}>
                    <CalendarPlus className="w-4 h-4" /> Schedule
                  </Button>
                )}
                {canBill && (
                  <Button variant="outline" className="gap-2" onClick={() => setBillOpen(true)}>
                    <FileText className="w-4 h-4" /> Invoice
                  </Button>
                )}
                <Button variant="outline" className="gap-2" onClick={() => startFollowUp("Task")}>
                  <ListTodo className="w-4 h-4" /> Add Task
                </Button>
              </div>
            </div>
          </div>

          {canEditClient && (
            <div className="flex flex-wrap gap-2 lg:justify-end">
              <Button variant="outline" className="gap-2 text-red-600 hover:text-red-700" onClick={handleDeleteClient} disabled={deleteClient.isPending}>
                <Trash2 className="w-4 h-4" /> Delete
              </Button>
              <Button className="gap-2 bg-[#1e3a5f] hover:bg-[#1e3a5f]/90" onClick={() => setEditOpen(true)}>
                <Pencil className="w-4 h-4" /> Edit Profile
              </Button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-6">
          <Stat label="Evaluations" value={myEvals.length} />
          <Stat label="Open Tasks" value={openTasks.length} tone={openTasks.length ? "amber" : "green"} />
          <Stat label="Appointments" value={myAppts.length} tone="gray" />
          <Stat label="Billing Records" value={myBilling.length} tone="gray" />
        </div>
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_0.85fr] gap-6">
        <Section title="Profile Information">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <InfoItem icon={UserRound} label="Client ID" value={client.client_id} />
            {clientPhoneRows(client).map((phone, index) => (
              <InfoItem key={index} icon={Phone} label={phoneLabel(phone) || "Phone"} value={phone.number} />
            ))}
            <InfoItem icon={Mail} label="Email address" value={client.parent_email} />
            <InfoItem icon={MapPin} label="City" value={client.city} />
            <InfoItem
              icon={GraduationCap}
              label="לערנט בישיבה"
              value={client.current_school}
              onClick={currentSchool ? () => setSchoolInfoOpen(true) : undefined}
            />
            <InfoItem icon={GraduationCap} label="שיעור" value={client.shiur} />
            <InfoItem icon={UserRound} label="טאטע'ס נאמען" value={client.father_name} />
            <InfoItem icon={UserRound} label="Mother" value={client.mother_name} />
            <InfoItem icon={Phone} label="ווער רופט" value={labelWithName(client.caller_source || client.referral_source, client.caller_name)} />
            <InfoItem icon={FileText} label="סיבה" value={client.reason} />
            <InfoItem icon={CheckCircle2} label="Responsible" value={labelWithName(client.responsible_person, client.responsible_name)} />
          </div>
        </Section>

        <Section title="Case Snapshot">
          <div className="space-y-4">
            <div className="rounded-xl border border-gray-100 p-4">
              <p className="text-xs text-gray-400">Latest Evaluation</p>
              {latestEval ? (
                <div className="mt-2 space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold text-gray-900">{fmtDateTime(latestEval.appointment_date || latestEval.created_date)}</p>
                    <StatusBadge status={latestEval.status} />
                  </div>
                  <p className="text-sm text-gray-500">{latestEval.evaluator_name || "No evaluator"}</p>
                </div>
              ) : (
                <p className="text-sm text-gray-400 mt-2">No evaluation yet.</p>
              )}
            </div>

            {latestKeyPoints.length > 0 && (
              <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-4">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <p className="text-sm font-semibold text-gray-900">Key points</p>
                  <StatusBadge status="Evaluation" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2" dir="rtl">
                  {latestKeyPoints.map((point) => (
                    <div key={point.key} className="rounded-lg bg-white border border-blue-100 px-3 py-2">
                      <p className="text-[11px] text-gray-400">{point.label}</p>
                      <p className="text-sm font-semibold text-gray-900 mt-1">{point.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(client.special_needs?.length > 0 || client.family_expectations || client.notes) ? (
              <div className="space-y-3 text-sm">
                {client.special_needs?.length > 0 && (
                  <p><span className="text-gray-400">Special needs:</span> {client.special_needs.join(", ")}</p>
                )}
                {client.family_expectations && <p><span className="text-gray-400">Family expectations:</span> {client.family_expectations}</p>}
                {client.notes && <p><span className="text-gray-400">Notes:</span> {client.notes}</p>}
              </div>
            ) : (
              <p className="text-sm text-gray-400">No extra profile notes.</p>
            )}
          </div>
        </Section>
      </div>

      <Section
        title="Billing"
        action={canBill && (
          <Button size="sm" className="gap-2 bg-[#1e3a5f] hover:bg-[#1e3a5f]/90" onClick={() => setBillOpen(true)}>
            <Plus className="w-4 h-4" /> Add Charge
          </Button>
        )}
      >
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Stat label="Charged" value={fmtCurrency(totalCharged)} tone="gray" />
          <Stat label="Paid" value={fmtCurrency(totalPaid)} tone={totalPaid > 0 ? "green" : "gray"} />
          <Stat label="Balance" value={fmtCurrency(totalBalance)} tone={totalBalance > 0 ? "amber" : "green"} />
          <Stat label="Last Payment" value={lastPayment ? fmtDate(lastPayment.payment_date || lastPayment.paid_date) : "-"} tone="blue" />
        </div>

        {myBilling.length === 0 ? (
          <div className="mt-5 rounded-xl border border-dashed border-gray-200 p-8 text-center">
            <DollarSign className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-gray-400">No billing records yet.</p>
          </div>
        ) : (
          <div className="mt-5 divide-y divide-gray-100 rounded-xl border border-gray-100">
            {myBilling.map((record) => {
              const paid = billingPaidAmount(record);
              const balance = billingBalance(record);
              const paymentDate = record.payment_date || record.paid_date;
              const canRecordPayment = canBill && balance > 0 && record.billing_status !== "Waived";
              return (
                <div key={record.id} className="p-4">
                  <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-gray-900">{record.service_type || "Charge"}</p>
                        <StatusBadge status={record.billing_status} />
                      </div>
                      <p className="text-xs text-gray-400 mt-1">
                        {record.invoice_number ? `Invoice ${record.invoice_number}` : "No invoice number"}
                        {record.appointment_date ? ` - ${fmtDate(record.appointment_date)}` : ""}
                      </p>
                      {(record.payment_method || record.payment_note || paymentDate) && (
                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                          {paymentDate && <span>Paid {fmtDateTime(paymentDate)}</span>}
                          {record.payment_method && <span className="inline-flex items-center gap-1"><CreditCard className="w-3 h-3" /> {record.payment_method}</span>}
                          {record.payment_note && <span>{record.payment_note}</span>}
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-right lg:min-w-72">
                      <div>
                        <p className="text-[11px] text-gray-400">Charge</p>
                        <p className="font-semibold text-gray-900">{fmtCurrency(record.amount)}</p>
                      </div>
                      <div>
                        <p className="text-[11px] text-gray-400">Paid</p>
                        <p className="font-semibold text-emerald-700">{fmtCurrency(paid)}</p>
                      </div>
                      <div>
                        <p className="text-[11px] text-gray-400">Balance</p>
                        <p className={`font-semibold ${balance > 0 ? "text-amber-700" : "text-emerald-700"}`}>{fmtCurrency(balance)}</p>
                      </div>
                    </div>
                  </div>

                  {canBill && (
                    <div className="mt-3 flex flex-wrap justify-end gap-2">
                      <Button type="button" size="sm" variant="outline" className="gap-1" onClick={() => invoiceBill.mutate(record)} disabled={invoiceBill.isPending}>
                        <FileText className="w-3 h-3" /> {record.invoice_number ? "Invoice" : "Create Invoice"}
                      </Button>
                      <Button type="button" size="sm" variant="outline" onClick={() => setEditBillingRecord(record)}>
                        Edit
                      </Button>
                      {canRecordPayment && (
                        <Button type="button" size="sm" className="gap-1 bg-emerald-600 hover:bg-emerald-700" onClick={() => setPayBillingRecord(record)}>
                          <DollarSign className="w-3 h-3" /> Record Payment
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Section>

      <Section title="Placement">
        <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-5">
          <div className="rounded-xl border border-gray-100 p-4 space-y-4">
            <div>
              <h3 className="font-semibold text-gray-900">First recommendations</h3>
              <p className="text-xs text-gray-400 mt-1">Search the yeshiva list and add as many recommendations as needed.</p>
            </div>

            {canPlace && (
              <div className="flex flex-col sm:flex-row gap-2">
                <Combobox
                  options={yeshivaOptions}
                  value={recommendSchoolId}
                  onChange={setRecommendSchoolId}
                  placeholder="Search yeshiva list..."
                  emptyText="No yeshivas found."
                />
                <Button
                  type="button"
                  className="gap-2 bg-[#1e3a5f] hover:bg-[#1e3a5f]/90"
                  disabled={!recommendSchoolId || addRecommendation.isPending}
                  onClick={() => addRecommendation.mutate(recommendSchoolId)}
                >
                  <Plus className="w-4 h-4" /> Add
                </Button>
              </div>
            )}

            {recommendationPlacements.length === 0 ? (
              <p className="text-sm text-gray-400 rounded-lg border border-dashed border-gray-200 p-4 text-center">
                No yeshiva recommendations yet.
              </p>
            ) : (
              <div className="space-y-2">
                {recommendationPlacements.map((placement) => (
                  <div key={placement.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-gray-100 px-3 py-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-gray-900 truncate">{placement.school_name || "Yeshiva"}</p>
                        <StatusBadge status={placement.status || "Recommended"} />
                      </div>
                      <p className="text-xs text-gray-400 mt-1">
                        {placement.recommended_date ? `Recommended ${fmtDate(placement.recommended_date)}` : "Recommendation"}
                      </p>
                    </div>
                    {canPlace && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setFinalSchoolId(placement.school_id)}
                      >
                        Use as final
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-xl border border-gray-100 p-4 space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold text-gray-900">Final placement</h3>
                <p className="text-xs text-gray-400 mt-1">Where he was placed when the case is ready to close.</p>
              </div>
              <StatusBadge status={caseIsClosed ? "Closed" : "Open"} />
            </div>

            {canPlace && (
              <Combobox
                options={yeshivaOptions}
                value={selectedFinalSchoolId}
                onChange={setFinalSchoolId}
                placeholder="Search final yeshiva..."
                emptyText="No yeshivas found."
              />
            )}

            {finalPlacement || client.final_school_name ? (
              <div className="rounded-lg bg-emerald-50 border border-emerald-100 p-3 text-sm text-emerald-800">
                <p className="font-semibold">{finalPlacement?.school_name || client.final_school_name}</p>
                <p className="text-xs mt-1">
                  {finalPlacement?.closed_date || client.placement_closed_date
                    ? `Closed ${fmtDate(finalPlacement?.closed_date || client.placement_closed_date)}`
                    : "Saved as final placement"}
                </p>
              </div>
            ) : (
              <p className="text-sm text-gray-400 rounded-lg border border-dashed border-gray-200 p-4 text-center">
                No final placement selected yet.
              </p>
            )}

            {canPlace && (
              <div className="flex flex-col sm:flex-row gap-2">
                {caseIsClosed ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    disabled={reopenPlacementCase.isPending}
                    onClick={() => reopenPlacementCase.mutate()}
                  >
                    Reopen Case
                  </Button>
                ) : (
                  <Button
                    type="button"
                    className="w-full bg-[#1e3a5f] hover:bg-[#1e3a5f]/90"
                    disabled={!selectedFinalSchoolId || closePlacementCase.isPending}
                    onClick={() => closePlacementCase.mutate(selectedFinalSchoolId)}
                  >
                    Close Case
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </Section>

      <Section
        title="Evaluations"
        action={latestEval && (
          <Button size="sm" variant="outline" className="gap-2" onClick={() => startFollowUp("Task", latestEval)}>
            <Plus className="w-4 h-4" /> Follow-up
          </Button>
        )}
      >
        {myEvals.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">No evaluations yet.</p>
        ) : (
          <div className="space-y-4">
            {myEvals.map((evaluation, index) => (
              <EvaluationCard key={evaluation.id} evaluation={evaluation} index={index} onAddFollowUp={startFollowUp} />
            ))}
          </div>
        )}
      </Section>

      <Section
        title="Follow-ups, Notes, Messages & Tasks"
        action={(
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" className="gap-1" onClick={() => startFollowUp("Task")}>
              <ListTodo className="w-3 h-3" /> Task
            </Button>
            <Button size="sm" variant="outline" className="gap-1" onClick={() => startFollowUp("Note")}>
              <FileText className="w-3 h-3" /> Note
            </Button>
            <Button size="sm" variant="outline" className="gap-1" onClick={() => startFollowUp("Message")}>
              <MessageSquare className="w-3 h-3" /> Message
            </Button>
          </div>
        )}
      >
        {followFormOpen && (
          <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-4 mb-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-gray-500">Type</Label>
                <Select value={followForm.type} onValueChange={(value) => setFollowForm((current) => ({ ...current, type: value }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Task">Task</SelectItem>
                    <SelectItem value="Note">Note</SelectItem>
                    <SelectItem value="Message">Message</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-gray-500">Evaluation</Label>
                <Select value={followForm.evaluation_id} onValueChange={(value) => setFollowForm((current) => ({ ...current, evaluation_id: value }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No specific evaluation</SelectItem>
                    {myEvals.map((evaluation) => (
                      <SelectItem key={evaluation.id} value={evaluation.id}>
                        {fmtDate(evaluation.appointment_date || evaluation.created_date)} - {evaluation.evaluator_name || "Evaluation"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-gray-500">Priority</Label>
                <Select value={followForm.priority} onValueChange={(value) => setFollowForm((current) => ({ ...current, priority: value }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Low">Low</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                    <SelectItem value="Urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-gray-500">Title</Label>
                <Input
                  value={followForm.title}
                  onChange={(event) => setFollowForm((current) => ({ ...current, title: event.target.value }))}
                  placeholder="Example: Call a principal"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-gray-500">Due date</Label>
                  <Input
                    type="datetime-local"
                    value={followForm.due_date}
                    onChange={(event) => setFollowForm((current) => ({ ...current, due_date: event.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-gray-500">Reminder</Label>
                  <Input
                    type="datetime-local"
                    value={followForm.reminder_date}
                    onChange={(event) => setFollowForm((current) => ({ ...current, reminder_date: event.target.value }))}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1.5 mt-3">
              <Label className="text-xs text-gray-500">Details</Label>
              <Textarea
                rows={3}
                value={followForm.details}
                onChange={(event) => setFollowForm((current) => ({ ...current, details: event.target.value }))}
                placeholder="Notes, message text, or task details..."
              />
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <Button type="button" variant="outline" onClick={() => setFollowFormOpen(false)}>Cancel</Button>
              <Button type="button" className="bg-[#1e3a5f] hover:bg-[#1e3a5f]/90" onClick={submitFollowUp} disabled={createFollowUp.isPending}>
                Save
              </Button>
            </div>
          </div>
        )}

        {myFollowUps.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">No follow-ups yet.</p>
        ) : (
          <div className="divide-y divide-gray-100 rounded-xl border border-gray-100">
            {myFollowUps.map((record) => {
              const label = dueLabel(record);
              const linkedEval = myEvals.find((evaluation) => evaluation.id === record.evaluation_id);
              return (
                <div key={record.id} className="p-4 flex flex-col md:flex-row md:items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    {record.type === "Task" ? (
                      <Checkbox
                        className="mt-0.5"
                        checked={record.status === "Done"}
                        onCheckedChange={(checked) => toggleTaskDone(record, Boolean(checked))}
                      />
                    ) : (
                      <FollowUpIcon type={record.type} />
                    )}
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className={`font-semibold ${record.status === "Done" ? "text-gray-400 line-through" : "text-gray-900"}`}>
                          {record.title || record.type}
                        </p>
                        <StatusBadge status={isOverdue(record) ? "Overdue" : record.status} />
                        <StatusBadge status={record.priority} />
                      </div>
                      {record.details && <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap">{record.details}</p>}
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-gray-400">
                        <span>{record.type}</span>
                        {linkedEval && <span>Evaluation: {fmtDate(linkedEval.appointment_date || linkedEval.created_date)}</span>}
                        {label && <span className="inline-flex items-center gap-1"><Clock className="w-3 h-3" /> {label}</span>}
                        {record.reminder_date && <span className="inline-flex items-center gap-1"><Bell className="w-3 h-3" /> Reminder {fmtDateTime(record.reminder_date)}</span>}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Section>

      {client.files?.length > 0 && (
        <Section title="Files">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {client.files.map((file, index) => (
              <a
                key={`${file.path || file.url}-${index}`}
                href={file.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 rounded-lg border border-gray-100 px-3 py-2 text-sm text-blue-700 hover:bg-blue-50"
              >
                <FileText className="h-4 w-4 shrink-0" />
                <span className="truncate">{file.name || "File"}</span>
              </a>
            ))}
          </div>
        </Section>
      )}

      <Section title="Timeline">
        {timeline.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">No activity yet.</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {timeline.map((entry, index) => (
              <div key={index} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">{entry.type}</p>
                  <p className="text-xs text-gray-400">{entry.label} - {entry.type === "Appointment" ? fmtDateTime(entry.ts) : fmtDate(entry.ts)}</p>
                </div>
                <StatusBadge status={entry.status} />
              </div>
            ))}
          </div>
        )}
      </Section>

      <ClientFormDrawer
        open={editOpen} onOpenChange={setEditOpen} client={client}
        onSave={(data) => updateMutation.mutateAsync({ data })}
      />
      <AppointmentFormDialog
        open={apptOpen} onOpenChange={setApptOpen}
        clients={clients} defaultClientId={id}
        onSave={(data) => createAppt.mutateAsync(data)}
      />
      <BillingFormDialog
        open={billOpen} onOpenChange={setBillOpen}
        clients={clients} record={{ client_id: id, client_name: name, service_type: "Evaluation", billing_status: "Invoice Sent", amount: "" }}
        onSave={(data) => createBill.mutateAsync(data)}
      />
      <BillingFormDialog
        open={!!editBillingRecord}
        onOpenChange={() => setEditBillingRecord(null)}
        clients={clients}
        record={editBillingRecord}
        onSave={(data) => updateBill.mutateAsync({ billingId: editBillingRecord.id, data })}
      />
      <RecordPaymentDialog
        open={!!payBillingRecord}
        onOpenChange={() => setPayBillingRecord(null)}
        record={payBillingRecord}
        onSave={(data) => updateBill.mutateAsync({ billingId: payBillingRecord.id, data })}
      />
      <InvoiceDialog
        open={!!invoiceBillingRecord}
        onOpenChange={() => setInvoiceBillingRecord(null)}
        record={invoiceBillingRecord}
        client={client}
      />
      <SchoolInfoDialog
        open={schoolInfoOpen}
        onOpenChange={setSchoolInfoOpen}
        school={currentSchool}
      />
    </div>
  );
}
