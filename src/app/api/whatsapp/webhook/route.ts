import { NextRequest, NextResponse } from "next/server";
import { parseIncomingMessage } from "@/lib/whatsapp";
import { handleIncomingMessage } from "@/lib/whatsapp-flow";

// Meta's one-time verification handshake when you register the webhook URL
// in the Meta developer console.
export async function GET(req: NextRequest) {
  const mode = req.nextUrl.searchParams.get("hub.mode");
  const token = req.nextUrl.searchParams.get("hub.verify_token");
  const challenge = req.nextUrl.searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new NextResponse(challenge ?? "", { status: 200 });
  }
  return NextResponse.json({ error: "Verification failed" }, { status: 403 });
}

// Meta calls this for every inbound message/button tap. We always return
// 200 quickly (WhatsApp retries aggressively on non-200s) and do the real
// work — the state machine — before responding where possible.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ ok: true });

  const incoming = parseIncomingMessage(body);
  if (!incoming) return NextResponse.json({ ok: true });

  try {
    await handleIncomingMessage(incoming.from, incoming);
  } catch (err) {
    console.error("WhatsApp webhook error:", err);
  }

  return NextResponse.json({ ok: true });
}
