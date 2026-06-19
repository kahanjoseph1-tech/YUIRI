import React, { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const OTHER_OPTION = "Other";

const singleChoiceQuestions = [
  { key: "fartags", label: "פארטאגס", options: ["רוב", "חלק", "כמעט נישט"] },
  { key: "davening", label: "דאווענען", options: ["מצוין", "טוב מאוד", "טוב"] },
  { key: "learning", label: "לערנען", options: ["מצוין", "טוב מאוד", "טוב", "חלוש"] },
];

const checkboxQuestions = [
  { key: "friends", label: "חברים", options: ["1", "2", "3", "4", "5", OTHER_OPTION] },
  { key: "chavrusas", label: "חברותה'ס", options: ["נארמאל", "געפלאגט", "אינגערמאן", OTHER_OPTION] },
  { key: "dormitory", label: "דארמאטארי", options: ["יא", "ניין", OTHER_OPTION] },
  { key: "watches_videos", label: "קוקט ווידיאויס", options: ["קוקט נישט", "אביסל", "אסאך", OTHER_OPTION] },
  { key: "smartphone", label: "האסט א סמארטפאון", options: ["ניין", "יא", "געהאט", OTHER_OPTION] },
  { key: "emotional", label: "געפילישער", options: ["יא", "אביסל", "ניין", OTHER_OPTION] },
  { key: "midos", label: "מידות", options: ["פיינע", "קען זיין בעסער", OTHER_OPTION] },
  { key: "derech_eretz", label: "דרך ארץ'דיגע", options: ["יא", "ניין", "קען זיין בעסער"] },
  {
    key: "strengthened_learning_davening",
    label: "נישט געהאט קיין נערוון צו לערנען אדער דאווענען און זיך געשטארקט",
    options: ["יא", "ניין", OTHER_OPTION],
  },
  {
    key: "bad_friend_strengthened",
    label: "א חבר גערעדט נישט גוטע זאכן און זיך געשטארקט",
    options: ["יא", "ניין", OTHER_OPTION],
  },
  { key: "likes_music", label: "האט ליב מוזיק", options: ["יא", "ניין", OTHER_OPTION] },
];

const longAnswerQuestions = [
  {
    key: "liked_current_yeshiva",
    label: "וועלכע זאך האסטו ליב געהאט און דיין יעצטיגע ישיבה",
  },
  { key: "reason_switching_yeshiva", label: "סיבה פון טוישען ישיבה" },
  { key: "notes", label: "הערות" },
];

const billingAnswers = ["געברענגט געלט", "דארף מען בילן", "נישט זיכער"];

function defaultQuestionnaire() {
  const defaults = {};
  singleChoiceQuestions.forEach((question) => {
    defaults[question.key] = "";
  });
  checkboxQuestions.forEach((question) => {
    defaults[question.key] = [];
    if (question.options.includes(OTHER_OPTION)) defaults[`${question.key}_other`] = "";
  });
  longAnswerQuestions.forEach((question) => {
    defaults[question.key] = "";
  });
  return defaults;
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function Field({ label, children, full }) {
  return (
    <div className={`space-y-1.5 ${full ? "sm:col-span-2" : ""}`}>
      <Label className="text-xs font-medium text-gray-500" dir="rtl">{label}</Label>
      {children}
    </div>
  );
}

export default function EvaluationFormDialog({ open, onOpenChange, evaluation, onSave }) {
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  const blankQuestionnaire = useMemo(() => defaultQuestionnaire(), []);
  const questionnaire = useMemo(
    () => ({ ...blankQuestionnaire, ...(form.questionnaire || {}) }),
    [blankQuestionnaire, form.questionnaire]
  );

  useEffect(() => {
    if (open) {
      setForm({
        ...(evaluation || {}),
        questionnaire: {
          ...defaultQuestionnaire(),
          ...(evaluation?.questionnaire || {}),
        },
        evaluation_billing_answer: evaluation?.evaluation_billing_answer || "",
        evaluation_billing_note: evaluation?.evaluation_billing_note || "",
      });
    }
  }, [open, evaluation]);

  const update = (field, value) => setForm((previous) => ({ ...previous, [field]: value }));

  const updateQuestion = (field, value) => {
    setForm((previous) => ({
      ...previous,
      questionnaire: {
        ...defaultQuestionnaire(),
        ...(previous.questionnaire || {}),
        [field]: value,
      },
    }));
  };

  const toggleQuestionOption = (field, option, checked) => {
    const current = asArray(questionnaire[field]);
    const next = checked ? [...new Set([...current, option])] : current.filter((entry) => entry !== option);
    updateQuestion(field, next);
    if (!checked && option === OTHER_OPTION) updateQuestion(`${field}_other`, "");
  };

  const handleSave = async (nextStatus) => {
    setSaving(true);
    try {
      await onSave(
        {
          ...form,
          questionnaire: {
            ...defaultQuestionnaire(),
            ...(form.questionnaire || {}),
          },
        },
        nextStatus
      );
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Evaluation - {evaluation?.client_name || "Client"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4" dir="rtl">
            {singleChoiceQuestions.map((question) => (
              <Field key={question.key} label={question.label}>
                <Select value={questionnaire[question.key] || ""} onValueChange={(value) => updateQuestion(question.key, value)}>
                  <SelectTrigger className="text-right" dir="rtl">
                    <SelectValue placeholder="קלייב אויס" />
                  </SelectTrigger>
                  <SelectContent>
                    {question.options.map((option) => (
                      <SelectItem key={option} value={option} className="text-right" dir="rtl">
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4" dir="rtl">
            {checkboxQuestions.map((question) => {
              const selected = asArray(questionnaire[question.key]);
              const hasOther = selected.includes(OTHER_OPTION);

              return (
                <Field key={question.key} label={question.label} full={question.label.length > 35}>
                  <div className="rounded-md border border-gray-100 p-3">
                    <div className="flex flex-wrap gap-3">
                      {question.options.map((option) => (
                        <label key={option} className="flex items-center gap-2 text-sm text-gray-700">
                          <Checkbox
                            checked={selected.includes(option)}
                            onCheckedChange={(checked) => toggleQuestionOption(question.key, option, Boolean(checked))}
                          />
                          <span>{option}</span>
                        </label>
                      ))}
                    </div>
                    {hasOther && (
                      <Input
                        className="mt-3 text-right"
                        dir="rtl"
                        value={questionnaire[`${question.key}_other`] || ""}
                        onChange={(event) => updateQuestion(`${question.key}_other`, event.target.value)}
                        placeholder="שרייב אנדערש..."
                      />
                    )}
                  </div>
                </Field>
              );
            })}
          </div>

          <div className="grid grid-cols-1 gap-4" dir="rtl">
            {longAnswerQuestions.map((question) => (
              <Field key={question.key} label={question.label} full>
                <Textarea
                  rows={3}
                  className="text-right"
                  dir="rtl"
                  value={questionnaire[question.key] || ""}
                  onChange={(event) => updateQuestion(question.key, event.target.value)}
                />
              </Field>
            ))}
          </div>

          <div className="rounded-lg border border-amber-100 bg-amber-50/50 p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="באצאלט / בילינג">
                <Select
                  value={form.evaluation_billing_answer || ""}
                  onValueChange={(value) => update("evaluation_billing_answer", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select billing answer" />
                  </SelectTrigger>
                  <SelectContent>
                    {billingAnswers.map((answer) => (
                      <SelectItem key={answer} value={answer}>{answer}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Billing note">
                <Textarea
                  rows={2}
                  value={form.evaluation_billing_note || ""}
                  onChange={(event) => update("evaluation_billing_note", event.target.value)}
                  placeholder="Example: needs invoice, paid cash, family will bring check"
                />
              </Field>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="secondary" disabled={saving} onClick={() => handleSave("In Progress")}>
            Save Draft
          </Button>
          <Button disabled={saving} onClick={() => handleSave("Completed")} className="bg-emerald-600 hover:bg-emerald-700">
            {saving ? "Saving..." : "Complete Evaluation"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
