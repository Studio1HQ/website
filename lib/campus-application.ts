/**
 * Studio1 Across the Campus applications (/community/campus): the form's options and
 * one validator shared by the client form and the /api/community/campus
 * route, so both enforce the same rules. Kept short on purpose: who they
 * are, how big the community is and what would help. The team reaches out
 * for the rest (where they're based, the event, how we'll partner).
 */

import {
  EMPTY_CONSENT,
  consentErrors,
  readConsent,
  type ContactConsentValues,
} from "@/lib/contact-consent";
import { isEmailAddress, nameError } from "@/lib/form-checks";
import { normalizeUrl } from "@/lib/devrel-cohort-application";

/** The program's name, as the automatic emails say it. */
export const CAMPUS_PROGRAM = "Studio1 Across the Campus";

/** How many people usually come to their events. */
export const TURNOUTS = ["Under 50", "50–150", "150–500", "500+"] as const;

/**
 * How Studio1 can help, as the form's pills show them. Funding is last: we
 * support events mostly with people and resources.
 */
export const SUPPORT = [
  { key: "speaker", label: "A talk or workshop" },
  { key: "mentors", label: "Mentors or judges" },
  { key: "swag", label: "Swag" },
  { key: "promotion", label: "Promotion" },
  { key: "sponsors", label: "Intros to devtool sponsors" },
  { key: "planning", label: "Planning help" },
  { key: "cash", label: "Financial support" },
] as const;
export type SupportKey = (typeof SUPPORT)[number]["key"];

/**
 * Ways communities often partner with us, shown on the page only. The form
 * doesn't ask: the team agrees on it together on a call.
 */
export const PARTNERING = [
  "Invite us on stage for a short talk or demo",
  "Feature Studio1 as a community partner on your event page and banners",
  "Share the event on your socials with a mention of Studio1",
  "Welcome your members into the Studio1 Discord",
  "Host a Studio1 meetup on your campus",
  "Share photos and highlights after the event",
] as const;

export type CampusValues = ContactConsentValues & {
  name: string;
  email: string;
  communityName: string;
  college: string;
  communityUrl: string;
  /** Committee size, kept as typed so the box can be empty; the route stores the number. */
  coreTeamSize: string;
  /** Average turnout at their events, one of TURNOUTS. */
  eventTurnout: string;
  support: SupportKey[];
  cashAsk: string;
  whyStudio1: string;
  /** Honeypot: hidden from people, filled in by bots. */
  website: string;
};

export type CampusField = keyof CampusValues;
export type CampusErrors = Partial<Record<CampusField, string>>;

export const EMPTY_CAMPUS: CampusValues = {
  name: "",
  email: "",
  communityName: "",
  college: "",
  communityUrl: "",
  coreTeamSize: "",
  eventTurnout: "",
  support: [],
  cashAsk: "",
  whyStudio1: "",
  ...EMPTY_CONSENT,
  website: "",
};

export const WHY_MIN = 20;
export const WHY_MAX = 600;
export const CASH_MAX = 400;
const SHORT_MAX = 120;

const text = (value: unknown) =>
  typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
/** Long answers keep their line breaks. */
const longText = (value: unknown) =>
  typeof value === "string"
    ? value
        .replace(/\r\n?/g, "\n")
        .replace(/\n{3,}/g, "\n\n")
        .trim()
    : "";

function picks<K extends string>(
  value: unknown,
  allowed: readonly { key: K }[],
): K[] {
  if (!Array.isArray(value)) return [];
  // In the order the form lists them, once each.
  return allowed.map((item) => item.key).filter((key) => value.includes(key));
}

const oneOf = (value: string, options: readonly string[]) =>
  options.includes(value);

/**
 * A short free-text answer: no web address, within the length. Only real
 * URLs are refused (not looksLikeLink's bare domains), so names like
 * "Node.js Kolkata" or "Vue.js Pune" go through.
 */
function shortError(value: string, label: string, required: boolean) {
  if (!value) return required ? `Add ${label}.` : undefined;
  if (value.length > SHORT_MAX) return `Keep it under ${SHORT_MAX} characters.`;
  if (/[a-z][a-z0-9+.-]*:\/\/|(^|\s)www\./i.test(value))
    return "Just the name here. The link goes below.";
  return undefined;
}

/** Checks a submission and returns cleaned values or per-field errors. */
export function validateCampusApplication(
  input: Partial<Record<CampusField, unknown>>,
): { ok: true; values: CampusValues } | { ok: false; errors: CampusErrors } {
  const rawUrl = text(input.communityUrl);
  const values: CampusValues = {
    name: text(input.name),
    email: text(input.email).toLowerCase(),
    communityName: text(input.communityName),
    college: text(input.college),
    communityUrl: normalizeUrl(rawUrl),
    coreTeamSize: text(input.coreTeamSize),
    eventTurnout: text(input.eventTurnout),
    support: picks(input.support, SUPPORT),
    cashAsk: longText(input.cashAsk),
    whyStudio1: longText(input.whyStudio1),
    ...readConsent(input),
    website: text(input.website),
  };
  // Only asked when financial support is picked; never stored otherwise.
  if (!values.support.includes("cash")) values.cashAsk = "";

  const errors: CampusErrors = {};
  const name = nameError(values.name);
  if (name) errors.name = name;
  if (!isEmailAddress(values.email))
    errors.email = "Enter a valid email address.";

  const community = shortError(
    values.communityName,
    "your community's name",
    true,
  );
  if (community) errors.communityName = community;
  const college = shortError(values.college, "your college", false);
  if (college) errors.college = college;
  if (!values.communityUrl || values.communityUrl.length > 300) {
    errors.communityUrl = rawUrl
      ? "That doesn't look like a link. Try linkedin.com/company/your-club."
      : "Add a link to your community: LinkedIn, Instagram, a website or Luma.";
  }
  const team = Number(values.coreTeamSize);
  if (!/^\d+$/.test(values.coreTeamSize) || team < 1 || team > 1000) {
    errors.coreTeamSize =
      "Enter how many people are on your committee, as a number.";
  }
  if (!oneOf(values.eventTurnout, TURNOUTS))
    errors.eventTurnout = "Pick a range.";

  // What would help is optional: the team can suggest it on the call.
  if (values.support.includes("cash")) {
    if (values.cashAsk.length < 10) {
      errors.cashAsk = "Tell us roughly how much, and what it would cover.";
    } else if (values.cashAsk.length > CASH_MAX) {
      errors.cashAsk = `Keep it under ${CASH_MAX} characters.`;
    }
  }
  if (values.whyStudio1.length < WHY_MIN)
    errors.whyStudio1 = "Tell us a little more. A sentence or two is plenty.";
  if (values.whyStudio1.length > WHY_MAX)
    errors.whyStudio1 = `Keep it under ${WHY_MAX} characters.`;
  Object.assign(errors, consentErrors(values));

  return Object.keys(errors).length > 0
    ? { ok: false, errors }
    : { ok: true, values };
}

/** Labels for stored keys, for the dashboard. */
export function supportLabels(keys: readonly string[]) {
  return SUPPORT.filter((item) => keys.includes(item.key)).map(
    (item) => item.label,
  );
}
