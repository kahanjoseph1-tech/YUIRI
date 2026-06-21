import React, { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DEFAULT_DROPDOWN_OPTIONS,
  DROPDOWN_OPTIONS_QUERY_KEY,
  getDropdownOptions,
  uniqueOptions,
} from "@/lib/dropdownSettings";

const OTHER_OPTION = "Other";

const singleChoiceQuestions = [
  { key: "fartags", settingsKey: "evaluation_fartags_options", label: "פארטאגס", options: ["רוב", "חלק", "כמעט נישט"] },
  { key: "davening", settingsKey: "evaluation_davening_options", label: "דאווענען", options: ["מצוין", "טוב מאוד", "טוב"] },
  { key: "learning", settingsKey: "evaluation_learning_options", label: "לערנען", options: ["מצוין", "טוב מאוד", "טוב", "חלוש"] },
];

const keyPointQuestions = [
  { key: "zicht_far", settingsKey: "evaluation_key_points_zicht_far_options", label: "זיכט פאר" },
  { key: "shiur", settingsKey: "evaluation_key_points_shiur_options", label: "שיעור" },
  { key: "style", settingsKey: "evaluation_key_points_style_options", label: "סטייל" },
  { key: "dormitory", settingsKey: "evaluation_key_points_dormitory_options", label: "דארמעטארי" },
];

const checkboxQuestions = [
  { key: "friends", settingsKey: "evaluation_friends_options", label: "חברים", options: ["1", "2", "3", "4", "5", OTHER_OPTION] },
  { key: "chavrusas", settingsKey: "evaluation_chavrusas_options", label: "חברותה'ס", options: ["נארמאל", "געפלאגט", "אינגערמאן", OTHER_OPTION] },
  { key: "dormitory", settingsKey: "evaluation_dormitory_options", label: "דארמאטארי", options: ["יא", "ניין", OTHER_OPTION] },
  { key: "watches_videos", settingsKey: "evaluation_video_options", label: "קוקט ווידיאויס", options: ["קוקט נישט", "אביסל", "אסאך", OTHER_OPTION] },
  { key: "smartphone", settingsKey: "evaluation_smartphone_options", label: "האסט א סמארטפאון", options: ["ניין", "יא", "געהאט", OTHER_OPTION] },
  { key: "emotional", settingsKey: "evaluation_emotional_options", label: "געפילישער", options: ["יא", "אביסל", "ניין", OTHER_OPTION] },
  { key: "midos", settingsKey: "evaluation_midos_options", label: "מידות", options: ["פיינע", "קען זיין בעסער", OTHER_OPTION] },
  { key: "derech_eretz", settingsKey: "evaluation_derech_eretz_options", label: "דרך ארץ'דיגע", options: ["יא", "ניין", "קען זיין בעסער"] },
  {
    key: "strengthened_learning_davening",
    settingsKey: "evaluation_strengthened_learning_davening_options",
    label: "נישט געהאט קיין נערוון צו לערנען אדער דאווענען און זיך געשטארקט",
    options: ["יא", "ניין", OTHER_OPTION],
  },
  {
    key: "bad_friend_strengthened",
    settingsKey: "evaluation_bad_friend_strengthened_options",
    label: "א חבר גערעדט נישט גוטע זאכן און זיך געשטארקט",
    options: ["יא", "ניין", OTHER_OPTION],
  },
  { key: "likes_music", settingsKey: "evaluation_likes_music_options", label: "האט ליב מוזיק", options: ["יא", "ניין", OTHER_OPTION] },
];

const longAnswerQuestions = [
  {
    key: "liked_current_yeshiva",
    label: "וועלכע זאך האסטו ליב געהאט און דיין יעצטיגע ישיבה",
  },
  { key: "reason_switching_yeshiva", label: "סיבה פון טוישען ישיבה" },
  { key: "notes", label: "הערות" },
];

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

