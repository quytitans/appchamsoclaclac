import nodemailer, { type Transporter } from "nodemailer";

/**
 * Gmail SMTP transport, authenticated by an App Password (not OAuth).
 *
 * Why App Password instead of the Gmail API + OAuth refresh token we use for Drive:
 * an App Password never expires on its own (no 7-day "Testing mode" death, no
 * invalid_grant surprises) — it only stops working if the account password changes
 * or the password is revoked manually. For a background notifier that must keep
 * running unattended, that is the more robust choice.
 *
 * Required env:
 *   GMAIL_USER          — the sending Gmail address (e.g. laclac.notify@gmail.com)
 *   GMAIL_APP_PASSWORD  — 16-char App Password (Google Account → Security → 2-Step
 *                         Verification must be ON → App passwords). Spaces are ignored.
 * Optional env:
 *   MAIL_FROM_NAME      — display name in the From header (default "Lạc Lạc Bé Yêu")
 */

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Chưa cấu hình gửi mail: thiếu biến môi trường ${name}`);
  }
  return value;
}

export function getMailSender(): { address: string; name: string } {
  return {
    address: requireEnv("GMAIL_USER"),
    name: process.env.MAIL_FROM_NAME?.trim() || "Lạc Lạc Bé Yêu",
  };
}

let cachedTransporter: Transporter | null = null;

/** One pooled SMTP connection for the process lifetime — reused across sends. */
export function getMailTransporter(): Transporter {
  if (cachedTransporter) return cachedTransporter;

  const user = requireEnv("GMAIL_USER");
  const pass = requireEnv("GMAIL_APP_PASSWORD").replace(/\s+/g, "");

  cachedTransporter = nodemailer.createTransport({
    service: "gmail", // smtp.gmail.com:465, TLS
    pool: true,
    maxConnections: 3,
    auth: { user, pass },
  });
  return cachedTransporter;
}

/** Checks credentials + connectivity without sending anything. */
export async function verifyMailTransport(): Promise<void> {
  await getMailTransporter().verify();
}
