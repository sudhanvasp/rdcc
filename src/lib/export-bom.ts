import ExcelJS from "exceljs";
import { Document, Paragraph, Table, TableRow, TableCell, TextRun, HeadingLevel, WidthType, Packer } from "docx";
import PDFDocument from "pdfkit";

export type ExportRow = {
  partName: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
};

export type ExportData = {
  title: string;
  clientName?: string | null;
  items: ExportRow[];
  totalCost: number;
};

function money(n: number) {
  return "Rs. " + n.toLocaleString("en-IN");
}

export async function generateExcel(data: ExportData): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("BOM");

  sheet.mergeCells("A1:E1");
  sheet.getCell("A1").value = data.title;
  sheet.getCell("A1").font = { bold: true, size: 14 };

  if (data.clientName) {
    sheet.mergeCells("A2:E2");
    sheet.getCell("A2").value = `Client: ${data.clientName}`;
  }

  const headerRow = sheet.addRow(["#", "Part Name", "Quantity", "Unit Cost", "Total Cost"]);
  headerRow.font = { bold: true };
  headerRow.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE2E4E1" } };
  });

  data.items.forEach((item, i) => {
    sheet.addRow([i + 1, item.partName, item.quantity, item.unitCost, item.totalCost]);
  });

  const totalRow = sheet.addRow(["", "", "", "Total", data.totalCost]);
  totalRow.font = { bold: true };

  sheet.columns = [
    { width: 6 },
    { width: 32 },
    { width: 10 },
    { width: 14 },
    { width: 14 },
  ];

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

export async function generateWord(data: ExportData): Promise<Buffer> {
  const headerCells = ["#", "Part Name", "Quantity", "Unit Cost", "Total Cost"].map(
    (text) =>
      new TableCell({
        children: [new Paragraph({ children: [new TextRun({ text, bold: true })] })],
      })
  );

  const rows = data.items.map(
    (item, i) =>
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph(String(i + 1))] }),
          new TableCell({ children: [new Paragraph(item.partName)] }),
          new TableCell({ children: [new Paragraph(String(item.quantity))] }),
          new TableCell({ children: [new Paragraph(money(item.unitCost))] }),
          new TableCell({ children: [new Paragraph(money(item.totalCost))] }),
        ],
      })
  );

  const totalRow = new TableRow({
    children: [
      new TableCell({ children: [new Paragraph("")] }),
      new TableCell({ children: [new Paragraph("")] }),
      new TableCell({ children: [new Paragraph("")] }),
      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Total", bold: true })] })] }),
      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: money(data.totalCost), bold: true })] })] }),
    ],
  });

  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({ text: data.title, heading: HeadingLevel.HEADING_1 }),
          ...(data.clientName ? [new Paragraph({ text: `Client: ${data.clientName}` })] : []),
          new Paragraph({ text: "" }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [new TableRow({ children: headerCells }), ...rows, totalRow],
          }),
        ],
      },
    ],
  });

  return Packer.toBuffer(doc);
}

export async function generatePdf(data: ExportData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40 });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.fontSize(18).text(data.title, { underline: false });
    if (data.clientName) {
      doc.moveDown(0.3).fontSize(11).fillColor("#6b7280").text(`Client: ${data.clientName}`);
    }
    doc.moveDown(1);

    const colX = [40, 70, 320, 400, 480];
    const colWidth = [30, 250, 80, 80, 80];
    const headers = ["#", "Part Name", "Qty", "Unit Cost", "Total Cost"];

    function drawRow(cells: string[], y: number, bold = false) {
      doc.font(bold ? "Helvetica-Bold" : "Helvetica").fontSize(10).fillColor("#14171a");
      cells.forEach((cell, i) => {
        doc.text(cell, colX[i], y, { width: colWidth[i], align: i >= 2 ? "right" : "left" });
      });
    }

    let y = doc.y;
    drawRow(headers, y, true);
    y += 18;
    doc.moveTo(40, y - 4).lineTo(560, y - 4).strokeColor("#e2e4e1").stroke();

    data.items.forEach((item, i) => {
      if (y > 720) {
        doc.addPage();
        y = 40;
      }
      drawRow(
        [String(i + 1), item.partName, String(item.quantity), money(item.unitCost), money(item.totalCost)],
        y
      );
      y += 20;
    });

    y += 8;
    doc.moveTo(40, y - 4).lineTo(560, y - 4).strokeColor("#e2e4e1").stroke();
    drawRow(["", "", "", "Total", money(data.totalCost)], y, true);

    doc.end();
  });
}
