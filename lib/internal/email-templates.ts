import type { SectionKey } from "@/lib/internal/sections";
import { baseUrl } from "@/lib/site";
import { firstName } from "@/lib/first-name";
import {
  EMAIL_SECTION_NAMES,
  bannerFor,
  bannerPath,
  isEmailPipeline,
  type EmailPipeline,
} from "@/lib/internal/email-banners";

/**
 * Emails the team sends applicants from the dashboard, and the paper-theme
 * layout they're sent in. Pure functions: the composer renders the same
 * HTML for its preview that the server sends.
 */

export const DEFAULT_CALL_URL = "https://cal.com/studio1/collab";

export type EmailTemplate = {
  key: string;
  label: string;
  /** Where the composer lists it. */
  group: TemplateGroup;
  subject: string;
  body: string;
  /** Show the "Book a call" button by default. */
  call: boolean;
  /** Offer to move the entry to this status when sending. */
  status?: string;
};

export const TEMPLATE_GROUPS = ["Move forward", "Follow up", "Close out", "Other"] as const;
export type TemplateGroup = (typeof TEMPLATE_GROUPS)[number];

const SIGN_OFF = "{sender}\nStudio1";

const CUSTOM: EmailTemplate = {
  key: "custom",
  label: "Write your own",
  group: "Other",
  subject: "",
  body: `Hi {first_name},\n\n\n\n${SIGN_OFF}`,
  call: false,
};

/**
 * The emails the team sends by hand, per pipeline. {first_name}, {program}
 * (the role, cohort or event) and {sender} are filled in; everything stays
 * editable in the composer before it goes. Templates with `call` say "the
 * button below", which is where renderEmail puts the Book a call button.
 */
