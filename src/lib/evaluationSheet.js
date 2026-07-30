const PAGE_WIDTH = 1056;
const PAGE_HEIGHT = 816;

// This is the exact field order and wording from Key Points.docx.
const KEY_POINTS_TEMPLATE = {
  keyPoints: [
    "\u05d6\u05d9\u05db\u05d8 \u05e4\u05d0\u05e8",
    "\u05e9\u05d9\u05e2\u05d5\u05e8",
    "\u05e1\u05d8\u05d9\u05d9\u05dc",
    "\u05d3\u05d0\u05e8\u05de\u05e2\u05d8\u05d0\u05e8\u05d9",
  ],
  evaluation: [
    { label: "\u05e4\u05d0\u05e8\u05d8\u05d0\u05d2\u05e1", response: "Notes" },
    { label: "\u05d3\u05d0\u05d5\u05d5\u05e2\u05e0\u05e2\u05df", response: "Notes" },
    { label: "\u05dc\u05e2\u05e8\u05e0\u05e2\u05df", response: "Notes" },
    { label: "\u05d7\u05d1\u05e8\u05d9\u05dd", response: "Notes" },
    { label: "\u05d7\u05d1\u05e8\u05d5\u05ea\u05d4'\u05e1", response: "Notes" },
    { label: "\u05d3\u05d0\u05e8\u05de\u05d0\u05d8\u05d0\u05e8\u05d9", response: "Notes" },
    { label: "\u05e7\u05d5\u05e7\u05d8 \u05d5\u05d5\u05d9\u05d3\u05d9\u05d0\u05d5\u05e1", response: "Notes" },
    { label: "\u05d4\u05d0\u05e1\u05d8 \u05d0 \u05e1\u05de\u05d0\u05e8\u05d8\u05e4\u05d5\u05df", response: "Notes" },
    { label: "\u05d2\u05e2\u05e4\u05d9\u05dc\u05d9\u05e9\u05e2\u05e8", response: "Notes" },
    { label: "\u05de\u05d9\u05d3\u05d5\u05ea", response: "Notes" },
    { label: "\u05d3\u05e8\u05da \u05d0\u05e8\u05e5 \u05d3\u05d9\u05d2\u05e2", response: "Notes" },
    {
      label: "\u05e0\u05d9\u05e9\u05d8 \u05d2\u05e2\u05d4\u05d0\u05d8 \u05e7\u05d9\u05d9\u05df \u05e0\u05e2\u05e8\u05d5\u05d5\u05df \u05d0\u05d5\u05df \u05d6\u05d9\u05da \u05d2\u05e2\u05e9\u05d8\u05d0\u05e8\u05e7\u05d8",
      response: "Notes",
    },
    {
      label: "\u05d0 \u05d7\u05d1\u05e8 \u05d2\u05e2\u05e8\u05e2\u05d3\u05d8 \u05e0\u05d9\u05e9\u05d8 \u05d2\u05d5\u05d8\u05e2 \u05d6\u05d0\u05db\u05df \u05d0\u05d5\u05df \u05d6\u05d9\u05da \u05d2\u05e2\u05e9\u05d8\u05d0\u05e8\u05e7\u05d8",
      response: "Notes",
    },
    { label: "\u05d4\u05d0\u05d8 \u05dc\u05d9\u05d1 \u05de\u05d5\u05d6\u05d9\u05e7", response: "Notes" },
    {
      label: "\u05d5\u05d5\u05e2\u05dc\u05db\u05e2 \u05d6\u05d0\u05da \u05d4\u05d0\u05e1\u05d8\u05d5 \u05dc\u05d9\u05d1 \u05d2\u05e2\u05d4\u05d0\u05d8 \u05d0\u05d5\u05df \u05d3\u05d9\u05d9\u05df \u05d9\u05e2\u05e6\u05d8\u05d9\u05d2\u05e2 \u05d9\u05e9\u05d9\u05d1\u05d4",
      response: "Answer",
    },
    {
      label: "\u05e1\u05d9\u05d1\u05d4 \u05e4\u05d5\u05df \u05d8\u05d5\u05d9\u05e9\u05df \u05d9\u05e9\u05d9\u05d1\u05d4",
      response: "Answer",
    },
    { label: "\u05d4\u05e2\u05e8\u05d5\u05ea", response: "Answer" },
  ],
};

function element(tag, styles = {}, text = "") {
  const node = document.createElement(tag);
  Object.assign(node.style, styles);
  if (text) node.textContent = text;
  return node;
}

