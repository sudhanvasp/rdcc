import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { generateWorkReport } from "@/lib/work-report";
import { daysBetween, isValidYmd } from "@/lib/work-report-model";
import { dbHint, rootCauseMessage } from "@/lib/error-message";

const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const MAX_SPAN_DAYS = 366;

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "admin") {
    return NextResponse.json({ error: "Only an admin can generate reports" }, { status: 403 });
  }

  const from = req.nextUrl.searchParams.get("from") ?? "";
  const to = req.nextUrl.searchParams.get("to") ?? "";
  if (!from || !to) {
    return NextResponse.json({ error: "from and to dates are required" }, { status: 400 });
  }
  if (!isValidYmd(from) || !isValidYmd(to) || from > to) {
    return NextResponse.json({ error: "Invalid date range" }, { status: 400 });
  }
  if (daysBetween(from, to) > MAX_SPAN_DAYS) {
    return NextResponse.json({ error: "Please pick a range of one year or less" }, { status: 400 });
  }

  try {
    const { buffer, filename } = await generateWorkReport({
      fromYmd: from,
      toYmd: to,
      preparedBy: session.name,
    });

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": DOCX_MIME,
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    // The full error goes to the server log; the admin who clicked the button
    // gets the reason too, so a failure is never just "something went wrong".
    console.error("Report generation failed:", err);
    const reason = rootCauseMessage(err);
    const hint = dbHint(reason);
    return NextResponse.json(
      { error: `Report generation failed: ${reason}.${hint ? ` ${hint}` : ""}` },
      { status: 500 }
    );
  }
}