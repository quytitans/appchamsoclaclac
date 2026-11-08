import { getMailSender, getMailTransporter } from "./client.js";

export interface SendMailInput {
  /** Subject line. */
  title: string;
  /** One or many recipients. Duplicates (case-insensitive) and blanks are dropped. */
  to: string | string[];
  /**
   * Body — give `html`, `text`, or both (at least one is required).
   * - `html` only: a plain-text fallback is derived automatically (spam filters and
   *   text-only clients like it).
   * - `text` only: sent as plain text, and also as a minimal HTML version that keeps
   *   line breaks and is safely escaped.
   */
  html?: string;
  text?: string;
  /**
   * How a list of recipients is delivered:
   * - "individual" (default): one separate email per address. Recipients never see
   *   each other's address, and you get a per-address success/failure result.
   * - "bcc": a single email with everyone in Bcc. Faster for big lists, but one bad
   *   address can fail the whole send and results aren't per-address.
   */
  mode?: "individual" | "bcc";
  /** Optional Reply-To address. */
  replyTo?: string;
}

export interface SendMailRecipientResult {
  to: string;
  ok: boolean;
  messageId?: string;
  error?: string;
}

export interface SendMailResult {
  /** Total accepted addresses. */
  sent: number;
  /** Total failed addresses (including ones rejected as invalid before sending). */
  failed: number;
  results: SendMailRecipientResult[];
}

const EMAIL_RE = /^[^\s@<>(),;:"]+@[^\s@<>(),;:"]+\.[^\s@<>(),;:"]+$/;
const INDIVIDUAL_CONCURRENCY = 3;

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function textToHtml(text: string): string {
  return `<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.5;white-space:pre-wrap">${escapeHtml(
    text
  )}</div>`;
}

function htmlToText(html: string): string {
  return html
    .replace(/<(style|script)[^>]*>[\s\S]*?<\/\1>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|h[1-6]|li|tr)>/gi, "\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function normalizeRecipients(to: string | string[]): { valid: string[]; invalid: string[] } {
  const list = Array.isArray(to) ? to : to.split(/[,;]/);
  const seen = new Set<string>();
  const valid: string[] = [];
  const invalid: string[] = [];
  for (const raw of list) {
    const addr = raw.trim();
    if (!addr) continue;
    const key = addr.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    (EMAIL_RE.test(addr) ? valid : invalid).push(addr);
  }
  return { valid, invalid };
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/**
 * Bad/revoked Gmail credentials are a config problem, not a per-recipient one — rethrow
 * so the caller can log/alert instead of silently getting "0 sent" every day.
 */
function isAuthError(err: unknown): boolean {
  return (err as { code?: string } | null)?.code === "EAUTH";
}

function authError(err: unknown): Error {
  return new Error(
    `Gmail từ chối đăng nhập — App Password sai hoặc đã bị thu hồi (đổi mật khẩu Gmail / tắt xác minh 2 bước?). Chi tiết: ${errorMessage(err)}`
  );
}

/**
 * Sends an email to one or many addresses via Gmail.
 *
 * Never throws for per-recipient delivery failures — inspect `result.failed` /
 * `result.results` instead. It DOES throw for programmer/config errors: missing
 * title, no body, no valid recipients, missing GMAIL_* env vars, or Gmail rejecting
 * the login (wrong/revoked App Password).
 *
 * Note: `ok: true` means Gmail accepted the message for delivery. A non-existent
 * address/domain is usually only discovered later, as a bounce email in the sender's
 * inbox — SMTP can't report it synchronously.
 *
 * Gmail limits: ~500 recipients/day for a normal account; keep lists modest.
 */
export async function sendMail(input: SendMailInput): Promise<SendMailResult> {
  const title = input.title?.trim();
  if (!title) throw new Error("sendMail: thiếu title");
  if (!input.html?.trim() && !input.text?.trim()) {
    throw new Error("sendMail: cần ít nhất html hoặc text");
  }

  const { valid, invalid } = normalizeRecipients(input.to);
  if (valid.length === 0) {
    throw new Error(
      `sendMail: không có địa chỉ email hợp lệ${invalid.length ? ` (không hợp lệ: ${invalid.join(", ")})` : ""}`
    );
  }

  const html = input.html?.trim() ? input.html : textToHtml(input.text!);
  const text = input.text?.trim() ? input.text : htmlToText(input.html!);

  const transporter = getMailTransporter();
  const base = {
    from: getMailSender(),
    subject: title,
    html,
    text,
    ...(input.replyTo ? { replyTo: input.replyTo } : {}),
  };

  const results: SendMailRecipientResult[] = invalid.map((to) => ({
    to,
    ok: false,
    error: "Địa chỉ email không hợp lệ",
  }));

  if (input.mode === "bcc") {
    try {
      const info = await transporter.sendMail({ ...base, to: base.from, bcc: valid });
      const rejected = new Set((info.rejected ?? []).map((a: unknown) => String(a).toLowerCase()));
      for (const to of valid) {
        results.push(
          rejected.has(to.toLowerCase())
            ? { to, ok: false, error: "Bị máy chủ mail từ chối" }
            : { to, ok: true, messageId: info.messageId }
        );
      }
    } catch (err) {
      if (isAuthError(err)) throw authError(err);
      const error = errorMessage(err);
      for (const to of valid) results.push({ to, ok: false, error });
    }
  } else {
    // Small worker pool so a long list doesn't open dozens of SMTP sessions at once.
    const queue = [...valid];
    const worker = async () => {
      for (let to = queue.shift(); to !== undefined; to = queue.shift()) {
        try {
          const info = await transporter.sendMail({ ...base, to });
          results.push({ to, ok: true, messageId: info.messageId });
        } catch (err) {
          if (isAuthError(err)) {
            queue.length = 0; // stop the other workers too
            throw authError(err);
          }
          results.push({ to, ok: false, error: errorMessage(err) });
        }
      }
    };
    await Promise.all(Array.from({ length: Math.min(INDIVIDUAL_CONCURRENCY, valid.length) }, worker));
  }

  // Report in the caller's input order (workers finish in arbitrary order).
  const order = new Map(
    (Array.isArray(input.to) ? input.to : input.to.split(/[,;]/)).map((a, i) => [a.trim().toLowerCase(), i] as const).reverse()
  );
  results.sort((a, b) => (order.get(a.to.toLowerCase()) ?? 0) - (order.get(b.to.toLowerCase()) ?? 0));

  const sent = results.filter((r) => r.ok).length;
  return { sent, failed: results.length - sent, results };
}
