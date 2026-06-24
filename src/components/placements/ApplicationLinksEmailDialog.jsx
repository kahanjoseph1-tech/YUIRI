import React, { useEffect, useMemo, useState } from "react";
import { Mail, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { sendApplicationLinksEmail } from "@/lib/invoiceEmail";

function fullName(client) {
  return `${client?.boy_first_name || ""} ${client?.boy_last_name || ""}`.trim() || "Client";
}

function primaryPhone(client) {
  if (Array.isArray(client?.phone_numbers)) {
    return client.phone_numbers.find((phone) => phone.number)?.number || "";
  }
  return client?.parent_phone || "";
}

export default function ApplicationLinksEmailDialog({ open, onOpenChange, client, placements = [], schools = [] }) {
  const [recipient, setRecipient] = useState("");
  const [selectedSchoolIds, setSelectedSchoolIds] = useState([]);
  const [sending, setSending] = useState(false);

  const recommendedSchools = useMemo(() => {
    const rows = placements
      .map((placement) => {
        const school = schools.find((record) => record.id === placement.school_id);
        return school ? { placement, school } : null;
      })
      .filter(Boolean);

    return rows.filter((row, index) => rows.findIndex((other) => other.school.id === row.school.id) === index);
  }, [placements, schools]);

  useEffect(() => {
    if (!open) return;
    setRecipient(client?.parent_email || "");
    setSelectedSchoolIds(recommendedSchools.map((row) => row.school.id));
  }, [open, client, recommendedSchools]);

  const toggleSchool = (schoolId, checked) => {
    setSelectedSchoolIds((current) =>
      checked ? [...new Set([...current, schoolId])] : current.filter((id) => id !== schoolId)
    );
  };

  const handleSend = async () => {
    const toEmail = recipient.trim();
    if (!toEmail) {
      toast.error("Enter an email address");
      return;
    }
    if (selectedSchoolIds.length === 0) {
      toast.error("Choose at least one yeshiva");
      return;
    }

    setSending(true);
    try {
      await sendApplicationLinksEmail({
        toEmail,
        clientId: client.id,
        clientName: fullName(client),
        fatherName: client.father_name || "",
        schoolIds: selectedSchoolIds,
      });
      toast.success(`Application links sent to ${toEmail}`);
      onOpenChange(false);
    } catch (error) {
      toast.error(error?.message || "Failed to send application links");
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Send Application Links</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          <div className="rounded-xl border border-gray-100 bg-slate-50 p-4">
            <p className="font-semibold text-gray-900">{fullName(client)}</p>
            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
              {client?.father_name && <span>Father: {client.father_name}</span>}
              {primaryPhone(client) && <span>Phone: {primaryPhone(client)}</span>}
              {client?.parent_email && <span>Email: {client.parent_email}</span>}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-gray-500">Send to</Label>
            <Input
              type="email"
              value={recipient}
              onChange={(event) => setRecipient(event.target.value)}
              placeholder="parent@example.com"
            />
          </div>

          <div className="space-y-3">
            <div>
              <p className="text-sm font-semibold text-gray-900">Yeshivas to include</p>
              <p className="text-xs text-gray-400">The email will include each selected yeshiva's information and application/information links.</p>
            </div>

            {recommendedSchools.length === 0 ? (
              <p className="rounded-lg border border-dashed border-gray-200 p-4 text-center text-sm text-gray-400">
                Add yeshiva recommendations first.
              </p>
            ) : (
              <div className="space-y-2">
                {recommendedSchools.map(({ school }) => {
                  const checked = selectedSchoolIds.includes(school.id);
                  const hasApplicationLink = Boolean(school.application_url);
                  return (
                    <label key={school.id} className="flex items-start gap-3 rounded-lg border border-gray-100 p-3">
                      <Checkbox checked={checked} onCheckedChange={(value) => toggleSchool(school.id, Boolean(value))} className="mt-0.5" />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-gray-900">{school.name || "Yeshiva"}</p>
                        <p className="text-xs text-gray-400">
                          {[school.location, school.phone, school.email].filter(Boolean).join(" - ") || "No contact details saved"}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2 text-xs">
                          {school.application_url ? (
                            <a href={school.application_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-blue-700 hover:underline">
                              Application <ExternalLink className="h-3 w-3" />
                            </a>
                          ) : (
                            <span className="text-amber-700">No application link saved</span>
                          )}
                          {school.information_url && (
                            <a href={school.information_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-blue-700 hover:underline">
                              Information <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </div>
                        {!hasApplicationLink && (
                          <p className="mt-1 text-[11px] text-gray-400">It can still be sent, but add an application link in the Yeshiva record when available.</p>
                        )}
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            className="gap-2 bg-[#1e3a5f] hover:bg-[#1e3a5f]/90"
            disabled={sending || recommendedSchools.length === 0}
            onClick={handleSend}
          >
            <Mail className="h-4 w-4" /> {sending ? "Sending..." : "Send Email"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
