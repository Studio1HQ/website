/**
 * Hackathon registration: the form's options and one validator shared by the
 * client form and the /api/hackathons/register route.
 */

import {
  EMPTY_CONSENT,
  consentErrors,
  readConsent,
  type ContactConsentValues,
} from "@/lib/contact-consent";
import { looksLikeLink, nameError, placeError } from "@/lib/form-checks";

export const ROLE_OPTIONS = [
  "Student",
  "Professional developer",
  "Founder or indie hacker",
  "Designer",
  "Other",
] as const;

export const EXPERIENCE_OPTIONS = [
  "Beginner",
  "Intermediate",
  "Advanced",
] as const;

export const TEAM_OPTIONS = [
  { value: "solo", label: "Going solo" },
  { value: "team", label: "I have a team" },
  { value: "looking", label: "Looking for a team" },
] as const;

export const SOURCE_OPTIONS = [
  "X (Twitter)",
  "LinkedIn",
  "Discord",
  "Reddit",
  "A friend",
  "Newsletter",
  "Other",
] as const;

/** Track value for people who haven't picked one yet. */
export const UNDECIDED_TRACK = "Not sure yet";

export type TeamStatus = (typeof TEAM_OPTIONS)[number]["value"];

export type RegistrationValues = {
  name: string;
  email: string;
  github: string;
  country: string;
  role: string;
  experience: string;
  team: TeamStatus | "";
  teamName: string;
  track: string;
  idea: string;
  source: string;
  agree: boolean;
  partnerConsent: boolean;
  /** Honeypot: hidden from people, filled in by bots. */
  website: string;
} & ContactConsentValues;

export type RegistrationField = keyof RegistrationValues;
export type RegistrationErrors = Partial<Record<RegistrationField, string>>;

export const EMPTY_REGISTRATION: RegistrationValues = {
  name: "",
  email: "",
  github: "",
  country: "",
  role: "",
  experience: "",
  team: "",
  teamName: "",
  track: "",
  idea: "",
  source: "",
  agree: false,
  partnerConsent: false,
  website: "",
  ...EMPTY_CONSENT,
};

export const IDEA_MAX = 500;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const GITHUB_HANDLE = /^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i;

/** Accepts "octocat", "@octocat", or a github.com profile URL. */
export function normalizeGithub(value: string) {
  return value
    .trim()
    .replace(/^https?:\/\/(www\.)?github\.com\//i, "")
    .replace(/^@/, "")
    .replace(/\/+$/, "");
}

const text = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";

/**
 * Checks a submission. `tracks` are the event's track names; the undecided
 * option is always allowed.
 */
export function validateRegistration(
  input: Partial<Record<RegistrationField, unknown>>,
  tracks: string[],
):
  | { ok: true; values: RegistrationValues }
  | { ok: false; errors: RegistrationErrors } {
  const values: RegistrationValues = {
    name: text(input.name),
    email: text(input.email).toLowerCase(),
    github: normalizeGithub(text(input.github)),
    country: text(input.country),
    role: text(input.role),
    experience: text(input.experience),
    team: text(input.team) as RegistrationValues["team"],
    teamName: text(input.teamName),
    track: text(input.track),
    idea: text(input.idea),
    source: text(input.source),
    agree: input.agree === true,
    partnerConsent: input.partnerConsent === true,
    website: text(input.website),
    ...readConsent(input),
  };

  const errors: RegistrationErrors = {};
  const name = nameError(values.name);
  if (name) errors.name = name;
  if (!EMAIL.test(values.email) || values.email.length > 254)
    errors.email = "Enter a valid email address.";
  if (!GITHUB_HANDLE.test(values.github))
    errors.github = "Enter your GitHub username, like octocat.";
  const country = placeError(values.country, "Enter the country you're based in.", 60);
  if (country) errors.country = country;
  if (!(ROLE_OPTIONS as readonly string[]).includes(values.role))
    errors.role = "Pick the option that fits best.";
  if (!(EXPERIENCE_OPTIONS as readonly string[]).includes(values.experience))
    errors.experience = "Pick your experience level.";
  if (!TEAM_OPTIONS.some((option) => option.value === values.team))
    errors.team = "Tell us how you're joining.";
  if (values.team === "team" && values.teamName.length < 2)
    errors.teamName = "Add your team's name.";
  if (values.teamName.length > 60)
    errors.teamName = "Keep it under 60 characters.";
  else if (looksLikeLink(values.teamName))
    errors.teamName = "Enter your team's name, not a link.";
  if (![...tracks, UNDECIDED_TRACK].includes(values.track))
    errors.track = "Pick a track, or choose not sure yet.";
  if (values.idea.length > IDEA_MAX)
    errors.idea = `Keep it under ${IDEA_MAX} characters.`;
  if (
    values.source &&
    !(SOURCE_OPTIONS as readonly string[]).includes(values.source)
  )
    errors.source = "Pick one of the options.";
  if (!values.agree) errors.agree = "You need to accept the rules to register.";
  Object.assign(errors, consentErrors(values));

  if (values.team !== "team") values.teamName = "";

  return Object.keys(errors).length > 0
    ? { ok: false, errors }
    : { ok: true, values };
}
