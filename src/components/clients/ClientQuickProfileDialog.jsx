import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FileText, GraduationCap, Mail, MapPin, Phone } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { firebaseClient } from "@/api/firebaseClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import StatusBadge from "@/components/StatusBadge";
import SchoolInfoDialog from "@/components/schools/SchoolInfoDialog";
import { createPageUrl } from "@/utils";

function phoneLabel(phone) {
  if (!phone) return "";
  return phone.tag === "Custom" && phone.custom_label ? phone.custom_label : phone.tag;
}

function clientPhoneRows(client) {
  if (Array.isArray(client?.phone_numbers) && client.phone_numbers.some((phone) => phone.number)) {
    return client.phone_numbers.filter((phone) => phone.number);
  }
  return client?.parent_phone ? [{ tag: "Phone", number: client.parent_phone }] : [];
}

function Info({ icon: Icon, label, value, onClick }) {
  if (!value) return null;
  const className = `flex items-center gap-2 text-sm text-gray-600 ${
    onClick ? "w-full rounded-md px-1 py-1 text-left hover:bg-blue-50 hover:text-blue-900" : ""
  }`;
  const content = (
    <>
      <Icon className="h-4 w-4 text-gray-400" />
      <span className="text-gray-400">{label}:</span>
      <span className="min-w-0 break-words">{value}</span>
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

export default function ClientQuickProfileDialog({ client, open, onOpenChange }) {
  const [schoolInfoOpen, setSchoolInfoOpen] = useState(false);
  const { data: schools = [] } = useQuery({
    queryKey: ["schools"],
    queryFn: () => firebaseClient.entities.School.list("-created_date", 1000),
    enabled: open && !!client,
  });
  const currentSchool = useMemo(() => {
    if (!client) return null;
    return schools.find((school) => school.id === client.current_school_id) ||
      schools.find((school) => school.name && school.name === client.current_school) ||
      null;
  }, [client, schools]);

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Client Profile</DialogTitle>
        </DialogHeader>

        {!client ? (
          <p className="text-sm text-gray-400">Client not found.</p>
        ) : (
          <div className="space-y-5">
            <div className="flex items-start gap-4">
              {client.profile_photo?.url ? (
                <img
                  src={client.profile_photo.url}
                  alt={`${client.boy_first_name || ""} ${client.boy_last_name || ""}`}
                  className="h-20 w-20 rounded-xl border border-gray-100 object-cover"
                />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-xl border border-gray-100 bg-gray-50 text-xl font-semibold text-gray-400">
                  {(client.boy_first_name?.[0] || "") + (client.boy_last_name?.[0] || "") || "?"}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-bold text-gray-900">
                    {client.boy_first_name} {client.boy_last_name}
                  </h2>
                  <StatusBadge status={client.status} />
                </div>
                <p className="mt-1 text-sm text-gray-400">
                  {client.client_id ? `ID ${client.client_id}` : "No client ID"}
                </p>
              </div>
            </div>

            <div className="space-y-2 border-t border-gray-50 pt-4">
              {clientPhoneRows(client).map((phone, index) => (
                <Info key={index} icon={Phone} label={phoneLabel(phone) || "Phone"} value={phone.number} />
              ))}
              <Info icon={Mail} label="Email" value={client.parent_email} />
              <Info icon={MapPin} label="City" value={client.city} />
              <Info icon={GraduationCap} label="לערנט בישיבה" value={client.current_school} onClick={currentSchool ? () => setSchoolInfoOpen(true) : undefined} />
              <Info icon={GraduationCap} label="שיעור" value={client.shiur} />
              <Info icon={FileText} label="סיבה" value={client.reason} />
            </div>

            {client.notes && (
              <div className="rounded-lg border border-gray-100 bg-gray-50 p-3 text-sm text-gray-600">
                {client.notes}
              </div>
            )}

            <Button asChild className="w-full bg-[#1e3a5f] hover:bg-[#1e3a5f]/90">
              <Link to={`${createPageUrl("ClientDetail")}?id=${client.id}`}>
                Open full profile
              </Link>
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
    <SchoolInfoDialog open={schoolInfoOpen} onOpenChange={setSchoolInfoOpen} school={currentSchool} />
    </>
  );
}
