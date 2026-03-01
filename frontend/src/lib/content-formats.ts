import type { ContentType, CopyFormat, SaveFormat, ChatbotCopyFormat, ContentPayload, FormFieldDefinition, LiveQuestion } from "@/lib/types";

// === Format availability per content type ===

const COPY_FORMATS_BY_TYPE: Record<ContentType, CopyFormat[]> = {
  transcript: ["formatted", "plain", "markdown"],
  summary: ["formatted", "plain", "markdown"],
  form: ["formatted", "plain", "markdown", "json"],
  questions: ["formatted", "plain", "markdown", "json"],
};

const SAVE_FORMATS_BY_TYPE: Record<ContentType, SaveFormat[]> = {
  transcript: ["txt", "md", "docx", "pdf", "html"],
  summary: ["txt", "md", "docx", "pdf", "html"],
  form: ["txt", "md", "docx", "pdf", "html", "json"],
  questions: ["txt", "md", "docx", "pdf", "html", "json"],
};

export function getAvailableCopyFormats(type: ContentType): CopyFormat[] {
  return COPY_FORMATS_BY_TYPE[type];
}

export function getAvailableSaveFormats(type: ContentType): SaveFormat[] {
  return SAVE_FORMATS_BY_TYPE[type];
}

// === Human-readable labels ===

export const COPY_FORMAT_LABELS: Record<CopyFormat, string> = {
  formatted: "Formatted Text",
  plain: "Plain Text",
  markdown: "Markdown",
  json: "JSON",
};

export const CHATBOT_COPY_FORMAT_LABELS: Record<ChatbotCopyFormat, string> = {
  markdown: "Markdown",
  plain: "Plain Text",
  formatted: "Formatted Text",
};

export const SAVE_FORMAT_LABELS: Record<SaveFormat, string> = {
  txt: ".txt",
  md: ".md",
  docx: ".docx",
  pdf: ".pdf",
  html: ".html",
  json: ".json",
};

// === Copy logic ===

export async function copyAs(payload: ContentPayload, format: CopyFormat): Promise<void> {
  switch (format) {
    case "formatted": {
      if (payload.html) {
        await navigator.clipboard.write([
          new ClipboardItem({
            "text/html": new Blob([payload.html], { type: "text/html" }),
            "text/plain": new Blob([payload.plainText], { type: "text/plain" }),
          }),
        ]);
      } else {
        await navigator.clipboard.writeText(payload.plainText);
      }
      break;
    }
    case "plain":
      await navigator.clipboard.writeText(payload.plainText);
      break;
    case "markdown":
      await navigator.clipboard.writeText(payload.markdown);
      break;
    case "json":
      await navigator.clipboard.writeText(JSON.stringify(payload.json, null, 2));
      break;
  }
}

// === Save / download logic ===

function buildFileName(prefix: string, ext: string): string {
  const date = new Date().toISOString().slice(0, 10);
  return `${prefix}-${date}.${ext}`;
}

const DOCUMENT_HEADINGS: Record<ContentType, string> = {
  transcript: "Transcript",
  summary: "Summary",
  form: "Form Output",
  questions: "Questions & Topics",
};

