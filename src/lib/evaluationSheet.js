import {
  checkboxQuestions,
  keyPointQuestions,
  longAnswerQuestions,
  singleChoiceQuestions,
} from "@/lib/evaluationQuestions";
import { DEFAULT_DROPDOWN_OPTIONS, uniqueOptions } from "@/lib/dropdownSettings";

const PAGE_WIDTH = 528;
const PAGE_HEIGHT = 816;
const HALF_LETTER_SIZE = [396, 612];

function element(tag, styles = {}, text = "") {
  const node = document.createElement(tag);
  Object.assign(node.style, styles);
  if (text) node.textContent = text;
  return node;
}

function optionList(question, dropdownOptions) {
  return uniqueOptions([
    ...(dropdownOptions?.[question.settingsKey] || DEFAULT_DROPDOWN_OPTIONS[question.settingsKey] || question.options || []),
  ]);
}

function addHeader(page, pageNumber) {
  const header = element("header", {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    borderBottom: "2px solid #1e3a5f",
    paddingBottom: "8px",
    marginBottom: "10px",
  });
  const brand = element("div");
  brand.append(
    element("div", { color: "#1e3a5f", fontSize: "17px", fontWeight: "700", letterSpacing: "0" }, "Yuiri"),
    element("div", { color: "#64748b", fontSize: "8px", fontWeight: "600", letterSpacing: "1px", marginTop: "1px" }, "SUPPORT CRM"),
  );

  const title = element("div", { textAlign: "right" });
  title.append(
    element("div", { color: "#0f172a", fontSize: "15px", fontWeight: "700" }, "Evaluation Worksheet"),
    element("div", { color: "#64748b", fontSize: "8px", marginTop: "2px" }, `Half-letter worksheet - page ${pageNumber}`),
  );
  header.append(brand, title);
  page.append(header);

  if (pageNumber === 1) {
    const details = element("div", {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: "7px 12px",
      marginBottom: "9px",
      padding: "8px",
      border: "1px solid #dbe5ef",
      borderRadius: "6px",
      background: "#f8fafc",
    });
    ["Boy's name", "Date", "Evaluator", "Client ID"].forEach((label) => {
      const field = element("div", { fontSize: "9px", color: "#475569" });
      field.append(
        element("div", { fontWeight: "700", marginBottom: "6px" }, label),
        element("div", { borderBottom: "1px solid #94a3b8", height: "9px" }),
      );
      details.append(field);
    });
    page.append(details);
  }
}

function addSectionHeading(page, title) {
  page.append(element("h2", {
    fontSize: "10px",
    color: "#1e3a5f",
    fontWeight: "700",
    margin: "8px 0 5px",
    paddingBottom: "3px",
    borderBottom: "1px solid #dbe5ef",
    textAlign: "left",
  }, title));
}

function addWritingLines(container, label, lineCount = 1) {
  const notes = element("div", {
    marginTop: "5px",
    color: "#475569",
    fontSize: "8px",
  });
  notes.append(element("span", { fontWeight: "700", marginRight: "6px" }, label));
  const lines = element("div", { marginTop: "3px" });
  for (let index = 0; index < lineCount; index += 1) {
    lines.append(element("div", {
      borderBottom: "1px solid #cbd5e1",
      height: "10px",
      marginTop: index ? "2px" : "0",
    }));
  }
  notes.append(lines);
  container.append(notes);
}

function addChoiceQuestion(page, question, dropdownOptions) {
  const questionNode = element("section", {
    padding: "6px 7px",
    border: "1px solid #e2e8f0",
    borderRadius: "6px",
    marginBottom: "5px",
    direction: "rtl",
    breakInside: "avoid",
  });
  questionNode.append(element("div", { fontSize: "10px", color: "#0f172a", fontWeight: "700", textAlign: "right" }, question.label));

  const options = optionList(question, dropdownOptions);
  const optionsNode = element("div", {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "flex-start",
    gap: "3px 7px",
    marginTop: "4px",
    fontSize: "8px",
    color: "#334155",
  });
  options.forEach((option) => {
    optionsNode.append(element("span", { whiteSpace: "nowrap" }, `☐ ${option}`));
  });
  questionNode.append(optionsNode);
  addWritingLines(questionNode, "Notes");
  page.append(questionNode);
}

