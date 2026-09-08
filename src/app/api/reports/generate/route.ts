import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { generateReportPdf } from "@/lib/weekly-report";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "admin") {
    return NextResponse.json({ error: "Only an admin can generate reports" }, { status: 403 });
  }

  const fromParam = req.nextUrl.searchParams.get("from");
  const toParam = req.nextUrl.searchParams.get("to");
  if (!fromParam || !toParam) {
    return NextResponse.json({ error: "from and to dates are required" }, { status: 400 });
  }

  const from = new Date(fromParam);
  const to = new Date(toParam);
  to.setHours(23, 59, 59, 999); // include the full end day
  if (isNaN(from.getTime()) || isNaN(to.getTime()) || from > to) {
    return NextResponse.json({ error: "Invalid date range" }, { status: 400 });
  }

  const pdf = await generateReportPdf(from, to);
  const filename = `report-${fromParam}-to-${toParam}.pdf`;

  return new NextResponse(new Blob([pdf as unknown as BlobPart]), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
