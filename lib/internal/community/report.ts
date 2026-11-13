import type { HackathonQuestion } from "@/data/hackathons";
import { doorCounts, doorRows, type SiteRegistration } from "@/lib/internal/community/door";
import type { Guest, GuestCounts } from "@/lib/internal/community/schema";

/**
 * The numbers in an event's sponsor report: turnout, who signed up
 * (role, experience, country, team, track, the event's own questions) and
 * how sign-ups came in over time. Plain data, no session: the report page
 * checks access before it loads anything.
 */

export type ReportRegistration = SiteRegistration & {
  country: string;
  role: string;
  experience: string;
  partner_consent: boolean;
  answers: unknown;
};

export type Share = { label: string; count: number };

export type Breakdown = { key: string; title: string; rows: Share[]; total: number };

export type EventReport = {
  counts: GuestCounts;
  /** Show-up rate once the event is over: attended ÷ (signed up − waitlisted). */
  showUp: number | null;
  /** Site registrations, rejected and withdrawn left out. */
  registered: number;
  countries: number;
  /** Named teams. */
  teams: number;
  /** Agreed to share their details with the event's partners. */
  partnerOptIns: number;
  breakdowns: Breakdown[];
  /** Site sign-ups per day (or per week, past a month). */
  signups: { key: string; label: string; value: number }[];
  signupsBy: "day" | "week";
  /** Speakers, mentors, judges… from the guest list. */
  crew: Share[];
};

const TEAM: Record<string, string> = { solo: "Going solo", team: "Has a team", looking: "Looking for a team" };
const CREW: Record<string, string> = {
  speaker: "Speakers",
  mentor: "Mentors",
  judge: "Judges",
  volunteer: "Volunteers",
  organiser: "Organisers",
};
const TOP = 8;

/**
 * Most common first; past TOP, the rest are "Other". Typed answers that
 * differ only in case or spacing ("India", "india ") count together, under
 * the first spelling seen.
 */
function shares(values: string[], top = TOP): Share[] {
  const counts = new Map<string, Share>();
  for (const value of values) {
    const label = value.trim().replace(/\s+/g, " ") || "Not given";
    const key = label.toLowerCase();
    const share = counts.get(key) ?? { label, count: 0 };
    share.count += 1;
    counts.set(key, share);
  }
  const sorted = [...counts.values()].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
  if (sorted.length <= top) return sorted;
  const rest = sorted.slice(top - 1).reduce((sum, item) => sum + item.count, 0);
  return [...sorted.slice(0, top - 1), { label: "Other", count: rest }];
}

/** The day in India a time falls on, YYYY-MM-DD. */
export function istDay(iso: string) {
  const time = Date.parse(iso);
  if (Number.isNaN(time)) return "";
  return new Date(time + 5.5 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function addDays(day: string, days: number) {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

const dayLabel = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", timeZone: "UTC" });

/** Sign-ups per day from the first to the last; per week (from Monday) past 31 days. */
export function signupSeries(days: string[]): Pick<EventReport, "signups" | "signupsBy"> {
  const sorted = days.filter(Boolean).sort();
  if (!sorted.length) return { signups: [], signupsBy: "day" };
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const span = Math.round((Date.parse(`${last}T00:00:00Z`) - Date.parse(`${first}T00:00:00Z`)) / 86_400_000);
  const by = span > 31 ? "week" : "day";
  const bucket = (day: string) => {
    if (by === "day") return day;
    const weekday = (new Date(`${day}T00:00:00Z`).getUTCDay() + 6) % 7;
    return addDays(day, -weekday);
  };
  const counts = new Map<string, number>();
  for (const day of sorted) counts.set(bucket(day), (counts.get(bucket(day)) ?? 0) + 1);
  const signups: EventReport["signups"] = [];
  for (let at = bucket(first); at <= bucket(last); at = addDays(at, by === "day" ? 1 : 7)) {
    const label = dayLabel.format(new Date(`${at}T00:00:00Z`));
    signups.push({ key: at, label: by === "week" ? `Week of ${label}` : label, value: counts.get(at) ?? 0 });
  }
  return { signups, signupsBy: by };
}

/** One saved answer to an event question, by question id. */
function answerTo(answers: unknown, id: string) {
  if (!Array.isArray(answers)) return "";
  const found = answers.find((item) => item && typeof item === "object" && item.id === id);
  return found && typeof found.answer === "string" ? found.answer : "";
}

export function eventReport({
  guests,
  registrations,
  questions = [],
  over,
}: {
  guests: readonly Guest[];
  registrations: readonly ReportRegistration[];
  questions?: readonly HackathonQuestion[];
  /** The event has happened, so a show-up rate means something. */
  over: boolean;
}): EventReport {
  const counts = doorCounts(doorRows(guests, registrations));
  const accepted = counts.signed_up - counts.waitlisted;
  const active = registrations.filter((item) => item.review_status !== "rejected" && item.review_status !== "withdrawn");
  const breakdowns: Breakdown[] = [
    { key: "role", title: "Role", rows: shares(active.map((item) => item.role)) },
    { key: "experience", title: "Experience", rows: shares(active.map((item) => item.experience)) },
    { key: "country", title: "Country", rows: shares(active.map((item) => item.country)) },
    { key: "team", title: "Team", rows: shares(active.map((item) => TEAM[item.team] ?? item.team)) },
    { key: "track", title: "Track", rows: shares(active.map((item) => item.track)) },
    ...questions
      .filter((question) => question.type === "choice" || question.type === "yesno")
      .map((question) => ({
        key: `q:${question.id}`,
        title: question.label,
        rows: shares(active.map((item) => answerTo(item.answers, question.id))),
      })),
  ]
    .filter((breakdown) => breakdown.rows.some((row) => row.label !== "Not given"))
    .map((breakdown) => ({ ...breakdown, total: active.length }));

  return {
    counts,
    showUp: over && accepted > 0 && counts.attended > 0 ? Math.min(1, counts.attended / accepted) : null,
    registered: active.length,
    countries: new Set(active.map((item) => item.country.trim().toLowerCase()).filter(Boolean)).size,
    teams: new Set(active.map((item) => item.team_name.trim().toLowerCase()).filter(Boolean)).size,
    partnerOptIns: active.filter((item) => item.partner_consent).length,
    breakdowns,
    ...signupSeries(active.map((item) => istDay(item.created_at))),
    crew: Object.entries(CREW)
      .map(([role, label]) => ({
        label,
        count: guests.filter((guest) => guest.role === role && guest.status !== "cancelled").length,
      }))
      .filter((item) => item.count > 0),
  };
}