export const EMAIL_TEMPLATES: Partial<Record<SectionKey, EmailTemplate[]>> = {
  jobs: [
    {
      key: "shortlist",
      label: "Selected for next round",
      group: "Move forward",
      subject: "You're through to the next round for {program}",
      body: `Hi {first_name},\n\nGood news: your application for the {program} role stood out, and you're on our shortlist.\n\nWe're finishing the last few reviews now. We'll be in touch within a week with the next step, which is usually a short call with the team.\n\nThanks for your patience.\n\n${SIGN_OFF}`,
      call: false,
      status: "shortlisted",
    },
    {
      key: "invite",
      label: "Book a call",
      group: "Move forward",
      subject: "Next step for the {program} role at Studio1",
      body: `Hi {first_name},\n\nThanks for applying for the {program} role at Studio1. We enjoyed reading your application and would like to talk.\n\nPick a time that suits you with the button below. The call takes about 30 minutes.\n\nIf none of the times work, reply to this email and we'll find another.\n\n${SIGN_OFF}`,
      call: true,
      status: "interviewing",
    },
    {
      key: "next-round",
      label: "Book the next round",
      group: "Move forward",
      subject: "Next round for the {program} role",
      body: `Hi {first_name},\n\nThanks for the conversation. We'd like to take things further.\n\nThe next round is a 45-minute call with our founders. We'll talk through how you'd approach the first few months in the {program} role and answer your questions about Studio1. Pick a time with the button below.\n\n${SIGN_OFF}`,
      call: true,
      status: "interviewing",
    },
    {
      key: "offer",
      label: "Offer",
      group: "Move forward",
      subject: "An offer to join Studio1 as {program}",
      body: `Hi {first_name},\n\nWe'd love you to join Studio1 as our {program}.\n\nWe'll send the written offer separately. Book a call with the button below and we'll go through it together and answer anything you'd like to know.\n\nWe're excited about working with you.\n\n${SIGN_OFF}`,
      call: true,
      status: "offer",
    },
    {
      key: "welcome",
      label: "Welcome aboard",
      group: "Move forward",
      subject: "Welcome to Studio1",
      body: `Hi {first_name},\n\nWelcome to Studio1! We're really glad you're joining us as {program}.\n\nBefore your start date we'll send:\n\n- your first-week plan\n- access to the tools we use\n- who you'll be working with day to day\n\nIf anything comes up before then, reply to this email.\n\n${SIGN_OFF}`,
      call: false,
      status: "hired",
    },
    {
      key: "remind",
      label: "Reminder to book",
      group: "Follow up",
      subject: "Still keen to talk about {program}?",
      body: `Hi {first_name},\n\nJust checking in: we'd still love to talk with you about the {program} role.\n\nIf you're still interested, pick a time with the button below. If your plans have changed, a quick reply lets us know.\n\n${SIGN_OFF}`,
      call: true,
    },
    {
      key: "more-info",
      label: "Need more info",
      group: "Follow up",
      subject: "A few questions about your application for {program}",
      body: `Hi {first_name},\n\nThanks for applying for the {program} role. Before we take your application further, could you reply with:\n\n- a link to a piece of work you led from start to finish\n- the results it got, in numbers if you have them\n- when you could start\n\n${SIGN_OFF}`,
      call: false,
    },
    {
      key: "decline",
      label: "Rejected",
      group: "Close out",
      subject: "Your application for {program} at Studio1",
      body: `Hi {first_name},\n\nThank you for applying for the {program} role and for the time you put into it.\n\nWe've decided not to move forward with your application this time. We had many strong applicants, and this isn't a judgement on your future work.\n\nWe'll let you know when new roles open up.\n\n${SIGN_OFF}`,
      call: false,
      status: "rejected",
    },
    {
      key: "decline-after-call",
      label: "Rejected after a call",
      group: "Close out",
      subject: "Your application for {program}",
      body: `Hi {first_name},\n\nThank you for taking the time to talk with us about the {program} role. We enjoyed the conversation.\n\nAfter a lot of thought, we've decided to go with someone whose experience is closer to what we need right now. It was a hard call.\n\nWe'd be glad to stay in touch, and we'll let you know when a role that fits comes up.\n\n${SIGN_OFF}`,
      call: false,
      status: "rejected",
    },
    CUSTOM,
  ],
  cohort: [
    {
      key: "shortlist",
      label: "Selected for a chat",
      group: "Move forward",
      subject: "Next step for the Studio1 {program}",
      body: `Hi {first_name},\n\nThanks for applying to the Studio1 {program}. Your application stood out, and we'd like a short chat before we confirm places.\n\nPick a time with the button below. It takes about 20 minutes.\n\n${SIGN_OFF}`,
      call: true,
      status: "shortlisted",
    },
    {
      key: "accept",
      label: "Approved",
      group: "Move forward",
      subject: "You're in: Studio1 {program}",
      body: `Hi {first_name},\n\nGood news: you're in the Studio1 {program}.\n\nBook a short onboarding call with the button below and we'll walk you through the first week, the projects and how we work together.\n\nWelcome aboard.\n\n${SIGN_OFF}`,
      call: true,
      status: "accepted",
    },
    {
      key: "remind",
      label: "Reminder to book",
      group: "Follow up",
      subject: "Still keen on the Studio1 {program}?",
      body: `Hi {first_name},\n\nJust checking in: we'd still love a quick chat about the Studio1 {program}.\n\nPick a time with the button below, or reply if your plans have changed.\n\n${SIGN_OFF}`,
      call: true,
    },
    {
      key: "waitlist",
      label: "Waitlisted",
      group: "Close out",
      subject: "You're on the waitlist for the Studio1 {program}",
      body: `Hi {first_name},\n\nThanks for applying to the Studio1 {program}. We had more strong applicants than places, so you're on our waitlist for now.\n\nIf a place opens up, you'll be the first to hear.\n\n${SIGN_OFF}`,
      call: false,
      status: "waitlisted",
    },
    {
      key: "decline",
      label: "Rejected",
      group: "Close out",
      subject: "Your application to the Studio1 {program}",
      body: `Hi {first_name},\n\nThank you for applying to the Studio1 {program}.\n\nWe couldn't offer you a place this time. We had far more strong applicants than spots, and we'd love to see you apply again.\n\n${SIGN_OFF}`,
      call: false,
      status: "rejected",
    },
    CUSTOM,
  ],
  hackathons: [
    {
      key: "confirm",
      label: "Approved",
      group: "Move forward",
      subject: "You're in for {program}",
      body: `Hi {first_name},\n\nYou're confirmed for {program}. We'll send the schedule, the brief and the joining details before the start.\n\nIf you have questions, reply to this email.\n\n${SIGN_OFF}`,
      call: false,
      status: "confirmed",
    },
    {
      key: "off-waitlist",
      label: "Approved from waitlist",
      group: "Move forward",
      subject: "A spot opened up: you're in for {program}",
      body: `Hi {first_name},\n\nGood news: a spot opened up and you're now confirmed for {program}.\n\nWe'll send the schedule, the brief and the joining details before the start. If you can no longer take part, reply so we can offer the spot to someone else.\n\n${SIGN_OFF}`,
      call: false,
      status: "confirmed",
    },
    {
      key: "reminder",
      label: "Event reminder",
      group: "Follow up",
      subject: "{program} starts soon",
      body: `Hi {first_name},\n\n{program} starts soon. Before then, please have ready:\n\n- your GitHub account, for submitting your project\n- your team, if you're joining one\n- an idea of the track you'll build for\n\nIf you can no longer take part, reply so we can give your spot to someone on the waitlist.\n\n${SIGN_OFF}`,
      call: false,
    },
    {
      key: "waitlist",
      label: "Waitlisted",
      group: "Close out",
      subject: "You're on the waitlist for {program}",
      body: `Hi {first_name},\n\nThanks for registering for {program}. We're at capacity, so you're on the waitlist for now. We'll email you as soon as a spot opens up.\n\n${SIGN_OFF}`,
      call: false,
      status: "waitlisted",
    },
    {
      key: "decline",
      label: "Rejected",
      group: "Close out",
      subject: "Your registration for {program}",
      body: `Hi {first_name},\n\nThanks for registering for {program}. We couldn't offer you a spot this time: we had far more registrations than places.\n\nWe run events regularly, and we'd love to see you at the next one.\n\n${SIGN_OFF}`,
      call: false,
      status: "rejected",
    },
    CUSTOM,
  ],
};

