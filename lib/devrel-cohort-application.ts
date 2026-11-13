/**
 * DevRel Cohort applications: the form's options and one validator shared by
 * the client form and the /api/devrel-cohort/apply route.
 */

import {
  EMPTY_CONSENT,
  consentErrors,
  readConsent,
  type ContactConsentValues,
} from "@/lib/contact-consent";
import { isEmailAddress, nameError, placeError } from "@/lib/form-checks";

export const ROLE_OPTIONS = [
  "Student",
  "Software developer or engineer",
  "Technical writer",
  "Community or open-source organizer",
  "Switching careers",
  "Other",
] as const;

export const SOURCE_OPTIONS = [
  "X (Twitter)",
  "LinkedIn",
  "Discord",
  "Reddit",
  "YouTube",
  "A friend",
  "Studio1 website",
  "Other",
] as const;

export type ApplicationValues = ContactConsentValues & {
  name: string;
  email: string;
  location: string;
  role: string;
  profileUrl: string;
  workUrl: string;
  whyDevrel: string;
  favoriteTool: string;
  source: string;
  commitment: boolean;
  partnerConsent: boolean;
  /** Honeypot: hidden from people, filled in by bots. */
  website: string;
};

export type ApplicationField = keyof ApplicationValues;
export type ApplicationErrors = Partial<Record<ApplicationField, string>>;

export const EMPTY_APPLICATION: ApplicationValues = {
  name: "",
  email: "",
  location: "",
  role: "",
  profileUrl: "",
  workUrl: "",
  whyDevrel: "",
  favoriteTool: "",
  source: "",
  commitment: false,
  partnerConsent: false,
  ...EMPTY_CONSENT,
  website: "",
};

export const WHY_MIN = 30;
export const WHY_MAX = 800;
export const TOOL_MAX = 400;

const text = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";

/** Adds https:// when it's missing; returns "" if it still isn't a web URL. */
export function normalizeUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  const withScheme = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
  try {
    const url = new URL(withScheme);
    if (!/^https?:$/.test(url.protocol) || !url.hostname.includes("."))
      return "";
    return url.toString();
  } catch {
    return "";
  }
}

/** Checks a submission and returns cleaned values or per-field errors. */
export function validateApplication(
  input: Partial<Record<ApplicationField, unknown>>,
):
  | { ok: true; values: ApplicationValues }
  | { ok: false; errors: ApplicationErrors } {
  const rawProfile = text(input.profileUrl);
  const rawWork = text(input.workUrl);
  const values: ApplicationValues = {
    name: text(input.name),
    email: text(input.email).toLowerCase(),
    location: text(input.location),
    role: text(input.role),
    profileUrl: normalizeUrl(rawProfile),
    workUrl: normalizeUrl(rawWork),
    whyDevrel: text(input.whyDevrel),
    favoriteTool: text(input.favoriteTool),
    source: text(input.source),
    commitment: input.commitment === true,
    partnerConsent: input.partnerConsent === true,
    ...readConsent(input),
    website: text(input.website),
  };

  const errors: ApplicationErrors = {};
  const name = nameError(values.name);
  if (name) errors.name = name;
  if (!isEmailAddress(values.email))
    errors.email = "Enter a valid email address.";
  const location = placeError(values.location, "Enter your city and country.");
  if (location) errors.location = location;
  if (!(ROLE_OPTIONS as readonly string[]).includes(values.role))
    errors.role = "Pick the option that fits best.";
  if (!values.profileUrl || values.profileUrl.length > 300)
    errors.profileUrl = rawProfile
      ? "That doesn't look like a link. Try linkedin.com/in/you."
      : "Add a link to your LinkedIn, GitHub, X or site.";
  if (!values.workUrl || values.workUrl.length > 300)
    errors.workUrl = rawWork
      ? "That doesn't look like a link."
      : "Link to something you built, wrote or recorded.";
  if (values.whyDevrel.length < WHY_MIN)
    errors.whyDevrel = "Give us a few lines, at least a sentence or two.";
  if (values.whyDevrel.length > WHY_MAX)
    errors.whyDevrel = `Keep it under ${WHY_MAX} characters.`;
  if (values.favoriteTool.length > TOOL_MAX)
    errors.favoriteTool = `Keep it under ${TOOL_MAX} characters.`;
  if (
    values.source &&
    !(SOURCE_OPTIONS as readonly string[]).includes(values.source)
  )
    errors.source = "Pick one of the options.";
  if (!values.commitment)
    errors.commitment = "Confirm you can make time for all four weeks.";
  Object.assign(errors, consentErrors(values));

  return Object.keys(errors).length > 0
    ? { ok: false, errors }
    : { ok: true, values };
}
