import React, { useState } from "react";
import { Mail } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function SchoolApplicationEmailBox({ school }) {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);

  const hasApplication = Boolean(String(school?.application_url || "").trim());

  const handleSend = async () => {
    const toEmail = email.trim();
    if (!toEmail) {
      toast.error("Enter an email address");
      return;
    }
    if (!school?.id) {
      toast.error("Yeshiva record not found");
      return;
    }
    if (!hasApplication) {
      toast.error("Add an application link before sending this yeshiva.");
      return;
    }

    setSending(true);
    try {
      const { sendApplicationLinksEmail } = await import("@/lib/invoiceEmail");
      await sendApplicationLinksEmail({
        toEmail,
        schoolIds: [school.id],
      });
      toast.success(`Application email sent to ${toEmail}`);
      setEmail("");
    } catch (error) {
      toast.error(error?.message || "Failed to send application email");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="rounded-xl border border-gray-100 bg-slate-50 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-gray-900">Send application</p>
          <p className="mt-0.5 text-xs text-gray-500">
            Send this yeshiva's information and application link by email.
          </p>
        </div>
        {!hasApplication && (
          <span className="rounded-full bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700">
            Missing application
          </span>
        )}
      </div>

      <div className="mt-3 grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2">
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-gray-500">Email address</Label>
          <Input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="name@example.com"
          />
        </div>
        <Button
          type="button"
          className="self-end gap-2 bg-[#1e3a5f] hover:bg-[#1e3a5f]/90"
          disabled={sending || !hasApplication}
          onClick={handleSend}
        >
          <Mail className="h-4 w-4" />
          {sending ? "Sending..." : "Send"}
        </Button>
      </div>
    </div>
  );
}
