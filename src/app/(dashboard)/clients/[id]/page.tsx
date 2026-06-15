"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/status-badge";
import { useToast } from "@/components/ui/use-toast";
import { formatDate, formatDateTime } from "@/lib/utils";
import type {
  Client,
  ClientStatus,
  Appointment,
  Evaluation,
  BillingRecord,
} from "@/lib/types";
import { ArrowLeft, Calendar, FileText, Save } from "lucide-react";

const CLIENT_STATUSES: ClientStatus[] = [
  "NEW_LEAD",
  "INTAKE_SCHEDULED",
  "EVALUATING",
  "SCHOOL_MATCH_NEEDED",
  "REFERRED",
  "ACCEPTED",
  "INACTIVE",
];

interface ClientDetail extends Client {
  appointments?: Appointment[];
  evaluations?: Evaluation[];
  billingRecords?: BillingRecord[];
}

export default function ClientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const clientId = params.id as string;

  const [client, setClient] = useState<ClientDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});

  const fetchClient = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/clients/${clientId}`);
      if (!res.ok) throw new Error("Failed to fetch client");
      const data: ClientDetail = await res.json();
      setClient(data);
      setForm({
        boyFirstName: data.boyFirstName,
        boyLastName: data.boyLastName,
        age: String(data.age),
        grade: data.grade,
        parentNames: data.parentNames,
        phone: data.phone,
        email: data.email,
        city: data.city,
        currentSchool: data.currentSchool,
        referralSource: data.referralSource,
        notes: data.notes || "",
        status: data.status,
      });
    } catch {
      toast({
        title: "Error",
        description: "Failed to load client details.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [clientId, toast]);

  useEffect(() => {
    fetchClient();
  }, [fetchClient]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const body = { ...form, age: Number(form.age) };
      const res = await fetch(`/api/clients/${clientId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to update client");
      }
      const updated = await res.json();
      setClient((prev) => (prev ? { ...prev, ...updated } : prev));
      toast({ title: "Success", description: "Client updated successfully." });
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to update client.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const updateForm = (field: string, value: string) => {
    setForm((f) => ({ ...f, [field]: value }));
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[400px] w-full" />
        <Skeleton className="h-[300px] w-full" />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p>Client not found.</p>
        <Button variant="outline" className="mt-4" onClick={() => router.push("/clients")}>
          Back to Clients
        </Button>
      </div>
    );
  }

  const appointments = client.appointments || [];
  const evaluations = client.evaluations || [];
  const billingRecords = client.billingRecords || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => router.push("/clients")}>
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back
          </Button>
          <h1 className="text-2xl font-bold" style={{ color: "#1e3a5f" }}>
            {client.boyFirstName} {client.boyLastName}
          </h1>
          <StatusBadge status={client.status} />
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => router.push(`/scheduling?clientId=${clientId}`)}
          >
            <Calendar className="mr-2 h-4 w-4" />
            Schedule Appointment
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push(`/billing?clientId=${clientId}&action=create`)}
          >
            <FileText className="mr-2 h-4 w-4" />
            Create Invoice
          </Button>
        </div>
      </div>

      {/* Client Info Card */}
      <Card>
        <CardHeader>
          <CardTitle>Client Information</CardTitle>
          <CardDescription>View and edit client details</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="boyFirstName">First Name</Label>
                <Input
                  id="boyFirstName"
                  required
                  value={form.boyFirstName || ""}
                  onChange={(e) => updateForm("boyFirstName", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="boyLastName">Last Name</Label>
                <Input
                  id="boyLastName"
                  required
                  value={form.boyLastName || ""}
                  onChange={(e) => updateForm("boyLastName", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="age">Age</Label>
                <Input
                  id="age"
                  type="number"
                  required
                  min={1}
                  max={25}
                  value={form.age || ""}
                  onChange={(e) => updateForm("age", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="grade">Grade</Label>
                <Input
                  id="grade"
                  required
                  value={form.grade || ""}
                  onChange={(e) => updateForm("grade", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="parentNames">Parent Names</Label>
                <Input
                  id="parentNames"
                  required
                  value={form.parentNames || ""}
                  onChange={(e) => updateForm("parentNames", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  required
                  value={form.phone || ""}
                  onChange={(e) => updateForm("phone", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={form.email || ""}
                  onChange={(e) => updateForm("email", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  required
                  value={form.city || ""}
                  onChange={(e) => updateForm("city", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="currentSchool">Current School</Label>
                <Input
                  id="currentSchool"
                  value={form.currentSchool || ""}
                  onChange={(e) => updateForm("currentSchool", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="referralSource">Referral Source</Label>
                <Input
                  id="referralSource"
                  value={form.referralSource || ""}
                  onChange={(e) => updateForm("referralSource", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={form.status || ""}
                  onValueChange={(v) => updateForm("status", v)}
                >
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CLIENT_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s.replace(/_/g, " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={form.notes || ""}
                onChange={(e) => updateForm("notes", e.target.value)}
                rows={3}
              />
            </div>
            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={saving}
                style={{ backgroundColor: "#1e3a5f" }}
                className="text-white hover:opacity-90"
              >
                <Save className="mr-2 h-4 w-4" />
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Timeline Tabs */}
      <Card>
        <CardHeader>
          <CardTitle>Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="appointments">
            <TabsList>
              <TabsTrigger value="appointments">
                Appointments ({appointments.length})
              </TabsTrigger>
              <TabsTrigger value="evaluations">
                Evaluations ({evaluations.length})
              </TabsTrigger>
              <TabsTrigger value="billing">
                Billing ({billingRecords.length})
              </TabsTrigger>
            </TabsList>

            {/* Appointments Tab */}
            <TabsContent value="appointments">
              {appointments.length === 0 ? (
                <p className="py-6 text-center text-gray-500">No appointments yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date & Time</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Evaluator</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {appointments.map((apt) => (
                      <TableRow key={apt.id}>
                        <TableCell>{formatDateTime(apt.dateTime)}</TableCell>
                        <TableCell>{apt.meetingType.replace(/_/g, " ")}</TableCell>
                        <TableCell>{apt.location}</TableCell>
                        <TableCell>{apt.evaluator?.name || "N/A"}</TableCell>
                        <TableCell>
                          <StatusBadge status={apt.status} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>

            {/* Evaluations Tab */}
            <TabsContent value="evaluations">
              {evaluations.length === 0 ? (
                <p className="py-6 text-center text-gray-500">No evaluations yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Evaluator</TableHead>
                      <TableHead>Recommended School Type</TableHead>
                      <TableHead>Urgency</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {evaluations.map((ev) => (
                      <TableRow key={ev.id}>
                        <TableCell>{formatDate(ev.createdAt)}</TableCell>
                        <TableCell>{ev.evaluator?.name || "N/A"}</TableCell>
                        <TableCell>{ev.recommendedSchoolType}</TableCell>
                        <TableCell>
                          <StatusBadge status={ev.urgency} />
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={ev.status} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>

            {/* Billing Tab */}
            <TabsContent value="billing">
              {billingRecords.length === 0 ? (
                <p className="py-6 text-center text-gray-500">No billing records yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Service</TableHead>
                      <TableHead>Appointment Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Paid Date</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {billingRecords.map((br) => (
                      <TableRow key={br.id}>
                        <TableCell>{br.invoiceNumber || "N/A"}</TableCell>
                        <TableCell>{br.serviceType}</TableCell>
                        <TableCell>{formatDate(br.appointmentDate)}</TableCell>
                        <TableCell>${br.amount.toFixed(2)}</TableCell>
                        <TableCell>
                          {br.paidDate ? formatDate(br.paidDate) : "-"}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={br.billingStatus} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
