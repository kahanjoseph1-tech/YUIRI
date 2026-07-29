import {
  checkboxQuestions,
  keyPointQuestions,
  longAnswerQuestions,
  singleChoiceQuestions,
} from "@/lib/evaluationQuestions";
import { DEFAULT_DROPDOWN_OPTIONS, uniqueOptions } from "@/lib/dropdownSettings";

const PAGE_WIDTH = 1056;
const PAGE_HEIGHT = 816;

function element(tag, styles = {}, text = "") {
  const node = document.createElement(tag);
  Object.assign(node.style, styles);
  if (text) node.textContent = text;
  return node;
}

function optionList(question, dropdownOptions) {
  return uniqueOptions([
    ...(dropdownOptions?.[question.settingsKey]
      || DEFAULT_DROPDOWN_OPTIONS[question.settingsKey]
      || question.options
      || []),
  ]);
}

function addMiniHeader(sheet) {
  const header = element("header", {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    borderBottom: "1.5px solid #1e3a5f",
    paddingBottom: "4px",
    marginBottom: "5px",
  });
  const brand = element("div");
  brand.append(
    element("div", { color: "#1e3a5f", fontSize: "11px", fontWeight: "700" }, "Yuiri"),
    element("div", { color: "#64748b", fontSize: "5px", fontWeight: "700", letterSpacing: "0.6px", marginTop: "1px" }, "SUPPORT CRM"),
  );

  const title = element("div", { textAlign: "right" });
  title.append(
    element("div", { color: "#0f172a", fontSize: "10px", fontWeight: "700" }, "Evaluation Worksheet"),
    element("div", { color: "#64748b", fontSize: "5.5px", marginTop: "1px" }, "Blank form"),
  );
  header.append(brand, title);
  sheet.append(header);

  const details = element("div", {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "3px 6px",
    marginBottom: "5px",
    padding: "4px 5px",
    border: "1px solid #dbe5ef",
    borderRadius: "3px",
    background: "#f8fafc",
  });
  ["Boy's name", "Date", "Evaluator", "Client ID"].forEach((label) => {
    const field = element("div", { fontSize: "6px", color: "#475569" });
    field.append(
      element("div", { fontWeight: "700", marginBottom: "3px" }, label),
      element("div", { borderBottom: "1px solid #94a3b8", height: "5px" }),
    );
    details.append(field);
  });
  sheet.append(details);
}

function addSectionHeading(container, title) {
  container.append(element("h2", {
    fontSize: "7px",
    color: "#1e3a5f",
    fontWeight: "700",
    margin: "4px 0 2px",
    paddingBottom: "2px",
    borderBottom: "1px solid #dbe5ef",
    textAlign: "left",
  }, title));
}

function addWritingLines(container, label, lineCount = 1) {
  const notes = element("div", {
    marginTop: "2px",
    color: "#475569",
    fontSize: "5.5px",
    lineHeight: "1",
    direction: "ltr",
    textAlign: "left",
  });
  notes.append(element("span", { fontWeight: "700", marginRight: "3px" }, label));
  const lines = element("div", { marginTop: "1px" });
  for (let index = 0; index < lineCount; index += 1) {
    lines.append(element("div", {
      borderBottom: "1px solid #cbd5e1",
      height: "5px",
      marginTop: index ? "1px" : "0",
    }));
  }
  notes.append(lines);
  container.append(notes);
}

function addChoiceQuestion(container, question, dropdownOptions) {
  const questionNode = element("section", {
    padding: "3px 4px",
    border: "1px solid #e2e8f0",
    borderRadius: "3px",
    marginBottom: "2px",
    direction: "rtl",
    breakInside: "avoid",
  });
  questionNode.append(element("div", {
    fontSize: "7px",
    lineHeight: "1.15",
    color: "#0f172a",
    fontWeight: "700",
    textAlign: "right",
  }, question.label));

  const options = optionList(question, dropdownOptions);
  const optionsNode = element("div", {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "flex-start",
    gap: "1px 4px",
    marginTop: "2px",
    fontSize: "6px",
    lineHeight: "1.15",
    color: "#334155",
  });
  options.forEach((option) => {
    optionsNode.append(element("span", { whiteSpace: "nowrap" }, `[ ] ${option}`));
  });
  questionNode.append(optionsNode);
  addWritingLines(questionNode, "Notes");
  container.append(questionNode);
}

function addLongAnswerQuestion(container, question) {
  const questionNode = element("section", {
    padding: "3px 4px",
    border: "1px solid #e2e8f0",
    borderRadius: "3px",
    marginBottom: "2px",
    direction: "rtl",
    breakInside: "avoid",
  });
  questionNode.append(element("div", {
    fontSize: "7px",
    lineHeight: "1.15",
    color: "#0f172a",
    fontWeight: "700",
    textAlign: "right",
  }, question.label));
  addWritingLines(questionNode, "Answer");
  addWritingLines(questionNode, "Notes");
  container.append(questionNode);
}

