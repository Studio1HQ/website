import "server-only";
/**
 * Sends email through Resend's API (https://resend.com): the dashboard's
 * applicant emails and the forms' automatic confirmations. No SMTP, no mail
 * library: one API key.
 *
 * Each program sends from its own subdomain, verified separately in Resend,
 * so spam complaints about one (say a hackathon announcement) never drag
 * down delivery for the others. studio1hq.com itself is the fallback: a
 * program with no sender of its own uses it, and so does any email whose
 * subdomain Resend hasn't verified yet. Replies go to a real studio1hq.com
 * inbox (Zoho), because the sending subdomains don't receive mail.
 *
 * Env: RESEND_API_KEY. Optional overrides: EMAIL_FROM (the fallback sender,
 * default "Studio1 <contact@studio1hq.com>") and EMAIL_FROM_JOBS,
 * EMAIL_FROM_HACKATHONS, EMAIL_FROM_COHORT. With no key,
 * isMailerConfigured() is false: the composer offers "Open in mail app" and
 * confirmations are skipped.
 */

/** The program an email is about; each can send from its own domain. */
export type MailStream = "jobs" | "hackathons" | "cohort";

const DEFAULT_FROM = "Studio1 <contact@studio1hq.com>";

const STREAMS: Record<MailStream, { env: string; from?: string; replyTo: string }> = {
  jobs: {
    env: "EMAIL_FROM_JOBS",
    from: "Studio1 Careers <team@careers.studio1hq.com>",
    replyTo: "careers@studio1hq.com",
  },
  hackathons: {
    env: "EMAIL_FROM_HACKATHONS",
    from: "Studio1 Hackathons <team@hackathons.studio1hq.com>",
    replyTo: "contact@studio1hq.com",
  },
  // No subdomain of its own (the Resend plan holds 3 domains): sends from
  // studio1hq.com.
  cohort: { env: "EMAIL_FROM_COHORT", replyTo: "contact@studio1hq.com" },
};

function fallbackFrom() {
  return process.env.EMAIL_FROM || DEFAULT_FROM;
}

function senderFor(stream?: MailStream) {
  if (!stream) return fallbackFrom();
  const config = STREAMS[stream];
  return process.env[config.env] || config.from || fallbackFrom();
}

export function isMailerConfigured() {
  return Boolean(process.env.RESEND_API_KEY);
}

export type MailMessage = {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
  headers?: Record<string, string>;
  /** Files to attach, e.g. a payslip PDF. Not for batches. */
  attachments?: { filename: string; content: Uint8Array | Buffer; contentType?: string }[];
};

export type SendOptions = {
  /** ISO 8601 time to send at instead of now; Resend holds it up to 30 days. */
  scheduledAt?: string;
  /**
   * Stops a repeat of the same request sending the email twice: Resend
   * answers a key it has seen in the last 24 hours with the first result.
   */
  idempotencyKey?: string;
};

function toResend(message: MailMessage, from: string, stream?: MailStream, options: SendOptions = {}) {
  const replyTo = message.replyTo || (stream ? STREAMS[stream].replyTo : undefined);
  return {
    from,
    to: [message.to],
    subject: message.subject,
    html: message.html,
    text: message.text,
    ...(replyTo ? { reply_to: replyTo } : {}),
    ...(message.headers && Object.keys(message.headers).length ? { headers: message.headers } : {}),
    ...(options.scheduledAt ? { scheduled_at: options.scheduledAt } : {}),
    ...(message.attachments?.length
      ? {
          attachments: message.attachments.map((file) => ({
            filename: file.filename,
            content: Buffer.from(file.content).toString("base64"),
            ...(file.contentType ? { content_type: file.contentType } : {}),
          })),
        }
      : {}),
  };
}

async function postToResend(path: string, body: unknown, timeoutMs: number, idempotencyKey?: string) {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY isn't set");
  const response = await fetch(`https://api.resend.com${path}`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${key}`,
      "content-type": "application/json",
      ...(idempotencyKey ? { "idempotency-key": idempotencyKey } : {}),
    },
    body: JSON.stringify(body),
    cache: "no-store",
    signal: AbortSignal.timeout(timeoutMs),
  });
  const raw = await response.text().catch(() => "");
  let json: unknown = null;
  try {
    json = raw ? JSON.parse(raw) : null;
  } catch {
    json = null;
  }
  return { ok: response.ok, status: response.status, detail: response.ok ? "" : raw, json };
}

/**
 * Sends from the program's own address, and once more from studio1hq.com if
 * Resend refuses that address because its domain isn't verified yet (a 403
 * that says so). Nothing was sent by the refused request, so the retry can't
 * double up; it gets its own idempotency key because its body differs.
 */
async function sendWithFallback(
  path: string,
  build: (from: string) => unknown,
  options: { stream?: MailStream; timeoutMs: number; idempotencyKey?: string },
) {
  const from = senderFor(options.stream);
  let result = await postToResend(path, build(from), options.timeoutMs, options.idempotencyKey);
  const fallback = fallbackFrom();
  if (!result.ok && result.status === 403 && /not verified/i.test(result.detail) && from !== fallback) {
    console.warn(`[mailer] Resend hasn't verified the domain of ${from} yet; sending from ${fallback}`);
    const retryKey = options.idempotencyKey ? `${options.idempotencyKey}-fallback` : undefined;
    result = await postToResend(path, build(fallback), options.timeoutMs, retryKey);
  }
  if (!result.ok) throw new Error(`Resend ${result.status}: ${result.detail.slice(0, 300)}`);
  return result.json;
}

/** Sends one email; returns Resend's id for it (null if Resend left it out). */
export async function sendMail(message: MailMessage, stream?: MailStream, options: SendOptions = {}) {
  const json = (await sendWithFallback("/emails", (from) => toResend(message, from, stream, options), {
    stream,
    timeoutMs: 15_000,
    idempotencyKey: options.idempotencyKey,
  })) as { id?: unknown } | null;
  return { id: typeof json?.id === "string" ? json.id : null };
}

/**
 * Sends up to 100 emails in one request (Resend's batch endpoint), each with
 * its own recipient, text and headers. The idempotency key stops a retried
 * request from sending the batch twice. Returns Resend's ids in the same
 * order as `messages`.
 */
export async function sendBatch(
  messages: MailMessage[],
  idempotencyKey: string,
  stream?: MailStream,
  options: SendOptions = {},
): Promise<(string | null)[]> {
  if (!process.env.RESEND_API_KEY) throw new Error("RESEND_API_KEY isn't set");
  if (messages.length === 0) return [];
  if (messages.length > 100) throw new Error("A batch holds at most 100 emails");
  const json = (await sendWithFallback(
    "/emails/batch",
    (from) => messages.map((message) => toResend(message, from, stream, options)),
    { stream, timeoutMs: 30_000, idempotencyKey },
  )) as { data?: { id?: unknown }[] } | null;
  return messages.map((_, index) => {
    const id = json?.data?.[index]?.id;
    return typeof id === "string" ? id : null;
  });
}

/** Cancels a scheduled email before it goes. Resend can't reschedule it after. */
export async function cancelScheduled(resendId: string) {
  const result = await postToResend(`/emails/${encodeURIComponent(resendId)}/cancel`, {}, 15_000);
  if (!result.ok) throw new Error(`Resend ${result.status}: ${result.detail.slice(0, 300)}`);
}