/** The forms that send an automatic confirmation when someone submits. */
export type FormKey = "jobs" | "hackathons" | "cohort";

/** `sent_by` in internal_email_log for emails nobody sent by hand. */
export const AUTOMATIC_SENDER = "automatic";

/** One light "while you wait" line per form: applicants, not clients. */
const WHILE_YOU_WAIT: Record<"jobs" | "cohort" | "hackathons", string> = {
  jobs: `While you wait, have a read of [our blog](${baseUrl}/blog), or see our other [open roles](${baseUrl}/careers).`,
  cohort: `While you wait, have a read of [our blog](${baseUrl}/blog), or pick up an issue in [our open-source projects](${baseUrl}/oss).`,
  hackathons: `While you wait, you could warm up on [our open-source projects](${baseUrl}/oss).`,
};

/**
 * The email each form sends as soon as it saves an entry (lib/confirmation-email.ts).
 * Not in the dashboard composer: nobody picks these, they go out on their own.
 */
export const CONFIRMATION_EMAILS: Record<FormKey, { subject: string; body: string }> = {
  jobs: {
    subject: "We've received your application for {program}",
    body: `Hi {first_name},\n\nThanks a lot for applying for the {program} role at Studio1. One of our team members will review your application shortly, and we'll get back to you as soon as we can.\n\n${WHILE_YOU_WAIT.jobs}\n\nIf you have a question before then, reply to this email.\n\nThe Studio1 team`,
  },
  cohort: {
    subject: "We've received your application to the Studio1 {program}",
    body: `Hi {first_name},\n\nThanks a lot for applying to the Studio1 {program}. One of our team members will review your application shortly, and we'll email you as soon as we've decided.\n\n${WHILE_YOU_WAIT.cohort}\n\nIf you have a question before then, reply to this email.\n\nThe Studio1 team`,
  },
  hackathons: {
    subject: "We've received your registration for {program}",
    body: `Hi {first_name},\n\nThanks a lot for registering for {program}. One of our team members will review your registration shortly, and we'll email you to confirm your spot. The schedule, the brief and the joining details follow before the start.\n\n${WHILE_YOU_WAIT.hackathons}\n\nIf you have a question before then, reply to this email.\n\nThe Studio1 team`,
  },
};

