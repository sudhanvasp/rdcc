import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { projects, bomItems } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
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

  const [project] = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  const items = await db.select().from(bomItems).where(eq(bomItems.projectId, id)).orderBy(desc(bomItems.createdAt));

  const exportData = {
    title: `${project.name} — BOM`,
    clientName: project.client,
    items: items.map((i) => ({
      partName: i.component,
      quantity: i.quantity,
      unitCost: i.unitCost ?? 0,
      totalCost: (i.unitCost ?? 0) * i.quantity,
    })),
    totalCost: items.reduce((sum, i) => sum + (i.unitCost ?? 0) * i.quantity, 0),
  };

  let buffer: Buffer;
  if (format === "excel") buffer = await generateExcel(exportData);
  else if (format === "word") buffer = await generateWord(exportData);
  else buffer = await generatePdf(exportData);

  const filename = `${project.name.replace(/[^a-z0-9]+/gi, "-")}-BOM.${EXTENSIONS[format]}`;

  return new NextResponse(new Blob([buffer as unknown as BlobPart]), {
    headers: {
      "Content-Type": CONTENT_TYPES[format],
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