function addLongAnswerQuestion(page, question) {
  const questionNode = element("section", {
    padding: "6px 7px",
    border: "1px solid #e2e8f0",
    borderRadius: "6px",
    marginBottom: "5px",
    direction: "rtl",
    breakInside: "avoid",
  });
  questionNode.append(element("div", { fontSize: "10px", color: "#0f172a", fontWeight: "700", textAlign: "right" }, question.label));
  addWritingLines(questionNode, "Answer", 2);
  addWritingLines(questionNode, "Notes");
  page.append(questionNode);
}

function createPage(container, pageNumber) {
  const page = element("article", {
    width: `${PAGE_WIDTH}px`,
    minHeight: `${PAGE_HEIGHT}px`,
    boxSizing: "border-box",
    padding: "24px 26px 24px",
    background: "#ffffff",
    color: "#0f172a",
    fontFamily: "Arial, Helvetica, sans-serif",
    position: "relative",
    overflow: "hidden",
    pageBreakAfter: "always",
  });
  addHeader(page, pageNumber);
  container.append(page);
  return page;
}

function addFooter(page, pageNumber, pageCount) {
  page.append(element("footer", {
    position: "absolute",
    bottom: "12px",
    left: "26px",
    right: "26px",
    borderTop: "1px solid #e2e8f0",
    paddingTop: "5px",
    display: "flex",
    justifyContent: "space-between",
    color: "#94a3b8",
    fontSize: "7px",
  }, `Yuiri Support CRM | ${pageNumber} / ${pageCount}`));
}

function buildWorksheet(dropdownOptions) {
  const container = element("div", {
    position: "fixed",
    left: "-10000px",
    top: "0",
    width: `${PAGE_WIDTH}px`,
    zIndex: "-1",
  });

  const pageOne = createPage(container, 1);
  addSectionHeading(pageOne, "Key Points");
  keyPointQuestions.forEach((question) => addChoiceQuestion(pageOne, question, dropdownOptions));
  addSectionHeading(pageOne, "Evaluation");
  singleChoiceQuestions.forEach((question) => addChoiceQuestion(pageOne, question, dropdownOptions));
  checkboxQuestions.slice(0, 3).forEach((question) => addChoiceQuestion(pageOne, question, dropdownOptions));

  const pageTwo = createPage(container, 2);
  addSectionHeading(pageTwo, "Evaluation Continued");
  checkboxQuestions.slice(3, 9).forEach((question) => addChoiceQuestion(pageTwo, question, dropdownOptions));

  const pageThree = createPage(container, 3);
  addSectionHeading(pageThree, "Evaluation Continued");
  checkboxQuestions.slice(9).forEach((question) => addChoiceQuestion(pageThree, question, dropdownOptions));
  addSectionHeading(pageThree, "Detailed Answers");
  longAnswerQuestions.forEach((question) => addLongAnswerQuestion(pageThree, question));

  [pageOne, pageTwo, pageThree].forEach((page, index) => addFooter(page, index + 1, 3));
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
    const pages = Array.from(container.children);
    const doc = new jsPDF({ unit: "pt", format: HALF_LETTER_SIZE });

    for (let index = 0; index < pages.length; index += 1) {
      const canvas = await html2canvas(pages[index], {
        backgroundColor: "#ffffff",
        logging: false,
        scale: 2,
        useCORS: true,
      });
      if (index > 0) doc.addPage(HALF_LETTER_SIZE, "portrait");
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
    }

    doc.save("Yuiri-Blank-Evaluation-Worksheet.pdf");
  } finally {
    container.remove();
  }
}
