export const OTHER_OPTION = "Other";

export const singleChoiceQuestions = [
  { key: "fartags", settingsKey: "evaluation_fartags_options", label: "פארטאגס", options: ["רוב", "חלק", "כמעט נישט"] },
  { key: "davening", settingsKey: "evaluation_davening_options", label: "דאווענען", options: ["מצוין", "טוב מאוד", "טוב"] },
  { key: "learning", settingsKey: "evaluation_learning_options", label: "לערנען", options: ["מצוין", "טוב מאוד", "טוב", "חלוש"] },
];

export const keyPointQuestions = [
  { key: "zicht_far", settingsKey: "evaluation_key_points_zicht_far_options", label: "זיכט פאר" },
  { key: "shiur", settingsKey: "evaluation_key_points_shiur_options", label: "שיעור" },
  { key: "style", settingsKey: "evaluation_key_points_style_options", label: "סטייל" },
  { key: "dormitory", settingsKey: "evaluation_key_points_dormitory_options", label: "דארמעטארי" },
];

export const checkboxQuestions = [
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

export const longAnswerQuestions = [
  { key: "liked_current_yeshiva", label: "וועלכע זאך האסטו ליב געהאט און דיין יעצטיגע ישיבה" },
  { key: "reason_switching_yeshiva", label: "סיבה פון טוישען ישיבה" },
  { key: "notes", label: "הערות" },
];

export const questionnaireQuestions = [
  ...singleChoiceQuestions,
  ...checkboxQuestions,
  ...longAnswerQuestions,
];

export function defaultQuestionnaire() {
  const defaults = {
    question_notes: {},
    key_point_notes: {},
  };

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
  questionnaireQuestions.forEach((question) => {
    defaults.question_notes[question.key] = "";
  });
  keyPointQuestions.forEach((question) => {
    defaults.key_point_notes[question.key] = "";
  });
  return defaults;
}

export function defaultKeyPoints() {
  return Object.fromEntries(keyPointQuestions.map((question) => [question.key, ""]));
}