export type EmailVars = { first_name: string; program: string; sender: string };

/** Sample details the template previews and test sends are filled with. */
export const SAMPLE_VARS: Record<FormKey, { first_name: string; program: string }> = {
  jobs: { first_name: "Priya", program: "Growth Lead" },
  cohort: { first_name: "Priya", program: "DevRel Cohort 01" },
  hackathons: { first_name: "Priya", program: "the Studio1 Hackathon" },
};

/** A pipeline's emails as the templates page lists them: the automatic confirmation first. */
export function templatesFor(pipeline: FormKey): (Omit<EmailTemplate, "group"> & { group: string; automatic?: boolean })[] {
  const confirmation = CONFIRMATION_EMAILS[pipeline];
  return [
    {
      key: "confirmation",
      label: "We've received it",
      group: "Automatic",
      subject: confirmation.subject,
      body: confirmation.body,
      call: false,
      automatic: true,
    },
    ...(EMAIL_TEMPLATES[pipeline] ?? []),
  ];
}

/**
 * Fills {first_name}, {program} and {sender}. Square brackets are dropped
 * from the values, so a stored name can never form a [label](url) link.
 */
export function fillTemplate(text: string, vars: EmailVars) {
  return text.replace(/\{(first_name|program|sender)\}/g, (_, key: keyof EmailVars) =>
    vars[key].replace(/[[\]]/g, ""),
  );
}

/**
 * The name a teammate signs emails with, from their address:
 * "priya.sharma@studio1hq.com" → "Priya". The one rule for the composer,
 * the bulk dialog, the templates page and the server, so a preview and the
 * email that goes out always agree.
 */
export function senderName(staffEmail: string) {
  const name = firstName(staffEmail.split("@")[0].replace(/[._+-]+/g, " "));
  return name === "there" ? "Studio1" : name;
}

/**
 * The template a dashboard email says it was written from, checked against
 * the pipeline's own list: the key picks the header image and is saved in
 * the email log, so it never comes straight from the browser. Nothing sent
 * means "custom"; an unknown pipeline or key gives null.
 */
export function composerTemplate(pipeline: unknown, key: unknown): { pipeline: EmailPipeline; key: string } | null {
  if (!isEmailPipeline(pipeline)) return null;
  const wanted = key === undefined || key === null ? "custom" : key;
  const found = (EMAIL_TEMPLATES[pipeline] ?? []).find((template) => template.key === wanted);
  return found ? { pipeline, key: found.key } : null;
}

/** The footer line saying why someone got the email. */
export function reasonFor(form: string, program: string) {
  return `You're getting this because you ${form === "hackathons" ? "registered for" : "applied for"} ${program} at Studio1.`;
}

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);

/** Studio1 Sans where the mail app loads web fonts (Apple Mail, iOS), else the system face. */
const FONT = "'Studio1 Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif";

/* Paper palette (lib/paper.ts), spelled out for email clients. */
const INK = "#141414";
const BODY = "#38342f";
const MUTED = "#7d766d";
const FAINT = "#a59e94";
const PAPER = "#f4efe7";
const CELL = "#fbf9f5";
const HAIRLINE = "#e6e0d6";
const PRINT = "#f97316";

