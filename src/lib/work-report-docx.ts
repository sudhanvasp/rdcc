// Turns a ReportModel into a .docx that matches the look of the sample work
// report: Times New Roman, navy title, blue section headings, navy table
// header rows with light zebra striping, A4 with 1" margins.

import {
  Document,
  Packer,
  Paragraph,
  Table,
  TableRow,
  TableCell,
  TextRun,
  WidthType,
  ShadingType,
  BorderStyle,
  HeadingLevel,
} from "docx";
import type { ReportModel, Seg } from "./work-report-model";

const FONT = "Times New Roman";
const INK = "1A1A2E";
const NAVY = "1F3A8A";
const BLUE = "2563EB";
const MUTED = "5B6275";
const ZEBRA = "F2F4F8";

// A4 is 11906 wide; minus 1" (1440) margins on each side.
const CONTENT_WIDTH = 9026;

// Word treats some characters as illegal inside a document (control codes,
// lone surrogates). One of those in pasted text would make Word say the whole
// file is corrupt, so anything outside the XML-legal ranges is dropped.
export function xmlSafe(text: string): string {
  let out = "";
  for (const ch of text) {
    const c = ch.codePointAt(0) as number;
    const legal =
      c === 0x9 ||
      c === 0xa ||
      c === 0xd ||
      (c >= 0x20 && c <= 0xd7ff) ||
      (c >= 0xe000 && c <= 0xfffd) ||
      (c >= 0x10000 && c <= 0x10ffff);
    if (legal) out += ch;
  }
  return out;
}

function runs(segs: Seg[]): TextRun[] {
  return segs.map((s) => new TextRun({ text: xmlSafe(s.t), bold: s.b }));
}

function body(segs: Seg[]): Paragraph {
  return new Paragraph({ spacing: { after: 120 }, children: runs(segs) });
}

function heading2(text: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    children: [new TextRun({ text: xmlSafe(text) })],
  });
}

function spacer(): Paragraph {
  return new Paragraph({ spacing: { after: 120 }, children: [] });
}

const line = { style: BorderStyle.SINGLE, size: 4, color: "auto" } as const;
const cellBorders = { top: line, bottom: line, left: line, right: line };

function cell(text: string, width: number, fill: string, header: boolean): TableCell {
  // Keep line breaks the writer typed (daily-log entries) as separate lines.
  const lines = xmlSafe(text).split(/\r?\n/);
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    borders: cellBorders,
    shading: { type: ShadingType.CLEAR, fill, color: "auto" },
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
    children: lines.map(
      (l) =>
        new Paragraph({
          spacing: { before: 80, after: 80 },
          children: [new TextRun({ text: l, bold: header, color: header ? "FFFFFF" : INK })],
        })
    ),
  });
}

function table(headers: string[], rows: string[][], widths: number[]): Table {
  const total = widths.reduce((a, b) => a + b, 0);
  return new Table({
    width: { size: total, type: WidthType.DXA },
    columnWidths: widths,
    rows: [
      new TableRow({
        tableHeader: true,
        cantSplit: true,
        children: headers.map((h, i) => cell(h, widths[i], NAVY, true)),
      }),
      ...rows.map(
        (r, ri) =>
          new TableRow({
            cantSplit: true,
            children: r.map((c, i) => cell(c, widths[i], ri % 2 === 0 ? "FFFFFF" : ZEBRA, false)),
          })
      ),
    ],
  });
}

export async function renderWorkReport(model: ReportModel): Promise<Buffer> {
  const children: (Paragraph | Table)[] = [];

  children.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      children: [new TextRun({ text: xmlSafe(model.title) })],
    })
  );
  children.push(
    new Paragraph({
      spacing: { after: 160 },
      children: [
        new TextRun({ text: "Date: ", bold: true }),
        new TextRun({ text: xmlSafe(model.dateLine.date) }),
        new TextRun({ text: "    " }),
        new TextRun({ text: "Prepared by: ", bold: true }),
        new TextRun({ text: xmlSafe(model.dateLine.preparedBy) }),
      ],
    })
  );

  // Overview
  children.push(heading2("Overview"), body(model.overview.paragraph));
  if (model.overview.rows.length > 0) {
    children.push(table(["#", "Project", "Assigned", "Status"], model.overview.rows, [600, 4000, 2326, 2100]), spacer());
  }

  // One section per project
  for (const p of model.projects) {
    children.push(heading2(`Project ${p.number}: ${p.name}`));
    for (const para of p.narrative) children.push(body(para));
    children.push(table(["Attribute", "Detail"], p.facts, [2600, 6426]), spacer());
    if (p.tasks.rows.length > 0) {
      children.push(
        new Paragraph({
          spacing: { before: 80, after: 80 },
          keepNext: true,
          children: [new TextRun({ text: "Tasks", bold: true })],
        }),
        table(["Task", "Status"], p.tasks.rows, [6426, 2600])
      );
      if (p.tasks.more > 0) {
        children.push(
          new Paragraph({
            spacing: { before: 80, after: 120 },
            children: [
              new TextRun({
                text: `+ ${p.tasks.more} more task${p.tasks.more === 1 ? "" : "s"} not shown.`,
                color: MUTED,
                italics: true,
              }),
            ],
          })
        );
      } else {
        children.push(spacer());
      }
    }
  }

  // Upcoming deadlines
  children.push(heading2("Upcoming Deadlines"), body(model.deadlines.paragraph));
  if (model.deadlines.rows.length > 0) {
    children.push(table(["Project", "Deadline", "Status"], model.deadlines.rows, [4026, 2600, 2400]), spacer());
  }

  // Daily log
  children.push(heading2("Daily Log"), body(model.daily.paragraph));
  if (model.daily.rows.length > 0) {
    children.push(table(["Date", "Person", "Project", "Update"], model.daily.rows, [1300, 1500, 2000, 4226]));
    if (model.daily.note) {
      children.push(
        new Paragraph({
          spacing: { before: 80, after: 120 },
          children: [new TextRun({ text: model.daily.note, color: MUTED, italics: true })],
        })
      );
    } else {
      children.push(spacer());
    }
  }

  // Summary
  children.push(heading2("Summary"));
  for (const para of model.summary) children.push(body(para));

  const doc = new Document({
    creator: "R&D Command Center",
    title: xmlSafe(model.title),
    styles: {
      default: { document: { run: { font: FONT, size: 22, color: INK } } },
      paragraphStyles: [
        {
          id: "Heading1",
          name: "Heading 1",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: { font: FONT, size: 36, bold: true, color: NAVY },
          paragraph: { spacing: { before: 0, after: 120 }, outlineLevel: 0, keepNext: true },
        },
        {
          id: "Heading2",
          name: "Heading 2",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: { font: FONT, size: 26, bold: true, color: BLUE },
          paragraph: { spacing: { before: 320, after: 160 }, outlineLevel: 1, keepNext: true },
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: 11906, height: 16838 },
            margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
          },
        },
        children,
      },
    ],
  });

  return Packer.toBuffer(doc);
}