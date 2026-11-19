/**
 * Job applications: field limits and one validator shared by the careers
 * form and the /api/careers/apply route.
 */

import {
  EMPTY_CONSENT,
  consentErrors,
  readConsent,
  type ContactConsentValues,
} from "@/lib/contact-consent";
import { isEmailAddress, nameError, placeError } from "@/lib/form-checks";
import {
  answerErrors,
  readAnswers,
  withProtocol,
  type AnswerField,
  type FormQuestion,
} from "@/lib/form-questions";

export const START_OPTIONS = [
  "Immediately",
  "Within 2 weeks",
  "Within a month",
  "More than a month",
] as const;

export const APPLICATION_LIMITS = {
  why: { min: 80, max: 1500 },
  workLinks: 8,
  /** Stays under the ~4.5 MB request cap on serverless hosts. */
  resumeBytes: 4 * 1024 * 1024,
} as const;

/**
 * What a role's pay is quoted per. Most roles ask for a monthly figure; a
 * role paid per article says `pay: article` in its brief.
 */
export const PAY_BASES = ["month", "article"] as const;
export type PayBasis = (typeof PAY_BASES)[number];

/** Expected pay in rupees, per basis: anything outside is a typo. */
export const PAY_LIMITS = {
  month: { min: 1_000, max: 50_00_000 },
  article: { min: 100, max: 5_00_000 },
} as const;

const RUPEES = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

/** "₹60,000 a month" or "₹8,000 per article". */
export function describePay(amount: number, basis: PayBasis) {
  return `${RUPEES.format(amount)} ${basis === "article" ? "per article" : "a month"}`;
}

/** The pay field's label, worded for the kind of role. */
export function payLabel(jobType: string, basis: PayBasis) {
  if (basis === "article") return "Expected pay per article (INR)";
  const type = jobType.toLowerCase();
  const word =
    type.includes("intern") && !type.includes("contract")
      ? "stipend"
      : type.includes("full")
        ? "salary"
        : "pay";
  return `Expected monthly ${word} (INR)`;
}

type ReadRupees =
  | { ok: true; amount: number }
  | { ok: false; reason: "empty" | "range" | "unreadable" }
  | { ok: false; reason: "yearly"; amount: number | null };

const SCALE: Record<string, number> = {
  k: 1_000,
  l: 1_00_000,
  lakh: 1_00_000,
  lakhs: 1_00_000,
  lac: 1_00_000,
  lacs: 1_00_000,
  cr: 1_00_00_000,
  crore: 1_00_00_000,
};
const FIGURE = /^(\d+(?:\.\d+)?)(k|l|lakhs?|lacs?|cr|crore)?$/;
/** Currency and period words after the figure: "rupees/month", "lpa", "ctc". */
const UNIT_SUFFIX =
  /(inr|rupees?|rs\.?|(\/|per|a)?(month(ly)?|mo|annum|year|yr)|p\.?[am]\.?|lpa|annual(ly)?|ctc)$/;

/**
 * Rupees as people type them: "60000", "60,000", "₹60k", "1.2L", "1.5 lakh",
 * "Rs. 45,000 per month". A yearly figure ("12 LPA") or a range comes back
 * as such, so the form can ask for one monthly number instead.
 */
export function readRupees(value: string): ReadRupees {
  const raw = value
    .toLowerCase()
    .replace(/[₹,\s]/g, "")
    .replace(/^(rs\.?|inr)/, "");
  if (!raw) return { ok: false, reason: "empty" };
  if (/[\d.](k|l|lakhs?|lacs?)?(-|–|—|to)[\d.]/.test(raw))
    return { ok: false, reason: "range" };

  let figure = raw;
  for (
    let peeled = figure.replace(UNIT_SUFFIX, "");
    peeled !== figure;
    peeled = figure.replace(UNIT_SUFFIX, "")
  ) {
    figure = peeled;
  }
  const match = FIGURE.exec(figure);
  const scale = match?.[2] ? SCALE[match[2]] : 1;

  if (/lpa|annum|annual|year|yr|ctc|p\.?a\.?$/.test(raw)) {
    // "12 LPA" is 12 lakh a year; a bare "1200000 per annum" is rupees.
    const yearly = !match?.[2] && raw.includes("lpa") ? 1_00_000 : scale;
    return {
      ok: false,
      reason: "yearly",
      amount: match ? Math.round((Number(match[1]) * yearly) / 12) : null,
    };
  }
  if (!match) return { ok: false, reason: "unreadable" };
  const amount = Math.round(Number(match[1]) * scale);
  return amount > 0
    ? { ok: true, amount }
    : { ok: false, reason: "unreadable" };
}

/** Checks the expected pay; returns the amount in rupees or an error. */
export function checkPay(
  value: string,
  basis: PayBasis,
): { ok: true; amount: number } | { ok: false; error: string } {
  const read = readRupees(value);
  const per = basis === "article" ? "per article" : "a month";
  if (!read.ok) {
    switch (read.reason) {
      case "empty":
        return { ok: false, error: "Add the pay you expect." };
      case "range":
        return { ok: false, error: "Give one number, not a range." };
      case "yearly":
        return {
          ok: false,
          error:
            basis === "article"
              ? "Give the amount per article."
              : read.amount
                ? `Give a monthly amount: that's about ${describePay(read.amount, "month")}.`
                : "Give a monthly amount in rupees.",
        };
      default:
        return {
          ok: false,
          error: "Enter an amount in rupees, like 40000 or 40k.",
        };
    }
  }
  const { min, max } = PAY_LIMITS[basis];
  if (read.amount < min)
    return {
      ok: false,
      error: `That's under ${describePay(min, basis)}. Enter the full amount in rupees.`,
    };
  if (read.amount > max)
    return {
      ok: false,
      error: `That looks too high. Enter the amount ${per}, in rupees.`,
    };
  return { ok: true, amount: read.amount };
}

