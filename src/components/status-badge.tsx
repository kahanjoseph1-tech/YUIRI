"use client";

import { Badge } from "@/components/ui/badge";

const statusVariantMap: Record<string, "info" | "warning" | "success" | "secondary" | "destructive" | "outline" | "default"> = {
  NEW_LEAD: "info",
  SCHEDULED: "info",
  PENDING: "info",
  NOT_BILLED: "info",
  INTAKE_SCHEDULED: "warning",
  IN_PROGRESS: "warning",
  INVOICE_SENT: "warning",
  EVALUATING: "warning",
  COMPLETED: "success",
  PAID: "success",
  ACCEPTED: "success",
  SCHOOL_MATCH_NEEDED: "secondary",
  PARTIALLY_PAID: "secondary",
  REFERRED: "secondary",
  NO_SHOW: "destructive",
  CANCELLED: "destructive",
  OVERDUE: "destructive",
  INACTIVE: "destructive",
  WAIVED: "destructive",
  RESCHEDULED: "outline",
};

function formatStatusText(status: string): string {
  return status
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const variant = statusVariantMap[status] ?? "default";
  return (
    <Badge variant={variant} className={className}>
      {formatStatusText(status)}
    </Badge>
  );
}
