import "server-only";
import { EVENTS, isUpcomingEvent, type StudioEvent } from "@/data/events";
import { HACKATHONS } from "@/data/hackathons";
import { HACKATHONS_PUBLIC, sortHackathons, statusOf } from "@/lib/hackathons";
import { isSupabaseConfigured, selectRows } from "@/lib/supabase-server";

/*
 * What the public /community page shows: the community events the team runs
 * (from the dashboard's community_events table) and the events the team has
 * spoken at or joined (data/events.ts), merged into one list.
 *
 * Only events marked confirmed, live or done in the dashboard are public, and
 * only their public fields are read: never budget, owner, notes or partners.
 */

export type CommunityKind = "meetup" | "hackathon" | "workshop" | "conference" | "online";

export type CommunityItem = {
  id: string;
  name: string;
  kind: CommunityKind;
  /** First day, YYYY-MM-DD. */
  date: string;
  /** Last day of a multi-day event, YYYY-MM-DD. */
  endDate?: string;
  /** The date as written when it is not exact, e.g. "Early October". */
  approx?: string;
  city: string;
  venue?: string;
  online: boolean;
  upcoming: boolean;
  /** Where the card links: registration, recap or the event's entry. */
  href?: string;
  external: boolean;
  cta: string;
  image?: string;
  /** One line on what happened or what to expect. */
  summary?: string;
  /** Run by Studio1 (from the dashboard) rather than one we spoke at. */
  ours: boolean;
};

type DbEvent = {
  id: string;
  name: string;
  kind: string;
  status: string;
  format: string;
  starts_on: string | null;
  ends_on: string | null;
  city: string;
  venue: string;
  registration_url: string | null;
  recap_url: string | null;
};

/** One spelling per city, so the city board counts them together. */
const CITY_ALIASES: [RegExp, string][] = [
  [/delhi|noida|gurgaon|gurugram/i, "Delhi NCR"],
  [/kolkata|kalyani|jadavpur|kgec/i, "Kolkata"],
  [/bengaluru|bangalore/i, "Bengaluru"],
  [/taipei|taiwan/i, "Taipei"],
  [/mumbai|bombay/i, "Mumbai"],
  [/pune/i, "Pune"],
  [/hyderabad/i, "Hyderabad"],
  [/chennai/i, "Chennai"],
];

export function cityOf(place: string | undefined): string {
  const text = (place ?? "").trim();
  if (!text) return "";
  for (const [pattern, city] of CITY_ALIASES) if (pattern.test(text)) return city;
  return text;
}

const pad = (n: number) => String(n).padStart(2, "0");
const iso = (y: number, m: number, d = 1) => `${y}-${pad(m)}-${pad(d)}`;
const today = (now: number) => {
  const d = new Date(now);
  return iso(d.getFullYear(), d.getMonth() + 1, d.getDate());
};

const STATIC_KIND: Record<StudioEvent["kind"], CommunityKind> = {
  Meetup: "meetup",
  Community: "meetup",
  Hackathon: "hackathon",
  Conference: "conference",
  Podcast: "online",
  Livestream: "online",
  Webinar: "online",
};

function fromStatic(e: StudioEvent, now: number): CommunityItem {
  const kind = STATIC_KIND[e.kind];
  const city = cityOf(e.place);
  const online = kind === "online" || city === "Online";
  return {
    id: `s-${e.slug}`,
    name: e.name,
    kind,
    date: iso(e.year, e.month, e.day),
    endDate: e.endDay ? iso(e.year, e.month, e.endDay) : undefined,
    approx: e.approx,
    city: online ? "Online" : city,
    online,
    upcoming: isUpcomingEvent(e, now),
    href: `/events#${e.slug}`,
    external: false,
    cta: "Details",
    image: e.image,
    summary: e.summary,
    ours: false,
  };
}