function buildMiniSheet(dropdownOptions) {
  const sheet = element("section", {
    minWidth: "0",
    height: "100%",
    boxSizing: "border-box",
    padding: "7px",
    border: "1px solid #cbd5e1",
    borderRadius: "4px",
    background: "#ffffff",
    color: "#0f172a",
    fontFamily: "Arial, Helvetica, sans-serif",
    overflow: "hidden",
  });
  addMiniHeader(sheet);

  const columns = element("div", {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
    gap: "5px",
    alignItems: "start",
  });
  const leftColumn = element("div", { minWidth: "0" });
  const rightColumn = element("div", { minWidth: "0" });
  columns.append(leftColumn, rightColumn);
  sheet.append(columns);

  addSectionHeading(leftColumn, "Key Points");
  keyPointQuestions.forEach((question) => addChoiceQuestion(leftColumn, question, dropdownOptions));
  addSectionHeading(leftColumn, "Evaluation");
  singleChoiceQuestions.forEach((question) => addChoiceQuestion(leftColumn, question, dropdownOptions));
  checkboxQuestions.slice(0, 3).forEach((question) => addChoiceQuestion(leftColumn, question, dropdownOptions));

  addSectionHeading(rightColumn, "Evaluation Continued");
  checkboxQuestions.slice(3).forEach((question) => addChoiceQuestion(rightColumn, question, dropdownOptions));
  addSectionHeading(rightColumn, "Detailed Answers");
  longAnswerQuestions.forEach((question) => addLongAnswerQuestion(rightColumn, question));

  return sheet;
}

function buildWorksheet(dropdownOptions) {
  const container = element("div", {
    position: "fixed",
    left: "-10000px",
    top: "0",
    width: `${PAGE_WIDTH}px`,
    zIndex: "-1",
  });
  const page = element("article", {
    width: `${PAGE_WIDTH}px`,
    height: `${PAGE_HEIGHT}px`,
    boxSizing: "border-box",
    padding: "14px 16px",
    background: "#ffffff",
    position: "relative",
    overflow: "hidden",
  });
  const forms = element("div", {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
    gap: "14px",
    height: "100%",
  });
  forms.append(buildMiniSheet(dropdownOptions), buildMiniSheet(dropdownOptions));
  page.append(forms);

  page.append(element("div", {
    position: "absolute",
    top: "10px",
    bottom: "10px",
    left: "50%",
    borderLeft: "1px dashed #94a3b8",
  }));
  page.append(element("div", {
    position: "absolute",
    top: "3px",
    left: "50%",
    transform: "translateX(-50%)",
    padding: "0 4px",
    color: "#64748b",
    background: "#ffffff",
    fontFamily: "Arial, Helvetica, sans-serif",
    fontSize: "6px",
  }, "Cut here"));

  container.append(page);
  return container;
}

function addCompactKeyPoint(container, question) {
  const row = element("section", {
    minWidth: "0",
    marginBottom: "3px",
    direction: "rtl",
  });
  const response = element("div", {
    display: "flex",
    alignItems: "flex-end",
    gap: "3px",
    color: "#0f172a",
    fontSize: "6.5px",
    fontWeight: "700",
    lineHeight: "1.1",
  });
  response.append(
    element("span", { whiteSpace: "nowrap" }, question.label),
    element("span", { fontSize: "6px", fontWeight: "400" }, "[ ]"),
    element("div", { flex: "1", minWidth: "14px", borderBottom: "1px solid #94a3b8", height: "7px" }),
  );
  row.append(response);
  addWritingLines(row, "Notes");
  container.append(row);
}

function addCompactEvaluationQuestion(container, question, answerLabel = "Notes") {
  const row = element("section", {
    minWidth: "0",
    marginBottom: "3px",
    direction: "rtl",
  });
  row.append(element("div", {
    color: "#0f172a",
    fontSize: "6.3px",
    fontWeight: "700",
    lineHeight: "1.12",
    textAlign: "right",
  }, question.label));
  addWritingLines(row, answerLabel, question.key === "notes" ? 2 : 1);
  container.append(row);
}

