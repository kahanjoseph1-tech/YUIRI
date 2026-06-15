"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { useToast } from "@/components/ui/use-toast";
import { formatDate } from "@/lib/utils";
import type { Evaluation, EvaluationStatus, Urgency } from "@/lib/types";

const URGENCY_VARIANT: Record<Urgency, string> = {
  LOW: "secondary",
  MEDIUM: "info",
  HIGH: "warning",
  URGENT: "destructive",
};

const STATUS_VARIANT: Record<EvaluationStatus, string> = {
  PENDING: "warning",
  IN_PROGRESS: "info",
  COMPLETED: "success",
};

export default function EvaluationsPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("active");

  const fetchEvaluations = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/evaluations");
      if (!res.ok) throw new Error("Failed to fetch evaluations");
      const data = await res.json();
      setEvaluations(data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load evaluations";
      setError(msg);
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchEvaluations();
  }, [fetchEvaluations]);

  const filteredEvaluations = useMemo(() => {
    if (statusFilter === "active") {
      return evaluations.filter(
        (e) => e.status === "PENDING" || e.status === "IN_PROGRESS"
      );
    }
    if (statusFilter === "all") return evaluations;
    return evaluations.filter((e) => e.status === statusFilter);
  }, [evaluations, statusFilter]);

  function getClientName(evaluation: Evaluation) {
    if (evaluation.client) {
      return `${evaluation.client.boyFirstName} ${evaluation.client.boyLastName}`;
    }
    return "Unknown Client";
  }

  function getEvaluatorName(evaluation: Evaluation) {
    return evaluation.evaluator?.name || "Unknown";
  }

  function getAppointmentDate(evaluation: Evaluation) {
    if (evaluation.appointment?.dateTime) {
      return formatDate(evaluation.appointment.dateTime);
    }
    return "-";
  }

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-10 w-48" />
        </div>
        <div className="space-y-3">
          <Skeleton className="h-10 w-full" />
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (error && evaluations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <p className="text-lg font-medium text-destructive">Failed to load evaluations</p>
        <p className="mt-1 text-sm text-muted-foreground">{error}</p>
        <Button className="mt-4" onClick={fetchEvaluations}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Top bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-[#1e3a5f]">Evaluations</h1>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Pending & In Progress</SelectItem>
            <SelectItem value="all">All Evaluations</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
            <SelectItem value="COMPLETED">Completed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filteredEvaluations.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          No evaluations found for the selected filter.
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client Name</TableHead>
                <TableHead>Evaluator</TableHead>
                <TableHead>Appointment Date</TableHead>
                <TableHead>Urgency</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEvaluations.map((evaluation) => (
                <TableRow
                  key={evaluation.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => router.push(`/evaluations/${evaluation.id}`)}
                >
                  <TableCell className="font-medium">
                    {getClientName(evaluation)}
                  </TableCell>
                  <TableCell>{getEvaluatorName(evaluation)}</TableCell>
                  <TableCell>{getAppointmentDate(evaluation)}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        URGENCY_VARIANT[evaluation.urgency] as
                          | "secondary"
                          | "info"
                          | "warning"
                          | "destructive"
                      }
                    >
                      {evaluation.urgency}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        STATUS_VARIANT[evaluation.status] as
                          | "warning"
                          | "info"
                          | "success"
                      }
                    >
                      {evaluation.status.replace("_", " ")}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
