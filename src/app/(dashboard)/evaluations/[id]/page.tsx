"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Save, CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { cn, formatDate, formatDateTime } from "@/lib/utils";
import type { Evaluation, EvaluationStatus, Urgency } from "@/lib/types";

const URGENCY_OPTIONS: Urgency[] = ["LOW", "MEDIUM", "HIGH", "URGENT"];

const URGENCY_VARIANT: Record<Urgency, "secondary" | "info" | "warning" | "destructive"> = {
  LOW: "secondary",
  MEDIUM: "info",
  HIGH: "warning",
  URGENT: "destructive",
};

const STATUS_VARIANT: Record<EvaluationStatus, "warning" | "info" | "success"> = {
  PENDING: "warning",
  IN_PROGRESS: "info",
  COMPLETED: "success",
};

export default function EvaluationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const id = params.id as string;

  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [form, setForm] = useState({
    strengths: "",
    challenges: "",
    learningStyle: "",
    behaviorNotes: "",
    religiousLevel: "",
    familyExpectations: "",
    recommendedSchoolType: "",
    suggestedSchools: "",
    urgency: "MEDIUM" as Urgency,
    finalRecommendation: "",
  });

  const fetchEvaluation = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/evaluations/${id}`);
      if (!res.ok) throw new Error("Failed to fetch evaluation");
      const data: Evaluation = await res.json();
      setEvaluation(data);
      setForm({
        strengths: data.strengths || "",
        challenges: data.challenges || "",
        learningStyle: data.learningStyle || "",
        behaviorNotes: data.behaviorNotes || "",
        religiousLevel: data.religiousLevel || "",
        familyExpectations: data.familyExpectations || "",
        recommendedSchoolType: data.recommendedSchoolType || "",
        suggestedSchools: data.suggestedSchools || "",
        urgency: data.urgency || "MEDIUM",
        finalRecommendation: data.finalRecommendation || "",
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load evaluation";
      setError(msg);
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [id, toast]);

  useEffect(() => {
    fetchEvaluation();
  }, [fetchEvaluation]);

  async function handleSave(status: "IN_PROGRESS" | "COMPLETED") {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/evaluations/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, status }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to update evaluation");
      }
      const updated: Evaluation = await res.json();
      setEvaluation((prev) => (prev ? { ...prev, ...updated } : prev));

      if (status === "COMPLETED") {
        toast({
          title: "Evaluation Completed",
          description:
            "Evaluation saved. Client status updated and billing record created.",
        });
      } else {
        toast({
          title: "Draft Saved",
          description: "Evaluation saved as draft.",
        });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to save evaluation";
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }

  function updateField(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-60" />
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-1 space-y-4">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
          <div className="lg:col-span-2 space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !evaluation) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <p className="text-lg font-medium text-destructive">
          Failed to load evaluation
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {error || "Evaluation not found"}
        </p>
        <div className="mt-4 flex gap-2">
          <Button variant="outline" onClick={() => router.push("/evaluations")}>
            Back to Evaluations
          </Button>
          <Button onClick={fetchEvaluation}>Retry</Button>
        </div>
      </div>
    );
  }

  const isCompleted = evaluation.status === "COMPLETED";

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/evaluations")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold text-[#1e3a5f]">
            Evaluation Detail
          </h1>
          <Badge variant={STATUS_VARIANT[evaluation.status]}>
            {evaluation.status.replace("_", " ")}
          </Badge>
        </div>
        {!isCompleted && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => handleSave("IN_PROGRESS")}
              disabled={submitting}
            >
              <Save className="mr-2 h-4 w-4" />
              {submitting ? "Saving..." : "Save as Draft"}
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={() => handleSave("COMPLETED")}
              disabled={submitting}
            >
              <CheckCircle className="mr-2 h-4 w-4" />
              {submitting ? "Completing..." : "Complete Evaluation"}
            </Button>
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Sidebar: Client info + Appointment info */}
        <div className="lg:col-span-1 space-y-4">
          {/* Client info card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg text-[#1e3a5f]">
                Client Information
              </CardTitle>
              <CardDescription>Read-only client details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {evaluation.client ? (
                <>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">
                      Boy Name
                    </p>
                    <p className="font-medium">
                      {evaluation.client.boyFirstName}{" "}
                      {evaluation.client.boyLastName}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">
                        Age
                      </p>
                      <p className="font-medium">{evaluation.client.age}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">
                        Grade
                      </p>
                      <p className="font-medium">{evaluation.client.grade}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">
                      Parent Names
                    </p>
                    <p className="font-medium">
                      {evaluation.client.parentNames}
                    </p>
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Client details unavailable.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Appointment info card */}
          {evaluation.appointment && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg text-[#1e3a5f]">
                  Appointment
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    Date
                  </p>
                  <p className="font-medium">
                    {formatDateTime(evaluation.appointment.dateTime)}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    Type
                  </p>
                  <p className="font-medium">
                    {evaluation.appointment.meetingType.replace("_", " ")}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    Location
                  </p>
                  <p className="font-medium">
                    {evaluation.appointment.location || "-"}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Main form */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg text-[#1e3a5f]">
                Student Assessment
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Strengths</Label>
                <Textarea
                  placeholder="Describe the student's strengths..."
                  value={form.strengths}
                  onChange={(e) => updateField("strengths", e.target.value)}
                  rows={3}
                  disabled={isCompleted}
                />
              </div>
              <div className="space-y-2">
                <Label>Challenges</Label>
                <Textarea
                  placeholder="Describe challenges observed..."
                  value={form.challenges}
                  onChange={(e) => updateField("challenges", e.target.value)}
                  rows={3}
                  disabled={isCompleted}
                />
              </div>
              <div className="space-y-2">
                <Label>Learning Style</Label>
                <Textarea
                  placeholder="Describe learning style..."
                  value={form.learningStyle}
                  onChange={(e) => updateField("learningStyle", e.target.value)}
                  rows={3}
                  disabled={isCompleted}
                />
              </div>
              <div className="space-y-2">
                <Label>Behavior Notes</Label>
                <Textarea
                  placeholder="Behavioral observations..."
                  value={form.behaviorNotes}
                  onChange={(e) => updateField("behaviorNotes", e.target.value)}
                  rows={3}
                  disabled={isCompleted}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg text-[#1e3a5f]">
                Family & Religious Context
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Religious Level</Label>
                <Textarea
                  placeholder="Describe religious background and level..."
                  value={form.religiousLevel}
                  onChange={(e) => updateField("religiousLevel", e.target.value)}
                  rows={3}
                  disabled={isCompleted}
                />
              </div>
              <div className="space-y-2">
                <Label>Family Expectations</Label>
                <Textarea
                  placeholder="Describe family expectations..."
                  value={form.familyExpectations}
                  onChange={(e) =>
                    updateField("familyExpectations", e.target.value)
                  }
                  rows={3}
                  disabled={isCompleted}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg text-[#1e3a5f]">
                Recommendation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Recommended School Type</Label>
                  <Input
                    placeholder="e.g. Mainstream, Special Ed, Yeshiva..."
                    value={form.recommendedSchoolType}
                    onChange={(e) =>
                      updateField("recommendedSchoolType", e.target.value)
                    }
                    disabled={isCompleted}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Suggested Schools</Label>
                  <Input
                    placeholder="Specific school recommendations..."
                    value={form.suggestedSchools}
                    onChange={(e) =>
                      updateField("suggestedSchools", e.target.value)
                    }
                    disabled={isCompleted}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Urgency</Label>
                <Select
                  value={form.urgency}
                  onValueChange={(v) => updateField("urgency", v)}
                  disabled={isCompleted}
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Select urgency" />
                  </SelectTrigger>
                  <SelectContent>
                    {URGENCY_OPTIONS.map((u) => (
                      <SelectItem key={u} value={u}>
                        {u}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>Final Recommendation</Label>
                <Textarea
                  placeholder="Write the final recommendation summary..."
                  value={form.finalRecommendation}
                  onChange={(e) =>
                    updateField("finalRecommendation", e.target.value)
                  }
                  rows={5}
                  disabled={isCompleted}
                />
              </div>
            </CardContent>
          </Card>

          {/* Bottom action buttons (repeated for convenience) */}
          {!isCompleted && (
            <div className="flex justify-end gap-2 pb-4">
              <Button
                variant="outline"
                onClick={() => handleSave("IN_PROGRESS")}
                disabled={submitting}
              >
                <Save className="mr-2 h-4 w-4" />
                {submitting ? "Saving..." : "Save as Draft"}
              </Button>
              <Button
                className="bg-green-600 hover:bg-green-700"
                onClick={() => handleSave("COMPLETED")}
                disabled={submitting}
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                {submitting ? "Completing..." : "Complete Evaluation"}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
