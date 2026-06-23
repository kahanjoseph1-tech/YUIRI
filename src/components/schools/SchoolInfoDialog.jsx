import React from "react";
import { ExternalLink, FileText, Globe, Mail, MapPin, Phone } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

function Detail({ label, value }) {
  if (value == null || value === "") return null;
  return (
    <div>
      <p className="text-xs text-gray-400">{label}</p>
      <p className="text-sm font-medium text-gray-800 break-words">{value}</p>
    </div>
  );
}

function LinkRow({ icon: Icon, href, label }) {
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="flex items-start gap-2 text-sm text-[#1e3a5f] hover:underline break-all"
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
      <span>{label || href}</span>
      <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0" />
    </a>
  );
}

export default function SchoolInfoDialog({ open, onOpenChange, school }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{school?.name || "Yeshiva"}</DialogTitle>
        </DialogHeader>

        {!school ? (
          <p className="text-sm text-gray-400">Yeshiva information not found.</p>
        ) : (
          <div className="space-y-5">
            <div className="flex flex-wrap gap-2">
              {school.type && <Badge variant="outline">{school.type}</Badge>}
              {school.hashkafa && <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">{school.hashkafa}</Badge>}
              {school.grade_range && <Badge variant="outline">{school.grade_range}</Badge>}
              {school.boarding && <Badge variant="outline">Boarding</Badge>}
              {school.accepts_special_needs && <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">Special Needs</Badge>}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-xl border border-gray-100 p-4">
              <Detail label="Location" value={school.location} />
              <Detail label="Environment" value={school.environment_type} />
              <Detail label="Tuition" value={school.tuition_range} />
              <Detail label="Class size" value={school.class_size} />
              <Detail label="Contact" value={school.contact_person} />
              <Detail label="Email" value={school.email} />
            </div>

            <div className="space-y-2 text-sm text-gray-600">
              {school.address && (
                <p className="flex items-start gap-2">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
                  <span>{school.address}</span>
                </p>
              )}
              {school.phone && (
                <p className="flex items-center gap-2">
                  <Phone className="h-4 w-4 shrink-0 text-gray-400" />
                  <span>{school.phone}</span>
                </p>
              )}
              {school.email && (
                <p className="flex items-center gap-2">
                  <Mail className="h-4 w-4 shrink-0 text-gray-400" />
                  <span>{school.email}</span>
                </p>
              )}
              <LinkRow icon={Globe} href={school.website} label={school.website} />
              <LinkRow icon={FileText} href={school.application_url} label={school.application_text || "Application"} />
              <LinkRow icon={FileText} href={school.information_url} label={school.information_text || "Information"} />
            </div>

            {Array.isArray(school.specialties) && school.specialties.length > 0 && (
              <div>
                <p className="text-xs text-gray-400">Specialties</p>
                <p className="text-sm text-gray-700">{school.specialties.join(", ")}</p>
              </div>
            )}

            {school.description && (
              <div className="rounded-xl border border-gray-100 bg-gray-50 p-3 text-sm text-gray-700 whitespace-pre-wrap">
                {school.description}
              </div>
            )}
            {school.notes && school.notes !== school.description && (
              <div className="rounded-xl border border-gray-100 p-3 text-sm text-gray-700 whitespace-pre-wrap">
                {school.notes}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
