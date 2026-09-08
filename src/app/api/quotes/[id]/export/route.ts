import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { quotes, quoteItems } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { generateExcel, generateWord, generatePdf } from "@/lib/export-bom";

const CONTENT_TYPES: Record<string, string> = {
  excel: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  word: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  pdf: "application/pdf",
};
const EXTENSIONS: Record<string, string> = { excel: "xlsx", word: "docx", pdf: "pdf" };

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const format = req.nextUrl.searchParams.get("format") ?? "pdf";
  if (!CONTENT_TYPES[format]) {
    return NextResponse.json({ error: "format must be pdf, excel, or word" }, { status: 400 });
  }

  const [quote] = await db.select().from(quotes).where(eq(quotes.id, id)).limit(1);
  if (!quote) return NextResponse.json({ error: "BOM not found" }, { status: 404 });

  const items = await db
    .select()
    .from(quoteItems)
    .where(eq(quoteItems.quoteId, id))
    .orderBy(asc(quoteItems.order));

  const exportData = {
    title: quote.title,
    clientName: quote.clientName,
    items: items.map((i) => ({
      partName: i.partName,
      quantity: i.quantity,
      unitCost: i.unitCost,
      totalCost: i.quantity * i.unitCost,
    })),
    totalCost: items.reduce((sum, i) => sum + i.quantity * i.unitCost, 0),
  };

  let buffer: Buffer;
  if (format === "excel") buffer = await generateExcel(exportData);
  else if (format === "word") buffer = await generateWord(exportData);
  else buffer = await generatePdf(exportData);

  const filename = `${quote.title.replace(/[^a-z0-9]+/gi, "-")}.${EXTENSIONS[format]}`;

  return new NextResponse(new Blob([buffer as unknown as BlobPart]), {
    headers: {
      "Content-Type": CONTENT_TYPES[format],
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