/** [label](https://…) links, the only markup a body supports besides "- " lists. */
const LINK = /\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)/g;

/**
 * For text that came from outside (an emailed invoice's subject, a comment,
 * a post title): takes the [ ] ( ) out so it can't turn into a link in a
 * Studio1 email.
 */
export function withoutLinks(text: string) {
  return text.replace(/[\[\]()]/g, " ").replace(/[ \t]{2,}/g, " ").trim();
}

function inlineHtml(text: string) {
  let html = "";
  let last = 0;
  for (const match of text.matchAll(LINK)) {
    html += escapeHtml(text.slice(last, match.index));
    html += `<a href="${escapeHtml(match[2])}" target="_blank" style="color:#141414;font-weight:600;text-decoration:underline;text-decoration-color:#f97316;text-underline-offset:3px;">${escapeHtml(match[1])}</a>`;
    last = match.index + match[0].length;
  }
  return html + escapeHtml(text.slice(last));
}

/**
 * The paper layout, as on studio1hq.com: grainy cream paper, an "01 — Careers"
 * index line, the paper header image (lib/internal/email-banners.ts), then
 * the message on an off-white card with a hairline ring and 6px corners,
 * numbered bullets with print-orange squares, and the ink pill button with
 * the orange arrow. Tables and inline styles, for email clients.
 *
 * Bodies are plain text: blank lines split paragraphs, a paragraph whose
 * lines all start with "- " is a list, and [label](https://…) is a link.
 */
