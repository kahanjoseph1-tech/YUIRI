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

export async function downloadBlankEvaluationSheet(dropdownOptions) {
  const container = buildWorksheet(dropdownOptions);
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
    doc.save("Yuiri-Blank-Evaluation-Worksheet.pdf");
  } finally {
    container.remove();
  }
}
