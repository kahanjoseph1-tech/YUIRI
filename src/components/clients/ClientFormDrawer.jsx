import React, { useState, useEffect, useMemo, useRef } from "react";
import { FileText, ImageIcon, Plus, Trash2, UploadCloud } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DEFAULT_DROPDOWN_OPTIONS,
  DROPDOWN_OPTIONS_QUERY_KEY,
  getDropdownOptions,
  uniqueOptions,
} from "@/lib/dropdownSettings";
import { storage } from "@/lib/firebase";

const EMPTY = {
  boy_first_name: "", boy_last_name: "", age: "",
  father_name: "", parent_phone: "", parent_email: "",
  profile_photo: null, files: [],
  city: "", current_school: "", shiur: "", reason: "", caller_source: "", caller_name: "", referral_source: "",
  responsible_person: "", responsible_name: "",
  family_expectations: "", notes: "", status: "New Client",
  assigned_evaluator_id: "", special_needs: [],
};

const emptyPhoneRow = () => ({ tag: "Father's Cell", custom_label: "", number: "" });

function makeId() {
  return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function safeFileName(name) {
  return String(name || "file").replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || "file";
}

function formatFileSize(bytes) {
  const size = Number(bytes || 0);
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

async function uploadClientFile(file, clientKey, folder) {
  const path = `clients/${clientKey}/${folder}/${makeId()}-${safeFileName(file.name)}`;
  const fileRef = ref(storage, path);
  await uploadBytes(fileRef, file, { contentType: file.type || "application/octet-stream" });
  const url = await getDownloadURL(fileRef);
  return {
    name: file.name,
    url,
    path,
    content_type: file.type || "",
    size: file.size || 0,
    uploaded_date: new Date().toISOString(),
  };
}

function phoneRowsFromClient(client) {
  if (Array.isArray(client?.phone_numbers) && client.phone_numbers.length > 0) {
    return client.phone_numbers.map((phone) => ({
      tag: phone.tag || "Father's Cell",
      custom_label: phone.custom_label || "",
      number: phone.number || "",
    }));
  }

  if (client?.parent_phone) {
    return [{ tag: "Father's Cell", custom_label: "", number: client.parent_phone }];
  }

  return [emptyPhoneRow()];
}

function Field({ label, children, full }) {
  return (
    <div className={`space-y-1.5 ${full ? "sm:col-span-2" : ""}`}>
      <Label className="text-xs font-medium text-gray-500">{label}</Label>
      {children}
    </div>
  );
}

export default function ClientFormDrawer({ open, onOpenChange, client, onSave }) {
  const uploadGroupRef = useRef(makeId());
  const [form, setForm] = useState(EMPTY);
  const [phoneRows, setPhoneRows] = useState([emptyPhoneRow()]);
  const [needsText, setNeedsText] = useState("");
  const [pendingPhoto, setPendingPhoto] = useState(null);
  const [pendingFiles, setPendingFiles] = useState([]);
  const [draggingFiles, setDraggingFiles] = useState(false);
  const [saving, setSaving] = useState(false);

  const { data: dropdownOptions = DEFAULT_DROPDOWN_OPTIONS } = useQuery({
    queryKey: DROPDOWN_OPTIONS_QUERY_KEY,
    queryFn: getDropdownOptions,
  });

  useEffect(() => {
    if (open) {
      uploadGroupRef.current = client?.id || makeId();
      const nextForm = client
        ? {
            ...EMPTY,
            ...client,
            status: client.status || "New Client",
            caller_source: client.caller_source || client.referral_source || "",
            responsible_person: client.responsible_person || "",
          }
        : EMPTY;
      setForm(nextForm);
      setPhoneRows(phoneRowsFromClient(client));
      setNeedsText((client?.special_needs || []).join(", "));
      setPendingPhoto(null);
      setPendingFiles([]);
      setDraggingFiles(false);
    }
  }, [open, client]);

  const callerOptions = useMemo(
    () => uniqueOptions([...(dropdownOptions.caller_options || []), form.caller_source]),
    [dropdownOptions.caller_options, form.caller_source]
  );

  const responsibleOptions = useMemo(() => {
    return uniqueOptions([
      ...(dropdownOptions.responsible_options || []),
      form.responsible_person,
    ]);
  }, [dropdownOptions.responsible_options, form.responsible_person]);

  const statusOptions = useMemo(
    () => uniqueOptions([...(dropdownOptions.client_statuses || []), form.status]),
    [dropdownOptions.client_statuses, form.status]
  );

  const phoneTagOptions = useMemo(
    () => uniqueOptions(dropdownOptions.phone_number_tags || []),
    [dropdownOptions.phone_number_tags]
  );

  const reasonOptions = useMemo(
    () => uniqueOptions([...(dropdownOptions.reason_options || []), form.reason]),
    [dropdownOptions.reason_options, form.reason]
  );

  const shiurOptions = useMemo(
    () => uniqueOptions([...(dropdownOptions.shiur_options || []), form.shiur]),
    [dropdownOptions.shiur_options, form.shiur]
  );

  const update = (field, value) => setForm((p) => ({ ...p, [field]: value }));

  const addPendingFiles = (fileList) => {
    const files = Array.from(fileList || []);
    if (files.length === 0) return;
    setPendingFiles((current) => [...current, ...files]);
  };

  const removeExistingFile = (index) => {
    setForm((current) => ({
      ...current,
      files: (current.files || []).filter((_, fileIndex) => fileIndex !== index),
    }));
  };

  const removePendingFile = (index) => {
    setPendingFiles((current) => current.filter((_, fileIndex) => fileIndex !== index));
  };

  const updatePhoneRow = (index, field, value) => {
    setPhoneRows((rows) =>
      rows.map((row, rowIndex) => (rowIndex === index ? { ...row, [field]: value } : row))
    );
  };

  const removePhoneRow = (index) => {
    setPhoneRows((rows) => {
      const nextRows = rows.filter((_, rowIndex) => rowIndex !== index);
      return nextRows.length > 0 ? nextRows : [emptyPhoneRow()];
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const cleanedPhones = phoneRows
        .map((phone) => ({
          tag: phone.tag || "Father's Cell",
          custom_label: phone.tag === "Custom" ? String(phone.custom_label || "").trim() : "",
          number: String(phone.number || "").trim(),
        }))
        .filter((phone) => phone.number);
      const callerSource = form.caller_source || form.referral_source || "";
      const responsiblePerson = form.responsible_person || "";
      const clientKey = client?.id || form.client_id || uploadGroupRef.current;
      const uploadedPhoto = pendingPhoto
        ? await uploadClientFile(pendingPhoto, clientKey, "profile")
        : form.profile_photo || null;
      const uploadedFiles = pendingFiles.length > 0
        ? await Promise.all(pendingFiles.map((file) => uploadClientFile(file, clientKey, "files")))
        : [];

      await onSave({
        ...form,
        status: form.status || "New Client",
        age: form.age ? Number(form.age) : undefined,
        phone_numbers: cleanedPhones,
        profile_photo: uploadedPhoto,
        files: [...(Array.isArray(form.files) ? form.files : []), ...uploadedFiles],
        parent_phone: cleanedPhones[0]?.number || "",
        caller_source: callerSource,
        caller_name: String(form.caller_name || "").trim(),
        referral_source: callerSource,
        responsible_person: responsiblePerson,
        responsible_name: String(form.responsible_name || "").trim(),
        assigned_evaluator_id: form.assigned_evaluator_id || "",
        special_needs: needsText ? needsText.split(",").map((s) => s.trim()).filter(Boolean) : [],
      });
      onOpenChange(false);
    } catch (error) {
      console.error("Client save failed:", error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{client ? "Edit Client" : "Add Client"}</SheetTitle>
        </SheetHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-5">
          {client?.client_id && (
            <Field label="Client ID" full>
              <Input value={client.client_id} readOnly className="bg-gray-50 text-gray-500" />
            </Field>
          )}

          <Field label="בחור’ס נאמען *" full>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                value={form.boy_first_name}
                onChange={(e) => update("boy_first_name", e.target.value)}
                placeholder="First name"
              />
              <Input
                value={form.boy_last_name}
                onChange={(e) => update("boy_last_name", e.target.value)}
                placeholder="Last name"
              />
            </div>
          </Field>

          <Field label="Profile picture" full>
            <div className="flex flex-col sm:flex-row gap-3 rounded-lg border border-gray-100 p-3">
              <div className="h-20 w-20 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center overflow-hidden shrink-0">
                {form.profile_photo?.url && !pendingPhoto ? (
                  <img src={form.profile_photo.url} alt="Client profile" className="h-full w-full object-cover" />
                ) : (
                  <ImageIcon className="h-8 w-8 text-gray-300" />
                )}
              </div>
              <div className="flex-1 min-w-0 space-y-2">
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(event) => {
                    setPendingPhoto(event.target.files?.[0] || null);
                    event.target.value = "";
                  }}
                />
                <p className="text-xs text-gray-400 truncate">
                  {pendingPhoto?.name || form.profile_photo?.name || "No profile picture selected"}
                </p>
                {(pendingPhoto || form.profile_photo) && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setPendingPhoto(null);
                      update("profile_photo", null);
                    }}
                  >
                    Remove picture
                  </Button>
                )}
              </div>
            </div>
          </Field>

          <Field label="ווי אלט">
            <Input type="number" value={form.age} onChange={(e) => update("age", e.target.value)} />
          </Field>
          <Field label="טאטע'ס נאמען">
            <Input value={form.father_name} onChange={(e) => update("father_name", e.target.value)} />
          </Field>

          <Field label="Phone number" full>
            <div className="space-y-2">
              {phoneRows.map((phone, index) => (
                <div key={index} className="grid grid-cols-1 sm:grid-cols-[10rem_minmax(0,1fr)_2.25rem] gap-2">
                  <Select value={phone.tag || "Father's Cell"} onValueChange={(value) => updatePhoneRow(index, "tag", value)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {phoneTagOptions.map((tag) => <SelectItem key={tag} value={tag}>{tag}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <div className="grid grid-cols-1 gap-2">
                    {phone.tag === "Custom" && (
                      <Input
                        value={phone.custom_label || ""}
                        onChange={(e) => updatePhoneRow(index, "custom_label", e.target.value)}
                        placeholder="Custom tag"
                      />
                    )}
                    <Input
                      value={phone.number || ""}
                      onChange={(e) => updatePhoneRow(index, "number", e.target.value)}
                      placeholder="Phone number"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-10 w-10"
                    onClick={() => removePhoneRow(index)}
                    aria-label="Remove phone number"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => setPhoneRows((rows) => [...rows, emptyPhoneRow()])}
              >
                <Plus className="h-4 w-4" />
                Add phone number
              </Button>
            </div>
          </Field>

          <Field label="Email address" full>
            <Input type="email" value={form.parent_email} onChange={(e) => update("parent_email", e.target.value)} />
          </Field>
          <Field label="לערנט בישיבה">
            <Input value={form.current_school} onChange={(e) => update("current_school", e.target.value)} />
          </Field>
          <Field label="שיעור">
            <Select
              value={form.shiur || "none"}
              onValueChange={(v) => update("shiur", v === "none" ? "" : v)}
            >
              <SelectTrigger><SelectValue placeholder="Select option" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {shiurOptions.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="City">
            <Input value={form.city} onChange={(e) => update("city", e.target.value)} />
          </Field>
          <Field label="ווער רופט">
            <div className="space-y-2">
              <Select value={form.caller_source || ""} onValueChange={(v) => update("caller_source", v)}>
                <SelectTrigger><SelectValue placeholder="Select option" /></SelectTrigger>
                <SelectContent>
                  {callerOptions.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}
                </SelectContent>
              </Select>
              <Input
                value={form.caller_name || ""}
                onChange={(event) => update("caller_name", event.target.value)}
                placeholder="Name for this client"
              />
            </div>
          </Field>
          <Field label="סיבה">
            <Select
              value={form.reason || "none"}
              onValueChange={(v) => update("reason", v === "none" ? "" : v)}
            >
              <SelectTrigger><SelectValue placeholder="Select option" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {reasonOptions.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Status">
            <Select value={form.status} onValueChange={(v) => update("status", v)}>
              <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
              <SelectContent>{statusOptions.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Responsible">
            <div className="space-y-2">
              <Select
                value={form.responsible_person || "none"}
                onValueChange={(v) => update("responsible_person", v === "none" ? "" : v)}
              >
                <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unassigned</SelectItem>
                  {responsibleOptions.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}
                </SelectContent>
              </Select>
              <Input
                value={form.responsible_name || ""}
                onChange={(event) => update("responsible_name", event.target.value)}
                placeholder="Name for this client"
              />
            </div>
          </Field>
          <Field label="Files" full>
            <div
              className={`rounded-lg border border-dashed p-4 text-center transition-colors ${
                draggingFiles ? "border-blue-400 bg-blue-50" : "border-gray-200 bg-gray-50/50"
              }`}
              onDragOver={(event) => {
                event.preventDefault();
                setDraggingFiles(true);
              }}
              onDragLeave={() => setDraggingFiles(false)}
              onDrop={(event) => {
                event.preventDefault();
                setDraggingFiles(false);
                addPendingFiles(event.dataTransfer.files);
              }}
            >
              <UploadCloud className="h-8 w-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm font-medium text-gray-700">Drop files here</p>
              <p className="text-xs text-gray-400 mb-3">or upload files from your computer</p>
              <Input
                type="file"
                multiple
                onChange={(event) => {
                  addPendingFiles(event.target.files);
                  event.target.value = "";
                }}
              />
            </div>
            {((form.files || []).length > 0 || pendingFiles.length > 0) && (
              <div className="mt-3 rounded-lg border border-gray-100 divide-y divide-gray-100">
                {(form.files || []).map((file, index) => (
                  <div key={`${file.path || file.url}-${index}`} className="flex items-center justify-between gap-3 px-3 py-2">
                    <a href={file.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 min-w-0 text-sm text-blue-700 hover:underline">
                      <FileText className="h-4 w-4 shrink-0" />
                      <span className="truncate">{file.name || "File"}</span>
                      <span className="text-xs text-gray-400 shrink-0">{formatFileSize(file.size)}</span>
                    </a>
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-gray-400 hover:text-red-600" onClick={() => removeExistingFile(index)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                {pendingFiles.map((file, index) => (
                  <div key={`${file.name}-${file.size}-${index}`} className="flex items-center justify-between gap-3 px-3 py-2">
                    <div className="flex items-center gap-2 min-w-0 text-sm text-gray-700">
                      <FileText className="h-4 w-4 shrink-0 text-gray-400" />
                      <span className="truncate">{file.name}</span>
                      <span className="text-xs text-gray-400 shrink-0">{formatFileSize(file.size)}</span>
                    </div>
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-gray-400 hover:text-red-600" onClick={() => removePendingFile(index)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </Field>
          <Field label="Special Needs (comma separated)" full>
            <Input value={needsText} onChange={(e) => setNeedsText(e.target.value)} placeholder="ADHD, Speech, Dyslexia..." />
          </Field>
          <Field label="Family Expectations" full>
            <Textarea rows={3} value={form.family_expectations} onChange={(e) => update("family_expectations", e.target.value)} />
          </Field>
          <Field label="Notes" full>
            <Textarea rows={3} value={form.notes} onChange={(e) => update("notes", e.target.value)} />
          </Field>
        </div>

        <SheetFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={handleSave}
            disabled={saving || !form.boy_first_name || !form.boy_last_name}
            className="bg-[#1e3a5f] hover:bg-[#1e3a5f]/90"
          >
            {saving ? "Saving..." : client ? "Update Client" : "Add Client"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