export type ApplicationValues = ContactConsentValues & {
  name: string;
  email: string;
  location: string;
  linkedin: string;
  portfolio: string;
  /** One link per line. */
  workLinks: string;
  /** The generic "plan" link, for roles without their own questions. */
  planLink: string;
  /** Answers to the role's own questions, by question id. */
  answers: Record<string, string>;
  why: string;
  start: string;
  /** As typed ("60k", "1.2L"); read with checkPay. */
  expectedPay: string;
  /** Honeypot: hidden from people, filled in by bots. */
  website: string;
};

export type ApplicationField = keyof ApplicationValues | "resume" | AnswerField;
export type ApplicationErrors = Partial<Record<ApplicationField, string>>;

export const EMPTY_APPLICATION: ApplicationValues = {
  name: "",
  email: "",
  location: "",
  linkedin: "",
  portfolio: "",
  workLinks: "",
  planLink: "",
  answers: {},
  why: "",
  start: "",
  expectedPay: "",
  ...EMPTY_CONSENT,
  website: "",
};

function isUrl(value: string) {
  if (value.length > 300) return false;
  try {
    const url = new URL(value);
    return (
      (url.protocol === "https:" || url.protocol === "http:") &&
      url.hostname.includes(".")
    );
  } catch {
    return false;
  }
}

export function splitLinks(value: string) {
  return value
    .split(/[\s,]+/)
    .map(withProtocol)
    .filter(Boolean);
}

const text = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";

/**
 * Checks an application. A role with its own `questions` asks those instead
 * of the generic plan link; answers to anything else are dropped. Expected
 * pay is read per the role's pay basis and comes back in rupees.
 */
export function validateApplication(
  input: Partial<Record<keyof ApplicationValues, unknown>>,
  questions: readonly FormQuestion[] = [],
  payBasis: PayBasis = "month",
):
  | { ok: true; values: ApplicationValues; links: string[]; pay: number }
  | { ok: false; errors: ApplicationErrors } {
  const values: ApplicationValues = {
    name: text(input.name),
    email: text(input.email).toLowerCase(),
    location: text(input.location),
    linkedin: withProtocol(text(input.linkedin)),
    portfolio: withProtocol(text(input.portfolio)),
    workLinks: text(input.workLinks),
    planLink: questions.length ? "" : withProtocol(text(input.planLink)),
    answers: readAnswers(questions, input.answers),
    why: text(input.why),
    start: text(input.start),
    expectedPay: text(input.expectedPay).slice(0, 60),
    ...readConsent(input),
    website: text(input.website),
  };
  const links = splitLinks(values.workLinks);
  const pay = checkPay(values.expectedPay, payBasis);

  const errors: ApplicationErrors = {};
  const name = nameError(values.name);
  if (name) errors.name = name;
  if (!isEmailAddress(values.email))
    errors.email = "Enter a valid email address.";
  const location = placeError(values.location, "Enter your city and country.");
  if (location) errors.location = location;
  if (values.linkedin && !isUrl(values.linkedin))
    errors.linkedin = "Enter a full link to your profile.";
  if (values.portfolio && !isUrl(values.portfolio))
    errors.portfolio = "Enter a full link.";
  if (links.length === 0)
    errors.workLinks = "Add at least one link to your work.";
  else if (links.length > APPLICATION_LIMITS.workLinks)
    errors.workLinks = `Pick your best ${APPLICATION_LIMITS.workLinks} links.`;
  else if (!links.every(isUrl))
    errors.workLinks = "One full link per line, like github.com/you/project.";
  if (questions.length)
    Object.assign(errors, answerErrors(questions, values.answers));
  else if (!isUrl(values.planLink))
    errors.planLink =
      "Add a link to your plan (Google Doc, Notion, or GitHub).";
  if (values.why.length < APPLICATION_LIMITS.why.min)
    errors.why = `Tell us a bit more (at least ${APPLICATION_LIMITS.why.min} characters).`;
  else if (values.why.length > APPLICATION_LIMITS.why.max)
    errors.why = `Keep it under ${APPLICATION_LIMITS.why.max} characters.`;
  if (!(START_OPTIONS as readonly string[]).includes(values.start))
    errors.start = "Pick when you could start.";
  if (!pay.ok) errors.expectedPay = pay.error;
  Object.assign(errors, consentErrors(values));

  return Object.keys(errors).length > 0 || !pay.ok
    ? { ok: false, errors }
    : { ok: true, values, links, pay: pay.amount };
}

/** Checks the résumé file; returns an error message or null. */
export function resumeError(
  file: { size: number; type: string; name: string } | null,
) {
  if (!file || file.size === 0) return "Attach your résumé as a PDF.";
  const isPdf =
    file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  if (!isPdf) return "Your résumé needs to be a PDF.";
  if (file.size > APPLICATION_LIMITS.resumeBytes)
    return "Keep the PDF under 4 MB.";
  return null;
}

/** Mirrors the careers page: anything not closed or "soon" takes applications. */
export function isJobOpen(status: string) {
  const normalized = status.toLowerCase();
  return !normalized.includes("closed") && !normalized.includes("soon");
}
