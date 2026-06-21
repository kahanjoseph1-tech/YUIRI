import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { BriefcaseBusiness, Download, FileSpreadsheet } from "lucide-react";
import { firebaseClient } from "@/api/firebaseClient";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import StatusBadge from "@/components/StatusBadge";
import { fmtDate, fmtDateTime } from "@/lib/format";

const questionnaireFields = [
  { key: "fartags", label: "פארטאגס" },
  { key: "davening", label: "דאווענען" },
  { key: "learning", label: "לערנען" },
  { key: "friends", label: "חברים" },
  { key: "chavrusas", label: "חברותה'ס" },
  { key: "liked_current_yeshiva", label: "וועלכע זאך האסטו ליב געהאט און דיין יעצטיגע ישיבה" },
  { key: "dormitory", label: "דארמאטארי" },
  { key: "watches_videos", label: "קוקט ווידיאויס" },
  { key: "smartphone", label: "האסט א סמארטפאון" },
  { key: "emotional", label: "געפילישער" },
  { key: "midos", label: "מידות" },
  { key: "derech_eretz", label: "דרך ארץ'דיגע" },
  { key: "reason_switching_yeshiva", label: "סיבה פון טוישען ישיבה" },
  { key: "strengthened_learning_davening", label: "זיך געשטארקט ביי לערנען/דאווענען" },
  { key: "bad_friend_strengthened", label: "זיך געשטארקט פון חבר השפעה" },
  { key: "likes_music", label: "האט ליב מוזיק" },
  { key: "notes", label: "הערות" },
];

function fullName(client, fallback = "") {
  const name = `${client?.boy_first_name || ""} ${client?.boy_last_name || ""}`.trim();
  return name || fallback;
}

function formatPhones(client) {
  const phones = Array.isArray(client?.phone_numbers) ? client.phone_numbers : [];
  const values = phones
    .filter((phone) => phone?.number)
    .map((phone) => {
      const label = phone.tag === "Custom" ? phone.custom_label : phone.tag;
      return label ? `${label}: ${phone.number}` : phone.number;
    });
  if (values.length > 0) return values.join("; ");
  return client?.parent_phone || "";
}

function formatList(value) {
  if (Array.isArray(value)) return value.filter(Boolean).join(", ");
  return value || "";
}