function defaultKeyPoints() {
  return Object.fromEntries(keyPointQuestions.map((question) => [question.key, ""]));
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

  const { data: dropdownOptions = DEFAULT_DROPDOWN_OPTIONS } = useQuery({
    queryKey: DROPDOWN_OPTIONS_QUERY_KEY,
    queryFn: getDropdownOptions,
  });

  const blankQuestionnaire = useMemo(() => defaultQuestionnaire(), []);
  const blankKeyPoints = useMemo(() => defaultKeyPoints(), []);
  const questionnaire = useMemo(
    () => ({ ...blankQuestionnaire, ...(form.questionnaire || {}) }),
    [blankQuestionnaire, form.questionnaire]
  );
  const keyPoints = useMemo(
    () => ({ ...blankKeyPoints, ...(form.key_points || {}) }),
    [blankKeyPoints, form.key_points]
  );

  const optionsForQuestion = (question) => {
    const savedValue = questionnaire[question.key];
    const savedOptions = Array.isArray(savedValue) ? savedValue : [savedValue];
    return uniqueOptions([
      ...(dropdownOptions[question.settingsKey] || question.options || []),
      ...savedOptions,
    ]);
  };

  const billingAnswerOptions = uniqueOptions([
    ...(dropdownOptions.evaluation_billing_answers || DEFAULT_DROPDOWN_OPTIONS.evaluation_billing_answers || []),
    form.evaluation_billing_answer,
  ]);

  const optionsForKeyPoint = (question) => uniqueOptions([
    ...(dropdownOptions[question.settingsKey] || DEFAULT_DROPDOWN_OPTIONS[question.settingsKey] || []),
    keyPoints[question.key],
  ]);

  useEffect(() => {
    if (open) {
      setForm({
        ...(evaluation || {}),
        questionnaire: {
          ...defaultQuestionnaire(),
          ...(evaluation?.questionnaire || {}),
        },
        key_points: {
          ...defaultKeyPoints(),
          ...(evaluation?.key_points || {}),
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

  const updateKeyPoint = (field, value) => {
    setForm((previous) => ({
      ...previous,
      key_points: {
        ...defaultKeyPoints(),
        ...(previous.key_points || {}),
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
          key_points: {
            ...defaultKeyPoints(),
            ...(form.key_points || {}),
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
          <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-4">
            <div className="mb-4">
              <h3 className="font-semibold text-gray-900">Key points</h3>
              <p className="text-xs text-gray-500 mt-1">Quick summary fields for the evaluation report.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4" dir="rtl">
              {keyPointQuestions.map((question) => (
                <Field key={question.key} label={question.label}>
                  <Select
                    value={keyPoints[question.key] || ""}
                    onValueChange={(value) => updateKeyPoint(question.key, value)}
                  >
                    <SelectTrigger className="text-right bg-white" dir="rtl">
                      <SelectValue placeholder="קלייב אויס" />
                    </SelectTrigger>
                    <SelectContent>
                      {optionsForKeyPoint(question).map((option) => (
                        <SelectItem key={option} value={option} className="text-right" dir="rtl">
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4" dir="rtl">
            {singleChoiceQuestions.map((question) => (
              <Field key={question.key} label={question.label}>
                <Select value={questionnaire[question.key] || ""} onValueChange={(value) => updateQuestion(question.key, value)}>
                  <SelectTrigger className="text-right" dir="rtl">
                    <SelectValue placeholder="קלייב אויס" />
                  </SelectTrigger>
                  <SelectContent>
                    {optionsForQuestion(question).map((option) => (
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
              const questionOptions = optionsForQuestion(question);
              const hasOther = selected.includes(OTHER_OPTION);

              return (
                <Field key={question.key} label={question.label} full={question.label.length > 35}>
                  <div className="rounded-md border border-gray-100 p-3">
                    <div className="flex flex-wrap gap-3">
                      {questionOptions.map((option) => (
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
                    {billingAnswerOptions.map((answer) => (
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