function buildKeyPointsMiniSheet() {
  const sheet = element("section", {
    minWidth: "0",
    height: "100%",
    boxSizing: "border-box",
    padding: "7px",
    border: "1px solid #cbd5e1",
    borderRadius: "3px",
    background: "#ffffff",
    color: "#0f172a",
    fontFamily: "Arial, Helvetica, sans-serif",
    overflow: "hidden",
  });

  const header = element("header", {
    display: "flex",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: "8px",
    borderBottom: "1px solid #1e3a5f",
    paddingBottom: "3px",
    marginBottom: "4px",
  });
  header.append(
    element("div", { color: "#1e3a5f", fontSize: "8px", fontWeight: "700" }, "Yuiri Support CRM"),
    element("div", { color: "#0f172a", fontSize: "8px", fontWeight: "700" }, "Key Points & Evaluation"),
  );
  sheet.append(header);

  const columns = element("div", {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
    gap: "7px",
    height: "calc(100% - 17px)",
    alignItems: "start",
  });
  const leftColumn = element("div", { minWidth: "0" });
  const rightColumn = element("div", { minWidth: "0" });
  columns.append(leftColumn, rightColumn);
  sheet.append(columns);

  addSectionHeading(leftColumn, "Key Points");
  keyPointQuestions.slice(0, 2).forEach((question) => addCompactKeyPoint(leftColumn, question));
  addSectionHeading(rightColumn, "Key Points");
  keyPointQuestions.slice(2).forEach((question) => addCompactKeyPoint(rightColumn, question));

  addSectionHeading(leftColumn, "Evaluation");
  const evaluationQuestions = [
    ...singleChoiceQuestions,
    ...checkboxQuestions,
    ...longAnswerQuestions,
  ];
  const splitAt = Math.ceil(evaluationQuestions.length / 2);
  evaluationQuestions.slice(0, splitAt).forEach((question) => {
    addCompactEvaluationQuestion(leftColumn, question, question.key === "liked_current_yeshiva" ? "Answer" : "Notes");
  });
  addSectionHeading(rightColumn, "Evaluation");
  evaluationQuestions.slice(splitAt).forEach((question) => {
    addCompactEvaluationQuestion(rightColumn, question, question.key === "reason_switching_yeshiva" ? "Answer" : "Notes");
  });

  return sheet;
}

function buildKeyPointsWorksheet() {
  const container = element("div", {
    position: "fixed",
    left: "-10000px",
    top: "0",
    width: `${PAGE_WIDTH}px`,
    zIndex: "-1",
  });
  const page = element("article", {
    width: `${PAGE_WIDTH}px`,
    height: `${PAGE_HEIGHT}px`,
    boxSizing: "border-box",
    padding: "12px 14px",
    background: "#ffffff",
    position: "relative",
    overflow: "hidden",
  });
  const forms = element("div", {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
    gridTemplateRows: "minmax(0, 1fr) minmax(0, 1fr)",
    gap: "10px",
    height: "100%",
  });
  for (let index = 0; index < 4; index += 1) forms.append(buildKeyPointsMiniSheet());
  page.append(forms);

  [
    { top: "8px", bottom: "8px", left: "50%", borderLeft: "1px dashed #94a3b8" },
    { left: "8px", right: "8px", top: "50%", borderTop: "1px dashed #94a3b8" },
  ].forEach((styles) => page.append(element("div", { position: "absolute", ...styles })));
  page.append(element("div", {
    position: "absolute",
    top: "2px",
    left: "50%",
    transform: "translateX(-50%)",
    padding: "0 4px",
    color: "#64748b",
    background: "#ffffff",
    fontFamily: "Arial, Helvetica, sans-serif",
    fontSize: "5px",
  }, "Cut here"));

  container.append(page);
  return container;
}

async function downloadWorksheet(container, filename) {
  document.body.append(container);

  try {
    if (document.fonts?.ready) await document.fonts.ready.catch(() => {});
    await new Promise((resolve) => window.setTimeout(resolve, 50));

    const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
      import("html2canvas"),
      import("jspdf"),
    ]);
    const page = container.firstElementChild;
    const canvas = await html2canvas(page, {
      backgroundColor: "#ffffff",
      logging: false,
      scale: 2,
      useCORS: true,
    });
    const doc = new jsPDF({ unit: "pt", format: "letter", orientation: "landscape" });
    doc.addImage(
      canvas.toDataURL("image/png"),
      "PNG",
      0,
      0,
      doc.internal.pageSize.getWidth(),
      doc.internal.pageSize.getHeight(),
      undefined,
      "FAST",
    );
    doc.save(filename);
  } finally {
    container.remove();
  }
}

export async function downloadBlankEvaluationSheet(dropdownOptions) {
  await downloadWorksheet(buildWorksheet(dropdownOptions), "Yuiri-Blank-Evaluation-Worksheet.pdf");
}

export async function downloadKeyPointsEvaluationSheet() {
  await downloadWorksheet(buildKeyPointsWorksheet(), "Yuiri-Key-Points-Evaluation-Worksheet.pdf");
}
