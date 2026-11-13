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

export type ApplicationValues = ContactConsentValues & {
  name: string;
  email: string;
  location: string;
  linkedin: string;
  portfolio: string;
  /** One link per line. */
  workLinks: string;
  planLink: string;
  why: string;
  start: string;
  /** Honeypot: hidden from people, filled in by bots. */
  website: string;
};

export type ApplicationField = keyof ApplicationValues | "resume";
export type ApplicationErrors = Partial<Record<ApplicationField, string>>;

export const EMPTY_APPLICATION: ApplicationValues = {
  name: "",
  email: "",
  location: "",
  linkedin: "",
  portfolio: "",
  workLinks: "",
  planLink: "",
  why: "",
  start: "",
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

/** Adds https:// when someone pastes "github.com/me". */
function withProtocol(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

export function splitLinks(value: string) {
  return value
    .split(/[\s,]+/)
    .map(withProtocol)
    .filter(Boolean);
}

const text = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";

export function validateApplication(
  input: Partial<Record<keyof ApplicationValues, unknown>>,
):
  | { ok: true; values: ApplicationValues; links: string[] }
  | { ok: false; errors: ApplicationErrors } {
  const values: ApplicationValues = {
    name: text(input.name),
    email: text(input.email).toLowerCase(),
    location: text(input.location),
    linkedin: withProtocol(text(input.linkedin)),
    portfolio: withProtocol(text(input.portfolio)),
    workLinks: text(input.workLinks),
    planLink: withProtocol(text(input.planLink)),
    why: text(input.why),
    start: text(input.start),
    ...readConsent(input),
    website: text(input.website),
  };
  const links = splitLinks(values.workLinks);

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
  if (!isUrl(values.planLink))
    errors.planLink =
      "Add a link to your plan (Google Doc, Notion, or GitHub).";
  if (values.why.length < APPLICATION_LIMITS.why.min)
    errors.why = `Tell us a bit more (at least ${APPLICATION_LIMITS.why.min} characters).`;
  else if (values.why.length > APPLICATION_LIMITS.why.max)
    errors.why = `Keep it under ${APPLICATION_LIMITS.why.max} characters.`;
  if (!(START_OPTIONS as readonly string[]).includes(values.start))
    errors.start = "Pick when you could start.";
  Object.assign(errors, consentErrors(values));

  return Object.keys(errors).length > 0
    ? { ok: false, errors }
    : { ok: true, values, links };
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
