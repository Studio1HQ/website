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
import { isEmailAddress, looksLikeLink, nameError, placeError } from "@/lib/form-checks";
import type { HackathonQuestion } from "@/data/hackathons";

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
  /** Answers to the event's own questions, by question id. */
  answers: Record<string, string>;
  /** Honeypot: hidden from people, filled in by bots. */
  website: string;
} & ContactConsentValues;

export type RegistrationField = keyof RegistrationValues;
/** An event question's error key, as used by the form's inputs. */
export type AnswerField = `answer:${string}`;
export type RegistrationErrors = Partial<Record<RegistrationField | AnswerField, string>>;

export const answerField = (id: string): AnswerField => `answer:${id}`;

/** Longest answer per question type, in characters. */
export const ANSWER_MAX = { short: 200, long: 1000 } as const;
export const YES_NO = ["Yes", "No"] as const;

/** One answer as stored on the registration: self-describing, so it reads
 * the same even if the question's wording changes later. */
export type StoredAnswer = { id: string; question: string; answer: string };

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
  answers: {},
  website: "",
  ...EMPTY_CONSENT,
};

export const IDEA_MAX = 500;

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

/** Checks one event question's answer; returns an error or null. */
function answerError(question: HackathonQuestion, answer: string) {
  if (!answer) return question.required ? "Answer this one to register." : null;
  switch (question.type) {
    case "short":
    case "long":
      return answer.length > ANSWER_MAX[question.type]
        ? `Keep it under ${ANSWER_MAX[question.type].toLocaleString("en-US")} characters.`
        : null;
    case "choice":
      return (question.options ?? []).includes(answer) ? null : "Pick one of the options.";
    case "yesno":
      return (YES_NO as readonly string[]).includes(answer) ? null : "Pick yes or no.";
  }
}

/** The answers to save: answered questions only, in the form's order. */
export function storedAnswers(
  questions: readonly HackathonQuestion[],
  answers: Record<string, string>,
): StoredAnswer[] {
  return questions
    .filter((question) => answers[question.id])
    .map((question) => ({ id: question.id, question: question.label, answer: answers[question.id] }));
}

/**
 * Checks a submission. `tracks` are the event's track names; the undecided
 * option is always allowed. `questions` are the event's own questions;
 * answers to anything else are dropped.
 */
export function validateRegistration(
  input: Partial<Record<RegistrationField, unknown>>,
  tracks: string[],
  questions: readonly HackathonQuestion[] = [],
):
  | { ok: true; values: RegistrationValues }
  | { ok: false; errors: RegistrationErrors } {
  const rawAnswers =
    typeof input.answers === "object" && input.answers !== null
      ? (input.answers as Record<string, unknown>)
      : {};
  const answers: Record<string, string> = {};
  for (const question of questions) {
    const answer = text(rawAnswers[question.id]);
    if (answer) answers[question.id] = answer;
  }
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
    answers,
    website: text(input.website),
    ...readConsent(input),
  };

  const errors: RegistrationErrors = {};
  const name = nameError(values.name);
  if (name) errors.name = name;
  if (!isEmailAddress(values.email))
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
  for (const question of questions) {
    const error = answerError(question, answers[question.id] ?? "");
    if (error) errors[answerField(question.id)] = error;
  }
  if (!values.agree) errors.agree = "You need to accept the rules to register.";
  Object.assign(errors, consentErrors(values));

  if (values.team !== "team") values.teamName = "";

  return Object.keys(errors).length > 0
    ? { ok: false, errors }
    : { ok: true, values };
}
