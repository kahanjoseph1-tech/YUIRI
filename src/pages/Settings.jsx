import React, { useState } from "react";
import { Plus, RotateCcw, Settings as SettingsIcon, Trash2 } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DEFAULT_DROPDOWN_OPTIONS,
  DROPDOWN_GROUPS,
  DROPDOWN_OPTIONS_QUERY_KEY,
  getDropdownOptions,
  saveDropdownOptions,
  uniqueOptions,
} from "@/lib/dropdownSettings";

export default function Settings() {
  const queryClient = useQueryClient();
  const [drafts, setDrafts] = useState({});

  const { data: dropdowns = DEFAULT_DROPDOWN_OPTIONS, isLoading } = useQuery({
    queryKey: DROPDOWN_OPTIONS_QUERY_KEY,
    queryFn: getDropdownOptions,
  });

  const saveMutation = useMutation({
    mutationFn: saveDropdownOptions,
    onSuccess: (saved) => {
      queryClient.setQueryData(DROPDOWN_OPTIONS_QUERY_KEY, saved);
      toast.success("Settings saved");
    },
    onError: (error) => {
      console.error("Failed to save settings:", error);
      toast.error("Failed to save settings");
    },
  });

  const updateDraft = (key, value) => {
    setDrafts((current) => ({ ...current, [key]: value }));
  };

  const addOption = (key) => {
    const value = String(drafts[key] || "").trim();
    if (!value) return;
    saveMutation.mutate({
      ...dropdowns,
      [key]: uniqueOptions([...(dropdowns[key] || []), value]),
    });
    updateDraft(key, "");
  };

  const deleteOption = (key, option) => {
    saveMutation.mutate({
      ...dropdowns,
      [key]: (dropdowns[key] || []).filter((item) => item !== option),
    });
  };

  const resetGroup = (key) => {
    saveMutation.mutate({
      ...dropdowns,
      [key]: DEFAULT_DROPDOWN_OPTIONS[key] || [],
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Dropdowns</p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-56 rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {DROPDOWN_GROUPS.map((group) => {
            const options = dropdowns[group.key] || [];
            return (
              <section key={group.key} className="bg-white border border-gray-100 rounded-2xl p-4 space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="font-semibold text-gray-900 truncate">{group.label}</h2>
                    <p className="text-xs text-gray-400">{options.length} options</p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 shrink-0"
                    onClick={() => resetGroup(group.key)}
                    disabled={saveMutation.isPending}
                    aria-label={`Reset ${group.label}`}
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                </div>

                <div className="flex gap-2">
                  <Input
                    value={drafts[group.key] || ""}
                    onChange={(event) => updateDraft(group.key, event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        addOption(group.key);
                      }
                    }}
                    placeholder="New option"
                  />
                  <Button
                    type="button"
                    size="icon"
                    className="h-10 w-10 shrink-0 bg-[#1e3a5f] hover:bg-[#1e3a5f]/90"
                    onClick={() => addOption(group.key)}
                    disabled={saveMutation.isPending}
                    aria-label={`Add ${group.label}`}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                {options.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-gray-200 py-8 text-center">
                    <SettingsIcon className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                    <p className="text-sm text-gray-400">No options</p>
                  </div>
                ) : (
                  <div className="max-h-64 overflow-y-auto divide-y divide-gray-100 rounded-lg border border-gray-100">
                    {options.map((option) => (
                      <div key={option} className="flex items-center justify-between gap-3 px-3 py-2">
                        <span className="text-sm text-gray-700 min-w-0 break-words">{option}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0 text-gray-400 hover:text-red-600"
                          onClick={() => deleteOption(group.key, option)}
                          disabled={saveMutation.isPending}
                          aria-label={`Delete ${option}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
