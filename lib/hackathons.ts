import type {
  CoverPattern,
  CoverTone,
  Hackathon,
  HackathonFormat,
} from "@/data/hackathons";

export type HackathonStatus = "live" | "upcoming" | "past";

const DAY = 86_400_000;

/** Dates are whole days in UTC; an end date runs to the end of that day. */
const startOf = (date: string) => Date.parse(`${date}T00:00:00Z`);
const endOf = (date: string) => startOf(date) + DAY;

export function statusOf(
  hackathon: Hackathon,
  now = Date.now(),
): HackathonStatus {
  if (now >= endOf(hackathon.endDate)) return "past";
  if (now >= startOf(hackathon.startDate)) return "live";
  return "upcoming";
}

export function isRegistrationOpen(hackathon: Hackathon, now = Date.now()) {
  return (
    now < endOf(hackathon.registrationCloses) && now < endOf(hackathon.endDate)
  );
}

export const FORMAT_LABEL: Record<HackathonFormat, string> = {
  online: "Online",
  "in-person": "In person",
  hybrid: "Hybrid",
};

export const STATUS_LABEL: Record<HackathonStatus, string> = {
  live: "Live now",
  upcoming: "Upcoming",
  past: "Ended",
};

function parts(date: string) {
  const value = new Date(startOf(date));
  return {
    month: value.toLocaleDateString("en-US", {
      month: "short",
      timeZone: "UTC",
    }),
    day: value.getUTCDate(),
    year: value.getUTCFullYear(),
  };
}

/** "Nov 8, 2026" */
export function formatDate(date: string) {
  const { month, day, year } = parts(date);
  return `${month} ${day}, ${year}`;
}

/** "Jan 16–17, 2027", "Nov 23 – Dec 6, 2026", "Dec 28, 2026 – Jan 3, 2027" */
export function formatDateRange(start: string, end: string) {
  const a = parts(start);
  const b = parts(end);
  if (start === end) return formatDate(start);
  if (a.year !== b.year) return `${formatDate(start)} – ${formatDate(end)}`;
  if (a.month === b.month) return `${a.month} ${a.day}–${b.day}, ${b.year}`;
  return `${a.month} ${a.day} – ${b.month} ${b.day}, ${b.year}`;
}

export function formatUsd(amount: number, compact = false) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: compact ? 1 : 0,
    notation: compact ? "compact" : "standard",
  }).format(amount);
}

function daysBetween(from: number, to: number) {
  return Math.max(0, Math.ceil((to - from) / DAY));
}

/** "Starts in 21 days", "Ends tomorrow", "Ended Sep 14, 2026" */
export function countdownLabel(hackathon: Hackathon, now = Date.now()) {
  const status = statusOf(hackathon, now);
  if (status === "past") return `Ended ${formatDate(hackathon.endDate)}`;
  const target =
    status === "live" ? endOf(hackathon.endDate) : startOf(hackathon.startDate);
  const days = daysBetween(now, target);
  const verb = status === "live" ? "Ends" : "Starts";
  if (days <= 1) return status === "live" ? "Ends today" : "Starts tomorrow";
  return `${verb} in ${days} days`;
}

/** Live first, then upcoming by start date, then past events newest first. */
export function sortHackathons(list: Hackathon[], now = Date.now()) {
  const rank: Record<HackathonStatus, number> = {
    live: 0,
    upcoming: 1,
    past: 2,
  };
  return [...list].sort((a, b) => {
    const byStatus = rank[statusOf(a, now)] - rank[statusOf(b, now)];
    if (byStatus !== 0) return byStatus;
    return statusOf(a, now) === "past"
      ? b.startDate.localeCompare(a.startDate)
      : a.startDate.localeCompare(b.startDate);
  });
}

/** What a listing card needs, computed on the server so it stays serializable. */
export type HackathonCard = {
  slug: string;
  name: string;
  tagline: string;
  summary: string;
  dateRange: string;
  format: HackathonFormat;
  location: string;
  status: HackathonStatus;
  registrationOpen: boolean;
  countdown: string;
  prizePool: string;
  /** "$10K", for tight spaces like the departures board. */
  prizeShort: string;
  /** Start date as "NOV 23". */
  departs: string;
  /** Registration open but closing within three days. */
  finalCall: boolean;
  year: number;
  cover: { tone: CoverTone; pattern: CoverPattern };
};

const FINAL_CALL_DAYS = 3;

export function toCard(hackathon: Hackathon, now = Date.now()): HackathonCard {
  return {
    slug: hackathon.slug,
    name: hackathon.name,
    tagline: hackathon.tagline,
    summary: hackathon.summary,
    dateRange: formatDateRange(hackathon.startDate, hackathon.endDate),
    format: hackathon.format,
    location: hackathon.location,
    status: statusOf(hackathon, now),
    registrationOpen: isRegistrationOpen(hackathon, now),
    countdown: countdownLabel(hackathon, now),
    prizePool: formatUsd(hackathon.prizePoolUsd),
    prizeShort: formatUsd(hackathon.prizePoolUsd, true),
    departs:
      `${parts(hackathon.startDate).month} ${parts(hackathon.startDate).day}`.toUpperCase(),
    finalCall:
      isRegistrationOpen(hackathon, now) &&
      endOf(hackathon.registrationCloses) - now <= FINAL_CALL_DAYS * DAY,
    year: parts(hackathon.startDate).year,
    cover: hackathon.cover,
  };
}

/**
 * Where "today" sits on an event's itinerary. Milestones are drawn evenly
 * spaced; `after` is the last one whose day has started (-1 if none), and
 * `fraction` is how far along the gap to the next one (0 at either end).
 */
export function itineraryPosition(dates: string[], now = Date.now()) {
  const times = dates.map(startOf);
  let after = -1;
  times.forEach((time, index) => {
    if (now >= time) after = index;
  });
  if (after === -1 || after === times.length - 1) return { after, fraction: 0 };
  const span = times[after + 1] - times[after];
  const fraction = span > 0 ? (now - times[after]) / span : 0;
  // Keep the marker clear of the nodes on either side.
  return { after, fraction: Math.min(0.8, Math.max(0.2, fraction)) };
}

/** Epoch ms for the start and end of an event's window. */
export function eventWindow(hackathon: Hackathon) {
  return { start: startOf(hackathon.startDate), end: endOf(hackathon.endDate) };
}

/** "Nov 2", for compact labels. */
export function formatShortDate(date: string | number) {
  const value =
    typeof date === "number" ? new Date(date) : new Date(startOf(date));
  return value.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

/** Whether a timeline milestone is done, happening today, or still ahead. */
export function milestoneState(date: string, now = Date.now()) {
  if (now >= endOf(date)) return "done" as const;
  if (now >= startOf(date)) return "today" as const;
  return "next" as const;
}

/** Every hackathon page shares this: hidden while the program is a draft. */
/**
 * /hackathons is hidden until the program launches: in production the pages
 * 404 and registrations are refused unless HACKATHONS_PUBLIC=true is set.
 * Local development always shows them so the pages can still be built.
 */
export const HACKATHONS_PUBLIC =
  process.env.NODE_ENV !== "production" ||
  process.env.HACKATHONS_PUBLIC === "true";

export const HACKATHON_ROBOTS = {
  index: false,
  follow: false,
  googleBot: { index: false, follow: false },
} as const;
