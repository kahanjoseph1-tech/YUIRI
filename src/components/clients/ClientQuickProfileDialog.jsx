import React from "react";
import { Link } from "react-router-dom";
import { FileText, GraduationCap, Mail, MapPin, Phone } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import StatusBadge from "@/components/StatusBadge";
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

function Info({ icon: Icon, label, value }) {
  if (!value) return null;
  return (
    <div className="flex items-center gap-2 text-sm text-gray-600">
      <Icon className="h-4 w-4 text-gray-400" />
      <span className="text-gray-400">{label}:</span>
      <span className="min-w-0 break-words">{value}</span>
    </div>
  );
}

export default function ClientQuickProfileDialog({ client, open, onOpenChange }) {
  return (
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
              <Info icon={GraduationCap} label="לערנט בישיבה" value={client.current_school} />
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
  );
}
