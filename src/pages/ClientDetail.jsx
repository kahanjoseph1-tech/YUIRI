import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Pencil, CalendarPlus, FileText, Phone, Mail, MapPin, GraduationCap } from "lucide-react";
import StatusBadge from "@/components/StatusBadge";
import ClientFormDrawer from "@/components/clients/ClientFormDrawer";
import AppointmentFormDialog from "@/components/appointments/AppointmentFormDialog";
import BillingFormDialog from "@/components/billing/BillingFormDialog";
import { can } from "@/lib/roles";
import { useRole } from "@/lib/useRole";
import { fmtDate, fmtDateTime } from "@/lib/format";

function Info({ icon: Icon, label, value }) {
  if (!value) return null;
  return (
    <div className="flex items-center gap-2 text-sm text-gray-600">
      <Icon className="w-4 h-4 text-gray-400" /> <span className="text-gray-400">{label}:</span> {value}
    </div>
  );
}

function phoneLabel(phone) {
  if (!phone) return "";
  return phone.tag === "Custom" && phone.custom_label ? phone.custom_label : phone.tag;
}

function clientPhoneRows(client) {
  if (Array.isArray(client.phone_numbers) && client.phone_numbers.some((phone) => phone.number)) {
    return client.phone_numbers.filter((phone) => phone.number);
  }
  return client.parent_phone ? [{ tag: "Phone", number: client.parent_phone }] : [];
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

  const [editOpen, setEditOpen] = useState(false);
  const [apptOpen, setApptOpen] = useState(false);
  const [billOpen, setBillOpen] = useState(false);

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ["clients"], queryFn: () => base44.entities.Client.list("-created_date", 1000),
  });
  const { data: appointments = [] } = useQuery({
    queryKey: ["appointments"], queryFn: () => base44.entities.Appointment.list("-date_time", 1000),
  });
  const { data: evaluations = [] } = useQuery({
    queryKey: ["evaluations"], queryFn: () => base44.entities.Evaluation.list("-created_date", 1000),
  });
  const { data: billing = [] } = useQuery({
    queryKey: ["billing"], queryFn: () => base44.entities.BillingRecord.list("-created_date", 1000),
  });
  const { data: users = [] } = useQuery({
    queryKey: ["users"], queryFn: () => base44.entities.User.list("-created_date", 200),
  });

  const client = clients.find((c) => c.id === id);
  const evaluators = users.filter((u) => (u.approval_status || "approved") === "approved");

  const updateMutation = useMutation({
    mutationFn: ({ data }) => base44.entities.Client.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["clients"] }); toast.success("Client updated"); },
    onError: () => toast.error("Update failed"),
  });
  const createAppt = useMutation({
    mutationFn: (data) => base44.entities.Appointment.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["appointments"] }); toast.success("Appointment scheduled"); },
    onError: () => toast.error("Failed to schedule"),
  });
  const createBill = useMutation({
    mutationFn: (data) => base44.entities.BillingRecord.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["billing"] }); toast.success("Billing record created"); },
    onError: () => toast.error("Failed to create record"),
  });

  if (isLoading) {
    return <div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-40 rounded-2xl" /></div>;
  }
  if (!client) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500">Client not found.</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate(createPageUrl("Clients"))}>Back to Clients</Button>
      </div>
    );
  }

  const myAppts = appointments.filter((a) => a.client_id === id);
  const myEvals = evaluations.filter((e) => e.client_id === id);
  const myBilling = billing.filter((b) => b.client_id === id);

  const timeline = [
    ...myAppts.map((a) => ({ ts: a.date_time || a.created_date, type: "Appointment", label: `${a.meeting_type || "Meeting"}`, status: a.status })),
    ...myEvals.map((e) => ({ ts: e.created_date, type: "Evaluation", label: e.urgency ? `Urgency: ${e.urgency}` : "Evaluation", status: e.status })),
    ...myBilling.map((b) => ({ ts: b.created_date, type: "Billing", label: `${b.service_type || "Service"}${b.invoice_number ? ` · ${b.invoice_number}` : ""}`, status: b.billing_status })),
  ].sort((a, b) => new Date(b.ts) - new Date(a.ts));

  return (
    <div className="space-y-6">
      <Link to={createPageUrl("Clients")} className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900">
        <ArrowLeft className="w-4 h-4" /> Back to Clients
      </Link>

      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{client.boy_first_name} {client.boy_last_name}</h1>
              <StatusBadge status={client.status} />
            </div>
            <p className="text-sm text-gray-400 mt-1">
              {client.client_id ? `ID ${client.client_id}` : ""}{client.client_id && client.age ? " · " : ""}
              {client.age ? `ווי אלט ${client.age}` : ""}{client.age && client.grade_level ? " · " : ""}{client.grade_level || ""}
              {client.religious_level ? ` · ${client.religious_level}` : ""}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {canSchedule && (
              <Button variant="outline" className="gap-2" onClick={() => setApptOpen(true)}>
                <CalendarPlus className="w-4 h-4" /> Schedule Appointment
              </Button>
            )}
            {canBill && (
              <Button variant="outline" className="gap-2" onClick={() => setBillOpen(true)}>
                <FileText className="w-4 h-4" /> Create Invoice
              </Button>
            )}
            {canEditClient && (
              <Button className="gap-2 bg-[#1e3a5f] hover:bg-[#1e3a5f]/90" onClick={() => setEditOpen(true)}>
                <Pencil className="w-4 h-4" /> Edit
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 mt-5 pt-5 border-t border-gray-50">
          <Info icon={Phone} label="Client ID" value={client.client_id} />
          {clientPhoneRows(client).map((phone, index) => (
            <Info key={index} icon={Phone} label={phoneLabel(phone) || "Phone"} value={phone.number} />
          ))}
          <Info icon={Mail} label="Email address" value={client.parent_email} />
          <Info icon={MapPin} label="City" value={client.city} />
          <Info icon={GraduationCap} label="לערנט בישיבה" value={client.current_school} />
          <Info icon={Phone} label="טאטע'ס נאמען" value={client.father_name} />
          <Info icon={Phone} label="ווער רופט" value={client.caller_source || client.referral_source} />
          <Info icon={Phone} label="Responsible" value={client.responsible_person} />
          <Info icon={Phone} label="Mother" value={client.mother_name} />
        </div>

        {(client.special_needs?.length > 0 || client.family_expectations || client.notes) && (
          <div className="mt-5 pt-5 border-t border-gray-50 space-y-2 text-sm">
            {client.special_needs?.length > 0 && (
              <p><span className="text-gray-400">Special needs:</span> {client.special_needs.join(", ")}</p>
            )}
            {client.family_expectations && <p><span className="text-gray-400">Family expectations:</span> {client.family_expectations}</p>}
            {client.notes && <p><span className="text-gray-400">Notes:</span> {client.notes}</p>}
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100">
        <div className="px-5 py-4 border-b border-gray-50">
          <h2 className="font-semibold text-gray-900">Timeline</h2>
        </div>
        {timeline.length === 0 ? (
          <p className="text-sm text-gray-400 p-8 text-center">No activity yet.</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {timeline.map((t, i) => (
              <div key={i} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">{t.type}</p>
                  <p className="text-xs text-gray-400">{t.label} · {t.type === "Appointment" ? fmtDateTime(t.ts) : fmtDate(t.ts)}</p>
                </div>
                <StatusBadge status={t.status} />
              </div>
            ))}
          </div>
        )}
      </div>

      <ClientFormDrawer
        open={editOpen} onOpenChange={setEditOpen} client={client} evaluators={evaluators}
        onSave={(data) => updateMutation.mutateAsync({ data })}
      />
      <AppointmentFormDialog
        open={apptOpen} onOpenChange={setApptOpen}
        clients={clients} evaluators={evaluators} defaultClientId={id}
        onSave={(data) => createAppt.mutateAsync(data)}
      />
      <BillingFormDialog
        open={billOpen} onOpenChange={setBillOpen}
        clients={clients} record={{ client_id: id, client_name: `${client.boy_first_name} ${client.boy_last_name}`, service_type: "School Placement", billing_status: "Not Billed", amount: "" }}
        onSave={(data) => createBill.mutateAsync(data)}
      />
    </div>
  );
}
