import React, { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import Combobox from "@/components/common/Combobox";
import { suggestSchools } from "@/lib/matching";

// "Match a Client" workflow: pick a client, see suggested schools, create placements.
export default function MatchClientDialog({ open, onOpenChange, clients = [], schools = [], onCreate }) {
  const [clientId, setClientId] = useState("");
  const [creating, setCreating] = useState(false);

  const client = clients.find((c) => c.id === clientId);
  const suggestions = useMemo(
    () => (client ? suggestSchools(client, schools).slice(0, 8) : []),
    [client, schools]
  );

  const clientOptions = clients.map((c) => ({
    value: c.id, label: `${c.boy_first_name} ${c.boy_last_name}${c.religious_level ? ` (${c.religious_level})` : ""}`,
  }));

  const handleCreate = async (entry) => {
    if (!client) return;
    setCreating(true);
    try {
      await onCreate({
        client_id: client.id,
        client_name: `${client.boy_first_name} ${client.boy_last_name}`,
        school_id: entry.school.id,
        school_name: entry.school.name,
        status: "Recommended",
        match_score: entry.score,
        match_reasons: entry.reasons.join("; "),
      });
    } finally {
      setCreating(false);
    }
  };

  const scoreTone = (s) =>
    s >= 70 ? "bg-emerald-50 text-emerald-700 border-emerald-200"
    : s >= 40 ? "bg-amber-50 text-amber-700 border-amber-200"
    : "bg-gray-100 text-gray-600 border-gray-200";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Match a Client to Schools</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-gray-500">Client</Label>
            <Combobox options={clientOptions} value={clientId} onChange={setClientId} placeholder="Select a client" />
          </div>

          {client && (
            <div className="text-xs text-gray-500 bg-gray-50 rounded-lg p-3 space-y-0.5">
              <p>Religious level: <span className="font-medium text-gray-700">{client.religious_level || "—"}</span></p>
              <p>Grade: <span className="font-medium text-gray-700">{client.grade_level || "—"}</span></p>
              <p>Special needs: <span className="font-medium text-gray-700">{(client.special_needs || []).join(", ") || "None"}</span></p>
            </div>
          )}

          {client && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Suggested Schools</p>
              {suggestions.length === 0 && <p className="text-sm text-gray-400">No schools in database yet.</p>}
              {suggestions.map((entry) => (
                <div key={entry.school.id} className="flex items-start gap-3 border border-gray-100 rounded-lg p-3">
                  <Badge variant="outline" className={`text-xs border ${scoreTone(entry.score)}`}>{entry.score}</Badge>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900">{entry.school.name}</p>
                    <p className="text-xs text-gray-400">{entry.school.hashkafa || "—"}{entry.school.grade_range ? ` · ${entry.school.grade_range}` : ""}</p>
                    {entry.reasons.length > 0 && (
                      <p className="text-[11px] text-gray-500 mt-1">{entry.reasons.join(" · ")}</p>
                    )}
                  </div>
                  <Button size="sm" variant="outline" disabled={creating} onClick={() => handleCreate(entry)}>
                    Recommend
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