function triggerDownload(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function saveAs(payload: ContentPayload, format: SaveFormat): Promise<void> {
  const fileName = buildFileName(payload.fileNamePrefix, format);

  switch (format) {
    case "txt": {
      const blob = new Blob([payload.plainText], { type: "text/plain;charset=utf-8" });
      triggerDownload(blob, fileName);
      break;
    }
    case "md": {
      const blob = new Blob([payload.markdown], { type: "text/markdown;charset=utf-8" });
      triggerDownload(blob, fileName);
      break;
    }
    case "json": {
      const text = JSON.stringify(payload.json, null, 2);
      const blob = new Blob([text], { type: "application/json;charset=utf-8" });
      triggerDownload(blob, fileName);
      break;
    }
    case "html": {
      const htmlContent = payload.html
        ? `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${payload.fileNamePrefix}</title><style>body{font-family:system-ui,sans-serif;max-width:800px;margin:2rem auto;padding:0 1rem;line-height:1.6}table{border-collapse:collapse;width:100%}th,td{border:1px solid #ddd;padding:8px;text-align:left}th{background:#f5f5f5}</style></head><body>${payload.html}</body></html>`
        : `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${payload.fileNamePrefix}</title><style>body{font-family:system-ui,sans-serif;max-width:800px;margin:2rem auto;padding:0 1rem;line-height:1.6;white-space:pre-wrap}</style></head><body>${escapeHtml(payload.plainText)}</body></html>`;
      const blob = new Blob([htmlContent], { type: "text/html;charset=utf-8" });
      triggerDownload(blob, fileName);
      break;
    }
    case "docx": {
      const { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, BorderStyle } = await import("docx");
      const heading = new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [new TextRun({ text: DOCUMENT_HEADINGS[payload.type], size: 28 })],
      });
      const paragraphs = parseMarkdownToDocx(payload.markdown, { Document, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, BorderStyle });
      const doc = new Document({
        sections: [{ children: [heading, ...paragraphs] }],
      });
      const buffer = await Packer.toBlob(doc);
      triggerDownload(buffer, fileName);
      break;
    }
    case "pdf": {
      const { default: jsPDF } = await import("jspdf");
      const doc = new jsPDF({ unit: "mm", format: "a4" });
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 15;
      const maxWidth = pageWidth - margin * 2;
      const lineHeight = 6;
      let y = margin;

      // Heading
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.text(DOCUMENT_HEADINGS[payload.type], margin, y);
      y += 10;
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");

      const lines = doc.splitTextToSize(payload.plainText, maxWidth);
      for (const line of lines) {
        if (y + lineHeight > doc.internal.pageSize.getHeight() - margin) {
          doc.addPage();
          y = margin;
        }
        doc.text(line, margin, y);
        y += lineHeight;
      }

      const blob = doc.output("blob");
      triggerDownload(blob, fileName);
      break;
    }
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseMarkdownToDocx(markdown: string, docx: any): any[] {
  const { Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, BorderStyle } = docx;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const elements: any[] = [];
  const lines = markdown.split("\n");
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Table detection
    if (line.includes("|") && i + 1 < lines.length && /^\|[\s\-:|]+\|$/.test(lines[i + 1].trim())) {
      // Parse table
      const headerCells = line.split("|").filter(c => c.trim()).map(c => c.trim());
      i += 2; // skip header and separator
      const rows: string[][] = [];
      while (i < lines.length && lines[i].includes("|")) {
        const cells = lines[i].split("|").filter(c => c.trim()).map(c => c.trim());
        rows.push(cells);
        i++;
      }
      const noBorder = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
      const thinBorder = { style: BorderStyle.SINGLE, size: 1, color: "DDDDDD" };
      const table = new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: headerCells.map((h: string) =>
              new TableCell({
                children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, size: 20 })] })],
                borders: { top: noBorder, left: noBorder, right: noBorder, bottom: thinBorder },
              })
            ),
          }),
          ...rows.map((row: string[]) =>
            new TableRow({
              children: row.map((cell: string) =>
                new TableCell({
                  children: [new Paragraph({ children: [new TextRun({ text: cell, size: 20 })] })],
                  borders: { top: noBorder, left: noBorder, right: noBorder, bottom: thinBorder },
                })
              ),
            })
          ),
        ],
      });
      elements.push(table);
      elements.push(new Paragraph({ children: [] }));
      continue;
    }

    // Headings
    const headingMatch = line.match(/^(#{1,3})\s+(.+)/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const headingLevel = level === 1 ? HeadingLevel.HEADING_1 : level === 2 ? HeadingLevel.HEADING_2 : HeadingLevel.HEADING_3;
      elements.push(new Paragraph({
        heading: headingLevel,
        children: parseInlineFormatting(headingMatch[2], TextRun),
      }));
      i++;
      continue;
    }

    // Bullet points
    const bulletMatch = line.match(/^(\s*)[-*]\s+(.+)/);
    if (bulletMatch) {
      const indent = Math.floor(bulletMatch[1].length / 2);
      elements.push(new Paragraph({
        bullet: { level: indent },
        children: parseInlineFormatting(bulletMatch[2], TextRun),
      }));
      i++;
      continue;
    }

    // Empty line
    if (line.trim() === "") {
      elements.push(new Paragraph({ children: [] }));
      i++;
      continue;
    }

    // Regular paragraph
    elements.push(new Paragraph({
      children: parseInlineFormatting(line, TextRun),
    }));
    i++;
  }

  return elements;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseInlineFormatting(text: string, TextRun: any): any[] {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const runs: any[] = [];
  // Simple bold/italic parsing
  const regex = /(\*\*\*(.+?)\*\*\*|\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`|([^*`]+))/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    if (match[2]) {
      runs.push(new TextRun({ text: match[2], bold: true, italics: true, size: 20 }));
    } else if (match[3]) {
      runs.push(new TextRun({ text: match[3], bold: true, size: 20 }));
    } else if (match[4]) {
      runs.push(new TextRun({ text: match[4], italics: true, size: 20 }));
    } else if (match[5]) {
      runs.push(new TextRun({ text: match[5], font: "Courier New", size: 20 }));
    } else if (match[6]) {
      runs.push(new TextRun({ text: match[6], size: 20 }));
    }
  }
  return runs.length > 0 ? runs : [new TextRun({ text, size: 20 })];
}

