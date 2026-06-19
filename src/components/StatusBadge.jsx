import React from "react";
import { Badge } from "@/components/ui/badge";
import { badgeClass } from "@/lib/badges";

export default function StatusBadge({ status, className = "" }) {
  if (!status) return null;
  return (
    <Badge variant="outline" className={`text-[11px] font-medium border ${badgeClass(status)} ${className}`}>
      {status}
    </Badge>
  );
}