function questionnaireAnswer(evaluation, key) {
  const questionnaire = evaluation?.questionnaire || {};
  const answer = formatList(questionnaire[key]);
  const other = questionnaire[`${key}_other`];
  return other ? `${answer}${answer ? " - " : ""}${other}` : answer;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function downloadHtmlExcel(filename, fields, rows) {
  const header = fields.map((field) => `<th>${escapeHtml(field.label)}</th>`).join("");
  const body = rows
    .map((row) =>
      `<tr>${fields.map((field) => `<td>${escapeHtml(field.get(row))}</td>`).join("")}</tr>`
    )
    .join("");
  const html = `<!doctype html><html><head><meta charset="utf-8" /></head><body><table border="1"><thead><tr>${header}</tr></thead><tbody>${body}</tbody></table></body></html>`;
  const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function caseMatchesEvaluation(openCase, evaluation) {
  if (!openCase || !evaluation) return false;
  if (openCase.evaluation_id && openCase.evaluation_id === evaluation.id) return true;
  return openCase.client_id === evaluation.client_id && (openCase.status || "Open") !== "Closed";
}

function buildOpenCaseFromEvaluation(evaluation, now = new Date().toISOString()) {
  return {
    client_id: evaluation.client_id || "",
    client_name: evaluation.client_name || "",
    evaluation_id: evaluation.id || "",
    appointment_id: evaluation.appointment_id || "",
    appointment_date: evaluation.appointment_date || "",
    evaluator_id: evaluation.evaluator_id || "",
    evaluator_name: evaluation.evaluator_name || "",
    status: "Open",
    priority: evaluation.urgency || "Medium",
    opened_date: now,
    last_activity_date: now,
  };
}

const exportFields = [
  { key: "case_status", label: "Case Status", group: "Case", get: ({ openCase }) => openCase.status || "Open" },
  { key: "case_opened", label: "Case Opened", group: "Case", get: ({ openCase }) => fmtDate(openCase.opened_date || openCase.created_date, "") },
  { key: "case_last_activity", label: "Last Activity", group: "Case", get: ({ openCase }) => fmtDateTime(openCase.last_activity_date || openCase.updated_date, "") },
  { key: "client_id", label: "Client ID", group: "Client", get: ({ client }) => client?.client_id || "" },
  { key: "client_name", label: "Client Name", group: "Client", get: ({ client, openCase }) => fullName(client, openCase.client_name) },
  { key: "age", label: "Age", group: "Client", get: ({ client }) => client?.age || "" },
  { key: "father_name", label: "Father Name", group: "Client", get: ({ client }) => client?.father_name || "" },
  { key: "phones", label: "Phone Numbers", group: "Client", get: ({ client }) => formatPhones(client) },
  { key: "email", label: "Email", group: "Client", get: ({ client }) => client?.parent_email || "" },
  { key: "city", label: "City", group: "Client", get: ({ client }) => client?.city || "" },
  { key: "current_school", label: "Current Yeshiva", group: "Client", get: ({ client }) => client?.current_school || "" },
  { key: "shiur", label: "שיעור", group: "Client", get: ({ client }) => client?.shiur || "" },
  { key: "reason", label: "סיבה", group: "Client", get: ({ client }) => client?.reason || "" },
  { key: "caller", label: "ווער רופט", group: "Client", get: ({ client }) => [client?.caller_source || client?.referral_source, client?.caller_name].filter(Boolean).join(" - ") },
  { key: "responsible", label: "Responsible", group: "Client", get: ({ client }) => [client?.responsible_person, client?.responsible_name].filter(Boolean).join(" - ") },
  { key: "client_status", label: "Client Status", group: "Client", get: ({ client }) => client?.status || "" },
  { key: "special_needs", label: "Special Needs", group: "Client", get: ({ client }) => formatList(client?.special_needs) },
  { key: "family_expectations", label: "Family Expectations", group: "Client", get: ({ client }) => client?.family_expectations || "" },
  { key: "client_notes", label: "Client Notes", group: "Client", get: ({ client }) => client?.notes || "" },
  { key: "client_files", label: "Client Files", group: "Client", get: ({ client }) => (client?.files || []).map((file) => file.url || file.name).filter(Boolean).join("; ") },
  { key: "evaluation_status", label: "Evaluation Status", group: "Evaluation", get: ({ evaluation }) => evaluation?.status || "" },
  { key: "evaluator", label: "Evaluator", group: "Evaluation", get: ({ evaluation, openCase }) => evaluation?.evaluator_name || openCase.evaluator_name || "" },
  { key: "appointment_date", label: "Appointment Date", group: "Evaluation", get: ({ evaluation, openCase }) => fmtDateTime(evaluation?.appointment_date || openCase.appointment_date, "") },
  { key: "billing_answer", label: "Evaluation Billing Answer", group: "Evaluation", get: ({ evaluation }) => evaluation?.evaluation_billing_answer || "" },
  { key: "billing_note", label: "Evaluation Billing Note", group: "Evaluation", get: ({ evaluation }) => evaluation?.evaluation_billing_note || "" },
  ...questionnaireFields.map((field) => ({
    key: `question_${field.key}`,
    label: field.label,
    group: "Questionnaire",
    get: ({ evaluation }) => questionnaireAnswer(evaluation, field.key),
  })),
];

export default function OpenCases() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("Open");
  const [showExportOptions, setShowExportOptions] = useState(false);
  const [selectedFields, setSelectedFields] = useState(() =>
    Object.fromEntries(exportFields.map((field) => [field.key, true]))
  );

  const { data: openCases = [], isLoading } = useQuery({
    queryKey: ["open_cases"], queryFn: () => firebaseClient.entities.OpenCase.list("-created_date", 1000),
  });
  const { data: clients = [] } = useQuery({
    queryKey: ["clients"], queryFn: () => firebaseClient.entities.Client.list("-created_date", 1000),
  });
  const { data: evaluations = [] } = useQuery({
    queryKey: ["evaluations"], queryFn: () => firebaseClient.entities.Evaluation.list("-created_date", 1000),
  });

  const updateCase = useMutation({
    mutationFn: ({ id, data }) => firebaseClient.entities.OpenCase.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["open_cases"] });
      toast.success("Case updated");
    },
    onError: () => toast.error("Failed to update case"),
  });

  const missingCompletedEvaluations = useMemo(() => {
    return evaluations.filter((evaluation) =>
      evaluation?.status === "Completed" &&
      evaluation.client_id &&
      !openCases.some((openCase) => caseMatchesEvaluation(openCase, evaluation))
    );
  }, [evaluations, openCases]);

  useEffect(() => {
    if (missingCompletedEvaluations.length === 0) return undefined;

    let cancelled = false;
    const now = new Date().toISOString();

    Promise.all(
      missingCompletedEvaluations.map((evaluation) =>
        firebaseClient.entities.OpenCase.create(buildOpenCaseFromEvaluation(evaluation, now))
      )
    )
      .then(() => {
        if (!cancelled) {
          queryClient.invalidateQueries({ queryKey: ["open_cases"] });
        }
      })
      .catch((error) => {
        console.error("Failed to sync completed evaluations into Open Cases:", error);
        if (!cancelled) {
          toast.error("Failed to sync completed evaluations into Open Cases");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [missingCompletedEvaluations, queryClient]);

  const rows = useMemo(() => {
    const caseRows = openCases.map((openCase) => {
      const client = clients.find((record) => record.id === openCase.client_id);
      const evaluation = evaluations.find((record) => record.id === openCase.evaluation_id) ||
        evaluations.find((record) => record.client_id === openCase.client_id && record.status === "Completed");
      return { openCase, client, evaluation, synthetic: false };
    });

    const evaluationRows = missingCompletedEvaluations.map((evaluation) => {
      const client = clients.find((record) => record.id === evaluation.client_id);
      const fallbackDate = evaluation.completed_date || evaluation.updated_date || evaluation.created_date || new Date().toISOString();
      return {
        openCase: {
          id: `completed-${evaluation.id}`,
          ...buildOpenCaseFromEvaluation(evaluation, fallbackDate),
        },
        client,
        evaluation,
        synthetic: true,
      };
    });

    return [...caseRows, ...evaluationRows]
      .filter(({ openCase }) => statusFilter === "all" || (openCase.status || "Open") === statusFilter);
  }, [openCases, clients, evaluations, missingCompletedEvaluations, statusFilter]);

  const groupedFields = useMemo(() => {
    return exportFields.reduce((groups, field) => {
      groups[field.group] = [...(groups[field.group] || []), field];
      return groups;
    }, {});
  }, []);

  const selectedCount = exportFields.filter((field) => selectedFields[field.key]).length;

  const setAllFields = (value) => {
    setSelectedFields(Object.fromEntries(exportFields.map((field) => [field.key, value])));
  };

  const downloadExcel = () => {
    const fields = exportFields.filter((field) => selectedFields[field.key]);
    if (fields.length === 0) {
      toast.error("Choose at least one Excel field");
      return;
    }
    const date = new Date().toISOString().slice(0, 10);
    downloadHtmlExcel(`yuiri-open-cases-${date}.xls`, fields, rows);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Open Cases</h1>
          <p className="text-sm text-gray-500 mt-1">{rows.length} cases shown</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Open">Open</SelectItem>
              <SelectItem value="Closed">Closed</SelectItem>
              <SelectItem value="all">All Cases</SelectItem>
            </SelectContent>
          </Select>
          <Button className="gap-2 bg-[#1e3a5f] hover:bg-[#1e3a5f]/90" onClick={() => setShowExportOptions((current) => !current)}>
            <Download className="w-4 h-4" /> Download Excel
          </Button>
        </div>
      </div>

      {showExportOptions && (
        <section className="bg-white rounded-2xl border border-gray-100 p-4 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-gray-400" /> Excel fields
              </h2>
              <p className="text-xs text-gray-400 mt-1">{selectedCount} selected</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" size="sm" variant="outline" onClick={() => setAllFields(true)}>Select all</Button>
              <Button type="button" size="sm" variant="outline" onClick={() => setAllFields(false)}>Clear</Button>
              <Button type="button" size="sm" className="gap-2 bg-[#1e3a5f] hover:bg-[#1e3a5f]/90" onClick={downloadExcel}>
                <Download className="w-4 h-4" /> Download Excel
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {Object.entries(groupedFields).map(([group, fields]) => (
              <div key={group} className="rounded-lg border border-gray-100 p-3">
                <h3 className="text-sm font-semibold text-gray-800 mb-2">{group}</h3>
                <div className="space-y-2">
                  {fields.map((field) => (
                    <label key={field.key} className="flex items-start gap-2 text-sm text-gray-600">
                      <Checkbox
                        checked={Boolean(selectedFields[field.key])}
                        onCheckedChange={(checked) =>
                          setSelectedFields((current) => ({ ...current, [field.key]: Boolean(checked) }))
                        }
                      />
                      <span className="leading-4">{field.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="bg-white rounded-2xl border border-gray-100">
        {isLoading ? (
          <div className="p-5 space-y-3">{Array.from({ length: 5 }).map((_, index) => <Skeleton key={index} className="h-10" />)}</div>
        ) : rows.length === 0 ? (
          <div className="text-center py-16">
            <BriefcaseBusiness className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">No open cases</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Evaluator</TableHead>
                <TableHead>Appointment</TableHead>
                <TableHead>Last Activity</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map(({ openCase, client, evaluation, synthetic }) => (
                <TableRow key={openCase.id}>
                  <TableCell className="font-medium text-gray-900">
                    <button
                      type="button"
                      className="hover:underline"
                      onClick={() => client && navigate(`${createPageUrl("ClientDetail")}?id=${client.id}`)}
                    >
                      {fullName(client, openCase.client_name || "Client")}
                    </button>
                    <p className="text-xs text-gray-400">{client?.client_id ? `ID ${client.client_id}` : ""}</p>
                  </TableCell>
                  <TableCell className="text-gray-500">{evaluation?.evaluator_name || openCase.evaluator_name || "-"}</TableCell>
                  <TableCell className="text-gray-500">{fmtDateTime(evaluation?.appointment_date || openCase.appointment_date)}</TableCell>
                  <TableCell className="text-gray-500">{fmtDateTime(openCase.last_activity_date || openCase.updated_date)}</TableCell>
                  <TableCell><StatusBadge status={openCase.status || "Open"} /></TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => client && navigate(`${createPageUrl("ClientDetail")}?id=${client.id}`)}
                        disabled={!client}
                      >
                        Profile
                      </Button>
                      {(openCase.status || "Open") === "Closed" ? (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={synthetic || updateCase.isPending}
                          onClick={() => updateCase.mutate({ id: openCase.id, data: { status: "Open", last_activity_date: new Date().toISOString() } })}
                        >
                          Reopen
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={synthetic || updateCase.isPending}
                          onClick={() => updateCase.mutate({ id: openCase.id, data: { status: "Closed", closed_date: new Date().toISOString(), last_activity_date: new Date().toISOString() } })}
                        >
                          Close
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