export function renderEmail({
  body,
  call,
  reason,
  unsubscribeUrl,
  banner,
  program,
  siteUrl = "https://www.studio1hq.com",
  assetBase,
  section: sectionName,
  hideBanner = false,
}: {
  body: string;
  call?: { label: string; url: string } | null;
  reason: string;
  unsubscribeUrl?: string | null;
  /** Which header to show; without it, a "A note from Studio1." header. */
  banner?: { pipeline: EmailPipeline; template: string };
  /** The role, cohort or event, shown on the index line. */
  program?: string;
  siteUrl?: string;
  /** Where images and fonts load from; "" in dashboard previews (this server). */
  assetBase?: string;
  /** The index line's name ("01 — Payroll"), for emails outside the pipelines. */
  section?: string;
  /** Leaves out the header image: team and payment emails have none. */
  hideBanner?: boolean;
}) {
  const assets = assetBase ?? siteUrl;
  const pipeline = banner?.pipeline ?? "jobs";
  const header = bannerFor(pipeline, banner?.template ?? "custom");
  const section = sectionName ?? (banner ? EMAIL_SECTION_NAMES[pipeline] : "Studio1");

  const blocks = body.trim().split(/\n{2,}/);
  const html_blocks = blocks.map((block) => {
    const lines = block.split("\n");
    if (!lines.every((line) => line.startsWith("- "))) {
      return `<p style="margin:0 0 18px;font:15.5px/1.7 ${FONT};color:${BODY};">${lines.map(inlineHtml).join("<br>")}</p>`;
    }
    const items = lines
      .map(
        (line, index) =>
          `<tr><td width="30" valign="top" style="padding:0 0 12px;font:500 12px/26px ${FONT};color:${FAINT};">${String(index + 1).padStart(2, "0")}</td><td width="20" valign="top" style="padding:9px 0 12px;"><div style="width:8px;height:8px;background:${PRINT};font-size:0;line-height:0;">&nbsp;</div></td><td valign="top" style="padding:0 0 12px;font:15.5px/1.7 ${FONT};color:${BODY};">${inlineHtml(line.slice(2))}</td></tr>`,
      )
      .join("");
    return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:2px 0 10px;">${items}</table>`;
  });

  // The button goes after the paragraph that mentions it ("…with the button
  // below"), else after the second paragraph, where the ask usually is.
  const mention = blocks.findIndex((block) => /\bbutton\b/i.test(block));
  const buttonAt = mention >= 0 ? mention + 1 : Math.min(2, html_blocks.length);
  const button = call
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:4px 0 24px;"><tr><td style="border-radius:999px;background:${INK};">
<a href="${escapeHtml(call.url)}" target="_blank" style="display:inline-block;padding:6px 6px 6px 22px;font:500 15px/36px ${FONT};color:${PAPER};text-decoration:none;border-radius:999px;">${escapeHtml(call.label)}&nbsp;&nbsp;&nbsp;<span style="display:inline-block;width:36px;height:36px;border-radius:999px;background:${PRINT};color:#ffffff;text-align:center;font:600 17px/36px ${FONT};vertical-align:middle;">&#8599;</span></a>
</td></tr></table>`
    : "";
  const content = html_blocks
    .map((html, index) => (index === buttonAt - 1 ? html + button : html))
    .join("");

  const link = (href: string, label: string) =>
    `<a href="${escapeHtml(href)}" style="color:${MUTED};text-decoration:underline;text-decoration-color:${HAIRLINE};">${label}</a>`;
  const footer = [
    escapeHtml(reason),
    unsubscribeUrl ? link(unsubscribeUrl, "Unsubscribe from Studio1 updates") : "",
  ]
    .filter(Boolean)
    .join(" ");

  const fonts = `@font-face{font-family:'Studio1 Sans';font-weight:400;src:url('${assets}/brand/design-system/fonts/Studio1Sans-Regular.woff2') format('woff2');}@font-face{font-family:'Studio1 Sans';font-weight:500;src:url('${assets}/brand/design-system/fonts/Studio1Sans-Medium.woff2') format('woff2');}`;

  const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light only"><meta name="supported-color-schemes" content="light"><title>${escapeHtml(hideBanner ? section : header.banner.title)}</title><style>${fonts}a{color:${INK};}</style></head>
<body style="margin:0;padding:0;background:${PAPER};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" background="${escapeHtml(assets)}/email/grain.png" style="background:${PAPER} url('${escapeHtml(assets)}/email/grain.png') repeat;"><tr><td align="center" style="padding:32px 12px 40px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;">
<tr><td style="padding:0 2px 12px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
<td style="font:500 13px/20px ${FONT};color:${INK};"><span style="color:${PRINT};">01</span>&nbsp;&nbsp;<span style="color:${FAINT};">&mdash;</span>&nbsp;&nbsp;${escapeHtml(section)}</td>
<td align="right" style="font:13px/20px ${FONT};color:${MUTED};">${escapeHtml(program ?? "studio1hq.com")}</td>
</tr></table>
</td></tr>
${hideBanner ? "" : `<tr><td style="padding:0 0 8px;"><a href="${escapeHtml(siteUrl)}" style="text-decoration:none;"><img src="${escapeHtml(assets)}${bannerPath(header.key)}" width="600" alt="${escapeHtml(header.banner.title)}" style="display:block;width:100%;max-width:600px;height:auto;border:1px solid ${HAIRLINE};border-radius:6px;background:${PAPER};"></a></td></tr>`}
<tr><td style="background:${CELL};border:1px solid ${HAIRLINE};border-radius:6px;padding:34px 36px 18px;">
${content}
</td></tr>
<tr><td style="padding:16px 4px 0;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
<td valign="top" style="font:12px/1.7 ${FONT};color:${MUTED};">${footer}</td>
<td valign="top" align="right" width="120" style="font:500 12px/1.7 ${FONT};">${link(siteUrl, "studio1hq.com")}</td>
</tr></table>
</td></tr>
</table>
</td></tr></table>
</body></html>`;

  const text = [
    body.trim().replace(LINK, "$1 ($2)"),
    call ? `${call.label}: ${call.url}` : "",
    "--",
    reason,
    unsubscribeUrl ? `Unsubscribe from Studio1 updates: ${unsubscribeUrl}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  return { html, text };
}