function addHeading(container, title) {
  container.append(element("h2", {
    margin: "0 0 4px",
    paddingBottom: "3px",
    borderBottom: "1px solid #9aa8b8",
    color: "#1e3a5f",
    fontSize: "8px",
    fontWeight: "700",
    letterSpacing: "0",
  }, title));
}

function addResponseLine(container, label, extraLines = 0) {
  const response = element("div", {
    display: "flex",
    alignItems: "flex-end",
    gap: "3px",
    marginTop: "2px",
    color: "#475569",
    fontSize: "6.5px",
    lineHeight: "1.1",
  });
  response.append(
    element("span", { fontWeight: "700", whiteSpace: "nowrap" }, label),
    element("span", { flex: "1", height: "9px", borderBottom: "1px solid #94a3b8" }),
  );
  container.append(response);

  for (let index = 0; index < extraLines; index += 1) {
    container.append(element("div", {
      height: "9px",
      marginLeft: "25px",
      borderBottom: "1px solid #cbd5e1",
    }));
  }
}

function addKeyPoint(container, label) {
  const row = element("section", {
    direction: "rtl",
    marginBottom: "5px",
    minWidth: "0",
  });
  const prompt = element("div", {
    display: "flex",
    alignItems: "flex-end",
    gap: "3px",
    color: "#0f172a",
    fontSize: "8px",
    fontWeight: "700",
    lineHeight: "1.1",
  });
  prompt.append(
    element("span", { whiteSpace: "nowrap" }, label),
    element("span", { direction: "ltr", fontSize: "7px", fontWeight: "400" }, "[ ]"),
    element("span", { flex: "1", minWidth: "16px", height: "10px", borderBottom: "1px solid #64748b" }),
  );
  row.append(prompt);
  addResponseLine(row, "Notes");
  container.append(row);
}

function addEvaluationQuestion(container, question) {
  const row = element("section", {
    direction: "rtl",
    marginBottom: "5px",
    minWidth: "0",
  });
  row.append(element("div", {
    color: "#0f172a",
    fontSize: "7.25px",
    fontWeight: "700",
    lineHeight: "1.2",
    textAlign: "right",
  }, question.label));
  addResponseLine(row, question.response, question.label === "\u05d4\u05e2\u05e8\u05d5\u05ea" ? 1 : 0);
  container.append(row);
}

function buildMiniSheet() {
  const sheet = element("section", {
    boxSizing: "border-box",
    height: "100%",
    minWidth: "0",
    overflow: "hidden",
    padding: "9px",
    background: "#ffffff",
    border: "1px solid #cbd5e1",
    borderRadius: "3px",
    color: "#0f172a",
    fontFamily: "Arial, Helvetica, sans-serif",
  });
  const columns = element("div", {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
    gap: "9px",
    height: "100%",
  });
  const left = element("div", { minWidth: "0" });
  const right = element("div", { minWidth: "0" });
  columns.append(left, right);
  sheet.append(columns);

  addHeading(left, "Key Points");
  KEY_POINTS_TEMPLATE.keyPoints.forEach((label) => addKeyPoint(left, label));
  addHeading(left, "Evaluation");

  const splitAt = 8;
  KEY_POINTS_TEMPLATE.evaluation.slice(0, splitAt).forEach((question) => addEvaluationQuestion(left, question));
  addHeading(right, "Evaluation");
  KEY_POINTS_TEMPLATE.evaluation.slice(splitAt).forEach((question) => addEvaluationQuestion(right, question));

  return sheet;
}

function buildWorksheet() {
  const container = element("div", {
    position: "fixed",
    left: "-10000px",
    top: "0",
    width: `${PAGE_WIDTH}px`,
    zIndex: "-1",
  });
  const page = element("article", {
    boxSizing: "border-box",
    width: `${PAGE_WIDTH}px`,
    height: `${PAGE_HEIGHT}px`,
    overflow: "hidden",
    padding: "12px 14px",
    position: "relative",
    background: "#ffffff",
  });
  const forms = element("div", {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
    gridTemplateRows: "minmax(0, 1fr) minmax(0, 1fr)",
    gap: "10px",
    height: "100%",
  });
  for (let index = 0; index < 4; index += 1) forms.append(buildMiniSheet());
  page.append(forms);

  page.append(element("div", {
    position: "absolute",
    top: "8px",
    bottom: "8px",
    left: "50%",
    borderLeft: "1px dashed #94a3b8",
  }));
  page.append(element("div", {
    position: "absolute",
    right: "8px",
    left: "8px",
    top: "50%",
    borderTop: "1px dashed #94a3b8",
  }));

  container.append(page);
  return container;
}

export async function downloadBlankEvaluationSheet() {
  const container = buildWorksheet();
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