// === Payload builders ===

export function buildFormPayload(
  fields: FormFieldDefinition[],
  values: Record<string, unknown>,
  templateName: string,
): ContentPayload {
  // Plain text: "Field: Value" lines
  const plainLines = fields.map((field) => {
    const val = values[field.id];
    let displayVal: string;
    if (val == null) displayVal = "(empty)";
    else if (Array.isArray(val)) displayVal = val.join(", ");
    else if (typeof val === "boolean") displayVal = val ? "Yes" : "No";
    else displayVal = String(val);
    return `${field.label}: ${displayVal}`;
  });

  // Markdown: table
  const mdLines = [
    `# ${templateName}`,
    "",
    "| Field | Value |",
    "| --- | --- |",
    ...fields.map((field) => {
      const val = values[field.id];
      let displayVal: string;
      if (val == null) displayVal = "—";
      else if (Array.isArray(val)) displayVal = val.join(", ");
      else if (typeof val === "boolean") displayVal = val ? "Yes" : "No";
      else displayVal = String(val);
      return `| ${field.label} | ${displayVal} |`;
    }),
  ];

  // JSON
  const jsonObj: Record<string, unknown> = {};
  for (const field of fields) {
    jsonObj[field.label] = values[field.id] ?? null;
  }

  return {
    type: "form",
    plainText: plainLines.join("\n"),
    markdown: mdLines.join("\n"),
    json: jsonObj,
    fileNamePrefix: "form-output",
  };
}

export function buildQuestionsPayload(questions: LiveQuestion[]): ContentPayload {
  // Plain text
  const plainLines = questions.map((q) => {
    const marker = q.status === "answered" ? "[ANSWERED]" : "[UNANSWERED]";
    const answer = q.answer ? `\n  Answer: ${q.answer}` : "";
    return `${marker} ${q.question}${answer}`;
  });

  // Markdown
  const answered = questions.filter((q) => q.status === "answered");
  const unanswered = questions.filter((q) => q.status === "unanswered");
  const mdSections: string[] = ["# Questions & Topics", ""];
  if (answered.length > 0) {
    mdSections.push("## Answered", "");
    for (const q of answered) {
      mdSections.push(`- **${q.question}**`);
      if (q.answer) mdSections.push(`  - ${q.answer}`);
    }
    mdSections.push("");
  }
  if (unanswered.length > 0) {
    mdSections.push("## Unanswered", "");
    for (const q of unanswered) {
      mdSections.push(`- ${q.question}`);
    }
    mdSections.push("");
  }

  // JSON
  const jsonArr = questions.map((q) => ({
    question: q.question,
    status: q.status,
    answer: q.answer ?? null,
  }));

  return {
    type: "questions",
    plainText: plainLines.join("\n"),
    markdown: mdSections.join("\n"),
    json: jsonArr,
    fileNamePrefix: "questions",
  };
}
