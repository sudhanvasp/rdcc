// Two email backends, switched via EMAIL_PROVIDER in .env:
// - "resend" (default): free API, 100/day, no card, but the sandbox sender
//   only reliably reaches your own signup email until you verify a domain.
// - "smtp": use your own Gmail/work email account directly. For Gmail you
//   need an "App Password" (not your normal password) — turn on 2-Step
//   Verification, then generate one at myaccount.google.com/apppasswords.

export class EmailConfigError extends Error {}

export type EmailAttachment = { filename: string; content: Buffer };

async function sendViaResend(to: string, subject: string, html: string, attachments?: EmailAttachment[]) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL || "R&D Command Center <onboarding@resend.dev>";
  if (!apiKey) {
    throw new EmailConfigError(
      "Email isn't set up yet. Get a free API key at https://resend.com/api-keys and add it to .env as RESEND_API_KEY."
    );
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      from,
      to,
      subject,
      html,
      attachments: attachments?.map((a) => ({ filename: a.filename, content: a.content.toString("base64") })),
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Email send failed via Resend (${res.status}): ${text.slice(0, 300)}`);
  }
}

async function sendViaSmtp(to: string, subject: string, html: string, attachments?: EmailAttachment[]) {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_FROM } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASSWORD) {
    throw new EmailConfigError(
      "SMTP isn't set up yet. Add SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, and SMTP_FROM to .env."
    );
  }

  // Dynamic import so nodemailer (a Node-only package) never gets pulled
  // into any client bundle.
  const nodemailer = await import("nodemailer");
  const transport = nodemailer.default.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT) || 587,
    secure: Number(SMTP_PORT) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASSWORD },
  });

  await transport.sendMail({
    from: SMTP_FROM || SMTP_USER,
    to,
    subject,
    html,
    attachments: attachments?.map((a) => ({ filename: a.filename, content: a.content })),
  });
}

export async function sendEmail(to: string, subject: string, html: string, attachments?: EmailAttachment[]) {
  const provider = (process.env.EMAIL_PROVIDER || "resend").toLowerCase();
  if (provider === "smtp") return sendViaSmtp(to, subject, html, attachments);
  if (provider === "resend") return sendViaResend(to, subject, html, attachments);
  throw new EmailConfigError(`Unknown EMAIL_PROVIDER "${provider}". Use "resend" or "smtp".`);
}

export function isEmailConfigured() {
  const provider = (process.env.EMAIL_PROVIDER || "resend").toLowerCase();
  if (provider === "smtp") return !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD);
  return !!process.env.RESEND_API_KEY;
}
