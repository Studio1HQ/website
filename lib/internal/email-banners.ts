/**
 * The paper header image each email opens with (drawn by /og/email/[key]):
 * a kicker, a short headline ending in print orange, and the orange panel
 * with a framed label, like the site's share cards. One per template, so
 * the image URLs are fixed and cache forever.
 */

export type EmailPipeline = "jobs" | "cohort" | "hackathons";

export type Banner = { kicker: string; title: string; label: string };

export const EMAIL_SECTION_NAMES: Record<EmailPipeline, string> = {
  jobs: "Careers",
  cohort: "DevRel Cohort",
  hackathons: "Hackathons",
};

const NOTE = (section: string): Banner => ({ kicker: section, title: "A note from Studio1.", label: "note.fig" });

const BANNERS: Record<EmailPipeline, Record<string, Banner>> = {
  jobs: {
    confirmation: { kicker: "Careers · Application received", title: "Thanks for applying.", label: "received.fig" },
    shortlist: { kicker: "Careers · Next round", title: "You're on the shortlist.", label: "shortlist.fig" },
    invite: { kicker: "Careers · Next step", title: "Let's talk.", label: "call.fig" },
    "next-round": { kicker: "Careers · Next round", title: "On to the next round.", label: "next-round.fig" },
    offer: { kicker: "Careers · Offer", title: "An offer from Studio1.", label: "offer.fig" },
    welcome: { kicker: "Careers · Welcome", title: "Welcome to Studio1.", label: "welcome.fig" },
    remind: { kicker: "Careers · Follow-up", title: "Still keen to talk?", label: "follow-up.fig" },
    "more-info": { kicker: "Careers · Follow-up", title: "A few quick questions.", label: "questions.fig" },
    decline: { kicker: "Careers · Update", title: "An update on your application.", label: "update.fig" },
    "decline-after-call": { kicker: "Careers · Update", title: "An update on your application.", label: "update.fig" },
    custom: NOTE("Careers"),
  },
  cohort: {
    confirmation: { kicker: "DevRel Cohort · Application received", title: "Thanks for applying.", label: "received.fig" },
    shortlist: { kicker: "DevRel Cohort · Next step", title: "Let's have a quick chat.", label: "call.fig" },
    accept: { kicker: "DevRel Cohort · Accepted", title: "You're in.", label: "welcome.fig" },
    remind: { kicker: "DevRel Cohort · Follow-up", title: "Still keen to chat?", label: "follow-up.fig" },
    waitlist: { kicker: "DevRel Cohort · Waitlist", title: "You're on the waitlist.", label: "waitlist.fig" },
    decline: { kicker: "DevRel Cohort · Update", title: "An update on your application.", label: "update.fig" },
    custom: NOTE("DevRel Cohort"),
  },
  hackathons: {
    confirmation: { kicker: "Hackathons · Registration received", title: "Thanks for registering.", label: "received.fig" },
    confirm: { kicker: "Hackathons · Confirmed", title: "You're in.", label: "confirmed.fig" },
    "off-waitlist": { kicker: "Hackathons · Confirmed", title: "A spot opened up.", label: "confirmed.fig" },
    reminder: { kicker: "Hackathons · Reminder", title: "Starting soon.", label: "reminder.fig" },
    "week-before": { kicker: "Hackathons · One week to go", title: "Seven days to go.", label: "countdown.fig" },
    "day-before": { kicker: "Hackathons · Tomorrow", title: "See you tomorrow.", label: "tomorrow.fig" },
    kickoff: { kicker: "Hackathons · Kickoff", title: "We're live.", label: "kickoff.fig" },
    deadline: { kicker: "Hackathons · Submissions", title: "Time to ship.", label: "deadline.fig" },
    results: { kicker: "Hackathons · Results", title: "Thanks for building.", label: "results.fig" },
    waitlist: { kicker: "Hackathons · Waitlist", title: "You're on the waitlist.", label: "waitlist.fig" },
    decline: { kicker: "Hackathons · Update", title: "An update on your registration.", label: "update.fig" },
    custom: NOTE("Hackathons"),
  },
};

/** Bump to redraw every header (the images cache for a year). */
export const BANNER_VERSION = 2;

export function isEmailPipeline(value: unknown): value is EmailPipeline {
  return typeof value === "string" && Object.hasOwn(BANNERS, value);
}

/** The header for a template; anything without one of its own gets the note. */
export function bannerFor(pipeline: EmailPipeline, template: string): { key: string; banner: Banner } {
  // hasOwn, so a key like "constructor" can't pick something off Object.
  const known = Object.hasOwn(BANNERS[pipeline], template);
  return {
    key: known ? `${pipeline}-${template}` : `${pipeline}-custom`,
    banner: known ? BANNERS[pipeline][template] : BANNERS[pipeline].custom,
  };
}

/** For the image route: the banner a key names, or null. */
export function bannerByKey(key: string): Banner | null {
  const match = /^(jobs|cohort|hackathons)-([a-z-]+)$/.exec(key);
  if (!match) return null;
  const banners = BANNERS[match[1] as EmailPipeline];
  return Object.hasOwn(banners, match[2]) ? banners[match[2]] : null;
}

export function bannerPath(key: string) {
  return `/og/email/${key}?v=${BANNER_VERSION}`;
}
