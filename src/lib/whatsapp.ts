// Thin wrapper around Meta's WhatsApp Cloud API (Graph API). All calls are
// server-side only — the access token never reaches the client.

const GRAPH_VERSION = "v21.0";

function creds() {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneNumberId) {
    throw new Error("WhatsApp isn't configured — set WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID in .env");
  }
  return { token, phoneNumberId };
}

async function send(payload: Record<string, unknown>) {
  const { token, phoneNumberId } = creds();
  const res = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ messaging_product: "whatsapp", ...payload }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`WhatsApp send failed (${res.status}): ${text.slice(0, 300)}`);
  }
  return res.json();
}

export async function sendText(to: string, body: string) {
  return send({ to, type: "text", text: { body } });
}

export async function sendButtons(
  to: string,
  bodyText: string,
  buttons: { id: string; title: string }[]
) {
  // WhatsApp allows a maximum of 3 quick-reply buttons per message.
  return send({
    to,
    type: "interactive",
    interactive: {
      type: "button",
      body: { text: bodyText },
      action: {
        buttons: buttons.slice(0, 3).map((b) => ({
          type: "reply",
          reply: { id: b.id, title: b.title.slice(0, 20) },
        })),
      },
    },
  });
}

export async function sendList(
  to: string,
  bodyText: string,
  buttonLabel: string,
  options: { id: string; title: string }[]
) {
  return send({
    to,
    type: "interactive",
    interactive: {
      type: "list",
      body: { text: bodyText },
      action: {
        button: buttonLabel.slice(0, 20),
        sections: [
          {
            title: "Options",
            rows: options.slice(0, 10).map((o) => ({ id: o.id, title: o.title.slice(0, 24) })),
          },
        ],
      },
    },
  });
}

// Normalizes an incoming webhook payload into a simple shape regardless of
// whether it was a typed message or a button/list tap.
export type IncomingMessage = { from: string; text: string; replyId?: string };

export function parseIncomingMessage(body: any): IncomingMessage | null {
  const entry = body?.entry?.[0];
  const change = entry?.changes?.[0];
  const message = change?.value?.messages?.[0];
  if (!message) return null;

  const from = message.from;
  if (message.type === "text") {
    return { from, text: message.text?.body ?? "" };
  }
  if (message.type === "interactive") {
    const buttonReply = message.interactive?.button_reply;
    const listReply = message.interactive?.list_reply;
    const reply = buttonReply ?? listReply;
    if (reply) return { from, text: reply.title, replyId: reply.id };
  }
  return null;
}