function fromDb(e: DbEvent, now: number): CommunityItem | null {
  if (!e.starts_on) return null;
  const kind: CommunityKind =
    e.kind === "hackathon"
      ? "hackathon"
      : e.kind === "workshop"
        ? "workshop"
        : e.kind === "conference"
          ? "conference"
          : e.format === "online" || e.kind === "webinar"
            ? "online"
            : "meetup";
  const online = e.format === "online";
  const upcoming = (e.ends_on ?? e.starts_on) >= today(now) && e.status !== "done";
  const href = upcoming ? (e.registration_url ?? e.recap_url) : (e.recap_url ?? undefined);
  return {
    id: `d-${e.id}`,
    name: e.name,
    kind,
    date: e.starts_on,
    endDate: e.ends_on && e.ends_on !== e.starts_on ? e.ends_on : undefined,
    city: online ? "Online" : cityOf(e.city),
    venue: online ? undefined : e.venue || undefined,
    online,
    upcoming,
    href: href ?? undefined,
    external: Boolean(href),
    cta: upcoming ? (e.registration_url ? "Register" : "Details") : "Recap",
    ours: true,
  };
}

async function loadDbEvents(now: number): Promise<CommunityItem[]> {
  if (!isSupabaseConfigured()) return [];
  const query = new URLSearchParams({
    select: "id,name,kind,status,format,starts_on,ends_on,city,venue,registration_url,recap_url",
    status: "in.(confirmed,live,done)",
    order: "starts_on.desc",
    limit: "200",
  });
  const result = await selectRows<DbEvent>("community_events", query);
  if (!result.ok) return [];
  return result.rows.map((row) => fromDb(row, now)).filter((x): x is CommunityItem => x !== null);
}

/** Hackathons from the hackathon program, once it is public. */
function programHackathons(now: number): CommunityItem[] {
  if (!HACKATHONS_PUBLIC) return [];
  return sortHackathons(HACKATHONS, now)
    // Placeholder entries are layout examples, never real events
    .filter((h) => !h.placeholder && statusOf(h, now) !== "past")
    .map((h) => ({
      id: `h-${h.slug}`,
      name: h.name,
      kind: "hackathon" as const,
      date: h.startDate,
      endDate: h.endDate,
      city: h.format === "online" ? "Online" : cityOf(h.location),
      online: h.format === "online",
      upcoming: true,
      href: `/hackathons/${h.slug}`,
      external: false,
      cta: "Register",
      ours: true,
    }));
}

export type CommunityData = {
  upcoming: CommunityItem[];
  past: CommunityItem[];
  cities: { city: string; count: number; kinds: CommunityKind[] }[];
  totals: { events: number; cities: number; meetups: number; hackathons: number };
  hackathonsOpen: boolean;
};

export async function loadCommunity(now = Date.now()): Promise<CommunityData> {
  const db = await loadDbEvents(now);
  const all = [...db, ...programHackathons(now), ...EVENTS.map((e) => fromStatic(e, now))];

  const upcoming = all.filter((e) => e.upcoming).sort((a, b) => a.date.localeCompare(b.date));
  const past = all.filter((e) => !e.upcoming).sort((a, b) => b.date.localeCompare(a.date));

  const byCity = new Map<string, { count: number; kinds: Set<CommunityKind> }>();
  for (const e of past) {
    if (!e.city || e.online || e.city === "North America" || e.city === "India") continue;
    const entry = byCity.get(e.city) ?? { count: 0, kinds: new Set() };
    entry.count += 1;
    entry.kinds.add(e.kind);
    byCity.set(e.city, entry);
  }
  const cities = [...byCity.entries()]
    .map(([city, v]) => ({ city, count: v.count, kinds: [...v.kinds] }))
    .sort((a, b) => b.count - a.count || a.city.localeCompare(b.city));

  return {
    upcoming,
    past,
    cities,
    totals: {
      events: past.length,
      cities: cities.length,
      meetups: past.filter((e) => e.kind === "meetup").length,
      hackathons: past.filter((e) => e.kind === "hackathon").length,
    },
    hackathonsOpen: HACKATHONS_PUBLIC,
  };
}
