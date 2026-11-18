/**
 * Client work area: record types, option lists with labels, the default
 * scope templates, and small helpers for IST days, Monday-based weeks and
 * months. Plain data, safe for client components.
 *
 * Tables: supabase/migrations/20261115130000_client_work.sql.
 * Days are "YYYY-MM-DD" strings in IST (Asia/Kolkata), weeks are the
 * Monday's day key, months are "YYYY-MM". No amounts anywhere in this area,
 * and nothing here ever holds a password or a key.
 */

import {
  addDays,
  daysBetween,
  formatDay,
  isDateKey,
  isOwnedBy,
  ownerName,
  relativeDay,
  todayKey,
  type Option,
  type Tone,
} from "@/lib/internal/community/schema";

export {
  addDays,
  daysBetween,
  formatDay,
  isDateKey,
  isOwnedBy,
  ownerName,
  relativeDay,
  todayKey,
  type Option,
  type Tone,
};

/* --------------------------------------------------------------- options */

type Labelled<T extends string> = Option & { value: T };

function options<T extends string>(
  list: readonly (readonly [T, string, Tone?])[],
): readonly Labelled<T>[] {
  return list.map(([value, label, tone]) => ({ value, label, tone }));
}

export const CLIENT_STATUSES = options([
  ["prospect", "Prospect", "sky"],
  ["active", "Active", "emerald"],
  ["paused", "Paused", "amber"],
  ["ended", "Ended", "stone"],
] as const);
export type ClientStatus = (typeof CLIENT_STATUSES)[number]["value"];

export const ENGAGEMENT_TYPES = options([
  ["blogs_only", "Blogs only", "sky"],
  ["devrel_retainer", "DevRel retainer", "violet"],
  ["launch_content", "Launch content", "orange"],
  ["github_growth", "GitHub growth", "emerald"],
  ["community_program", "Community program", "amber"],
  ["campaign", "Campaign", "rose"],
  ["internal", "Internal (Studio1)", "stone"],
] as const);
export type BuiltInType = (typeof ENGAGEMENT_TYPES)[number]["value"];
/**
 * A built-in type, or one the team made on the Templates page
 * ("custom_launch_support"): a saved template under its own key.
 */
export type EngagementType = BuiltInType | `custom_${string}`;

export function isCustomType(value: unknown): value is `custom_${string}` {
  return typeof value === "string" && /^custom_[a-z0-9_]{1,40}$/.test(value);
}

/** "Launch support" → "custom_launch_support"; null when nothing is left. */
export function customTypeKey(name: string): `custom_${string}` | null {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+/, "")
    .slice(0, 40)
    .replace(/_+$/, "");
  return slug ? `custom_${slug}` : null;
}

/** The built-in types, then the team's own by name. */
export function engagementTypes(
  saved: readonly { engagement_type: string; name?: string | null }[] = [],
): readonly Labelled<EngagementType>[] {
  const own = saved
    .filter((row) => isCustomType(row.engagement_type))
    .map((row) => {
      const words = row.engagement_type.slice(7).replace(/_/g, " ");
      return {
        value: row.engagement_type as EngagementType,
        label: row.name || words.charAt(0).toUpperCase() + words.slice(1),
        tone: "stone" as Tone,
      };
    })
    .sort((a, b) => a.label.localeCompare(b.label));
  return [...ENGAGEMENT_TYPES, ...own];
}

export const ENGAGEMENT_STATUSES = options([
  ["planned", "Not started", "sky"],
  ["active", "Active", "emerald"],
  ["paused", "Paused", "amber"],
  ["ended", "Ended", "stone"],
] as const);
export type EngagementStatus = (typeof ENGAGEMENT_STATUSES)[number]["value"];

export const CADENCES = options([
  ["weekly", "Weekly"],
  ["monthly", "Monthly"],
] as const);
export type Cadence = (typeof CADENCES)[number]["value"];

export const CYCLE_STATES = options([
  ["planning", "Planning", "sky"],
  ["active", "Active", "emerald"],
  ["closing", "Closing", "amber"],
  ["closed", "Closed", "stone"],
] as const);
export type CycleState = (typeof CYCLE_STATES)[number]["value"];

export const INVOICE_STATES = options([
  ["not_sent", "Not sent", "stone"],
  ["sent", "Sent", "amber"],
  ["paid", "Paid", "emerald"],
] as const);
export type InvoiceState = (typeof INVOICE_STATES)[number]["value"];

/**
 * The plan's ten kinds, plus the ones its scope templates need (republish,
 * launch and community posts, outreach, events, calls, onboarding, growth
 * snapshot, distribution plan) and "other".
 */
export const DELIVERABLE_KINDS = options([
  ["blog", "Blog"],
  ["republish", "Republish"],
  ["video", "Video"],
  ["demo", "Demo"],
  ["cookbook", "Cookbook"],
  ["cookbook_pr", "Cookbook PR"],
  ["launch_post", "Launch post"],
  ["social_post", "Social post"],
  ["reddit_post", "Reddit post"],
  ["community_post", "Community post"],
  ["outreach", "Community outreach"],
  ["talk", "Talk"],
  ["event", "Event"],
  ["call", "Call"],
  ["onboarding", "Onboarding"],
  ["audit", "Audit"],
  ["case_study", "Case study"],
  ["report", "Report"],
  ["snapshot", "Growth snapshot"],
  ["plan", "Plan"],
  ["other", "Other"],
] as const);
export type DeliverableKind = (typeof DELIVERABLE_KINDS)[number]["value"];

/** The workflow, in board order. */
export const DELIVERABLE_STATUSES = options([
  ["planned", "Planned", "stone"],
  ["in_progress", "In progress", "sky"],
  ["internal_review", "Internal review", "violet"],
  ["client_review", "Client review", "amber"],
  ["changes_requested", "Changes requested", "rose"],
  ["approved", "Approved", "emerald"],
  ["published", "Published", "emerald"],
] as const);
export type DeliverableStatus = (typeof DELIVERABLE_STATUSES)[number]["value"];

/**
 * Written pieces (a blog and the like) read their stages as writing: Not
 * started → Writing → In review (optional) → Sent for approval → Approved →
 * Published. Other kinds keep the plain names above.
 */
export const WRITTEN_KINDS: ReadonlySet<DeliverableKind> = new Set([
  "blog",
  "republish",
  "cookbook",
  "case_study",
  "launch_post",
  "report",
]);

const WRITTEN_STAGES: Record<DeliverableStatus, string> = {
  planned: "Not started",
  in_progress: "Writing",
  internal_review: "In review",
  client_review: "Sent for approval",
  changes_requested: "Changes asked",
  approved: "Approved",
  published: "Published",
};

/** A status's name for this kind of work ("Writing" for a blog). */
export function statusLabel(
  status: DeliverableStatus,
  kind?: DeliverableKind | null,
) {
  return kind && WRITTEN_KINDS.has(kind)
    ? WRITTEN_STAGES[status]
    : labelOf(DELIVERABLE_STATUSES, status);
}

/**
 * Where we publish when the client doesn't. A live link on one of these is
 * ours; any other site is the client publishing it.
 */
export const OUR_PLATFORMS = [
  { host: "medium.com", name: "Medium" },
  { host: "dev.to", name: "dev.to" },
] as const;

export type PublishedBy = { by: "studio1" | "client"; where: string };

/** A written piece's type (the Notion tracker's "Project type"). */
export const CONTENT_TYPES = options([
  ["project_tutorial", "Project tutorial", "violet"],
  ["guide", "Guide", "amber"],
  ["comparison", "Comparison", "sky"],
  ["deep_dive", "Deep dive", "emerald"],
  ["listicle", "Listicle", "orange"],
  ["opinion", "Opinion", "rose"],
  ["case_study", "Case study", "sky"],
  ["other", "Other", "stone"],
] as const);
export type ContentType = (typeof CONTENT_TYPES)[number]["value"];

/** Posts: logged with where they went up and how many saw them. */
export const POST_KINDS: ReadonlySet<DeliverableKind> = new Set([
  "social_post",
  "reddit_post",
  "community_post",
]);

/** Known sites by host, for a post's platform chips. */
const PLATFORMS: readonly (readonly [string, string])[] = [
  ["x.com", "X"],
  ["twitter.com", "X"],
  ["t.co", "X"],
  ["linkedin.com", "LinkedIn"],
  ["lnkd.in", "LinkedIn"],
  ["reddit.com", "Reddit"],
  ["redd.it", "Reddit"],
  ["daily.dev", "daily.dev"],
  ["dly.to", "daily.dev"],
  ["dev.to", "dev.to"],
  ["medium.com", "Medium"],
  ["hashnode.dev", "Hashnode"],
  ["news.ycombinator.com", "Hacker News"],
  ["youtube.com", "YouTube"],
  ["youtu.be", "YouTube"],
  ["bsky.app", "Bluesky"],
  ["discord.com", "Discord"],
  ["discord.gg", "Discord"],
  ["producthunt.com", "Product Hunt"],
  ["github.com", "GitHub"],
  ["threads.net", "Threads"],
];

/** "X", "LinkedIn"… for a link; the bare host for other sites; null if it isn't a link. */
export function platformOf(url: string | null | undefined) {
  if (!url) return null;
  let host: string;
  try {
    host = new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
  const known = PLATFORMS.find(
    ([domain]) => host === domain || host.endsWith(`.${domain}`),
  );
  return known ? known[1] : host;
}

/** A post's live links: the main one, then the extra ones. */
export function liveLinks(
  item: Pick<Deliverable, "published_url"> &
    Partial<Pick<Deliverable, "extra_urls">>,
) {
  return [item.published_url, ...(item.extra_urls ?? [])].filter(
    (url): url is string => Boolean(url),
  );
}

/** 81970 → "82K", 1250 → "1.3K", 950 → "950". */
export function shortCount(value: number) {
  if (value < 1000) return String(value);
  const [unit, size] = value >= 1_000_000 ? ["M", 1_000_000] : ["K", 1000];
  const scaled = value / size;
  return `${scaled >= 10 ? Math.round(scaled) : Math.round(scaled * 10) / 10}${unit}`;
}

export const PARTNER_TYPES = options([
  ["co_gtm", "Co-GTM", "violet"],
  ["partner", "Partner", "orange"],
  ["event", "Event", "sky"],
  ["community", "Community", "emerald"],
  ["ambassador", "Ambassador or dev", "rose"],
  ["media", "Newsletter or media", "amber"],
  ["other", "Other", "stone"],
] as const);
export type PartnerType = (typeof PARTNER_TYPES)[number]["value"];

export const PARTNER_STATUSES = options([
  ["not_started", "Not started", "stone"],
  ["in_progress", "In progress", "sky"],
  ["hold", "On hold", "rose"],
  ["done", "Done", "emerald"],
  ["dropped", "Dropped", "stone"],
] as const);
export type PartnerStatus = (typeof PARTNER_STATUSES)[number]["value"];

/** Who published a piece and where, read from its live link. */
export function publishedBy(
  url: string | null | undefined,
): PublishedBy | null {
  if (!url) return null;
  let host: string;
  try {
    host = new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
  const ours = OUR_PLATFORMS.find(
    (platform) => host === platform.host || host.endsWith(`.${platform.host}`),
  );
  return ours
    ? { by: "studio1", where: ours.name }
    : { by: "client", where: host };
}

export const WAITS_ON = options([
  ["studio1", "Studio1"],
  ["client", "The client"],
  ["third_party", "Someone else"],
] as const);
export type WaitsOn = (typeof WAITS_ON)[number]["value"];

export const SIZES = options([
  ["S", "Small"],
  ["M", "Medium"],
  ["L", "Large"],
] as const);
export type Size = (typeof SIZES)[number]["value"];

/** Points per size, for owner load against weekly capacity. */
export const SIZE_POINTS: Record<Size, number> = { S: 1, M: 2, L: 3 };

export const PERSON_ROLES = options([
  ["founder", "Founder"],
  ["devrel", "DevRel"],
  ["writer", "Writer"],
  ["socials", "Socials"],
  ["ops", "Ops"],
] as const);
export type PersonRole = (typeof PERSON_ROLES)[number]["value"];

/** When a template line's pieces are usually due in the month. */
export const DUE_RULES = options([
  ["weekly", "Spread over the weeks"],
  ["first_week", "First week"],
  ["mid_month", "Mid-month"],
  ["end_of_month", "End of the month"],
  ["per_launch", "Per launch date"],
  ["milestone", "Milestone dates"],
  ["none", "No set date"],
] as const);
export type DueRule = (typeof DUE_RULES)[number]["value"];

export const HEALTH_LEVELS = options([
  ["green", "On track", "emerald"],
  ["amber", "Needs a look", "amber"],
  ["red", "At risk", "rose"],
] as const);
export type HealthLevel = (typeof HEALTH_LEVELS)[number]["value"];

export function labelOf(list: readonly Option[], value: unknown) {
  return (
    list.find((option) => option.value === value)?.label ?? String(value ?? "")
  );
}

export function toneOf(list: readonly Option[], value: unknown): Tone {
  return list.find((option) => option.value === value)?.tone ?? "stone";
}

export function isOption<T extends string>(
  list: readonly Labelled<T>[],
  value: unknown,
): value is T {
  return (
    typeof value === "string" && list.some((option) => option.value === value)
  );
}

/* ----------------------------------------------------------------- types */

type Stamps = {
  id: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
};

export type ClientAccount = Stamps & {
  name: string;
  slug: string;
  status: ClientStatus;
  contact_name: string;
  contact_email: string | null;
  slack_channel_id: string;
  website: string | null;
  started_on: string | null;
  notes: string;
  archived_at: string | null;
  /**
   * Named links ({label, url}[], jsonb). Absent until the links migration
   * (20261116110000_client_links.sql) has run: read it with readLinks().
   */
  links?: unknown;
};

export type Engagement = Stamps & {
  client_id: string;
  name: string;
  type: EngagementType;
  status: EngagementStatus;
  /** The account owner's email. */
  owner: string | null;
  starts_on: string | null;
  ends_on: string | null;
  cadence: Cadence;
  client_tracker_url: string | null;
  contract_url: string | null;
  notes: string;
};

export type TemplateLine = {
  kind: DeliverableKind;
  /** "Blogs", "Day 0 cookbooks". */
  label: string;
  /** Per contract; the template's is only a starting point. */
  quantity: number;
  owner_role: PersonRole | null;
  due_rule: DueRule;
};

export type ScopeTemplate = {
  engagement_type: EngagementType;
  /** A team-made type's name; built-in types have none. */
  name?: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
  lines: TemplateLine[];
  rhythm: string;
};

export type Cycle = Stamps & {
  engagement_id: string;
  /** "YYYY-MM". */
  month: string;
  state: CycleState;
  scope_note: string;
  retro_note: string;
  invoice_state: InvoiceState;
  invoice_url: string | null;
};

export type ScopeLine = Stamps & {
  cycle_id: string;
  kind: DeliverableKind;
  label: string;
  planned: number;
  owner_role: PersonRole | null;
  due_rule: DueRule | null;
  position: number;
  notes: string;
};

export type Deliverable = Stamps & {
  engagement_id: string;
  cycle_id: string;
  scope_line_id: string | null;
  title: string;
  kind: DeliverableKind;
  owner: string | null;
  reviewer: string | null;
  status: DeliverableStatus;
  status_changed_at: string;
  published_at: string | null;
  blocked: boolean;
  block_reason: string;
  waits_on: WaitsOn | null;
  blocked_at: string | null;
  /** The Monday of its week. */
  week: string | null;
  due_on: string | null;
  client_due_on: string | null;
  size: Size;
  draft_url: string | null;
  review_url: string | null;
  pr_url: string | null;
  published_url: string | null;
  notes: string;
  /* From the DevRel tracker migration; missing until it has run. */
  content_type?: ContentType | null;
  views?: number | null;
  extra_urls?: string[] | null;
};

/** A dated win for an engagement: "1,000 GitHub stars", "#3 trending in Go". */
export type Milestone = Stamps & {
  engagement_id: string;
  happened_on: string;
  title: string;
  metric: string;
  value: number | null;
  url: string | null;
  notes: string;
};

/** Co-GTM or partner outreach for an engagement. */
export type Partner = Stamps & {
  engagement_id: string;
  name: string;
  website: string | null;
  type: PartnerType;
  status: PartnerStatus;
  owner: string | null;
  notes: string;
  pitch: string;
  latest: string;
  client_input: string;
  follow_up_on: string | null;
};

export type StatusEventKind = "created" | "status" | "blocked" | "unblocked";

export type StatusEvent = {
  id: string;
  at: string;
  by: string | null;
  deliverable_id: string;
  kind: StatusEventKind;
  from_status: DeliverableStatus | null;
  to_status: DeliverableStatus | null;
  comment: string;
};

export type ClientPerson = {
  email: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
  name: string;
  role: PersonRole;
  weekly_capacity: number;
  slack_user_id: string;
  active: boolean;
};

/** The links on a deliverable, in the order the forms show them. */
export const LINK_FIELDS = [
  ["draft_url", "Draft"],
  ["review_url", "Review copy"],
  ["pr_url", "Pull request"],
  ["published_url", "Published"],
] as const satisfies readonly (readonly [keyof Deliverable, string])[];

/** Shown wherever people paste links. */
export const NO_SECRETS_HINT =
  "Links only. Never paste passwords, API keys or tokens here: share those in a password manager.";

/** What a save or change returns to the browser (same shape as community). */
export type ActionResult =
  | {
      ok: true;
      message?: string;
      id?: string;
      /** A new client's short name, for opening its page. */
      slug?: string;
      /** The main change was saved, but a follow-on step wasn't. */
      warning?: string;
    }
  | { ok: false; message: string };

export const TEMPLATES_MIGRATION_HINT =
  "Run the custom templates migration (supabase/migrations/20261118100000_custom_templates.sql) in Supabase first.";

export const CLIENTS_MIGRATION_HINT =
  "Run the client work migration (supabase/migrations/20261115130000_client_work.sql) in Supabase first.";

/* ------------------------------------------------------------- templates */

function line(
  kind: DeliverableKind,
  label: string,
  quantity: number,
  owner_role: PersonRole | null,
  due_rule: DueRule,
): TemplateLine {
  return { kind, label, quantity, owner_role, due_rule };
}

/**
 * The plan's monthly scope per engagement type. Quantities are a starting
 * point; the contract sets the real ones, and the account owner adjusts each
 * month's cycle. A type with a saved row (client_scope_templates) uses that.
 */
export const DEFAULT_TEMPLATES: Record<
  BuiltInType,
  { lines: TemplateLine[]; rhythm: string }
> = {
  blogs_only: {
    lines: [
      line("blog", "Blogs", 4, "writer", "weekly"),
      line("republish", "Republish (Medium or dev.to)", 0, "writer", "weekly"),
      line("report", "Monthly report", 1, "founder", "end_of_month"),
    ],
    rhythm: "Topic list in week 1, drafts weekly, client review.",
  },
  devrel_retainer: {
    lines: [
      line("blog", "Blogs", 2, "writer", "weekly"),
      line("video", "Videos", 1, "devrel", "weekly"),
      line("demo", "Demos or sample apps", 1, "devrel", "mid_month"),
      line("social_post", "Social posts", 4, "socials", "weekly"),
      line("reddit_post", "Reddit posts", 2, "socials", "weekly"),
      line("outreach", "Community outreach", 1, "devrel", "weekly"),
      line("talk", "Events or talks", 0, "devrel", "milestone"),
      line("report", "Monthly report", 1, "founder", "end_of_month"),
    ],
    rhythm: "Monday plan, Friday results.",
  },
  launch_content: {
    lines: [
      line("cookbook", "Day 0 cookbooks", 1, "devrel", "per_launch"),
      line("launch_post", "Launch posts", 1, "socials", "per_launch"),
      line("demo", "Demo posts", 1, "devrel", "per_launch"),
      line("video", "Weekly video", 4, "devrel", "weekly"),
      line("cookbook_pr", "Cookbook PRs", 1, "devrel", "per_launch"),
    ],
    rhythm: "Plan per model launch date, Monday plan, Friday results.",
  },
  github_growth: {
    lines: [
      line("audit", "Repo or DX audit", 1, "devrel", "first_week"),
      line("launch_post", "Launch posts", 1, "socials", "milestone"),
      line("community_post", "Community posts", 2, "socials", "weekly"),
      line("snapshot", "Star and traffic snapshot", 4, "ops", "weekly"),
    ],
    rhythm: "Weekly growth snapshot.",
  },
  community_program: {
    lines: [
      line("call", "Cohort calls", 4, "devrel", "weekly"),
      line("onboarding", "Onboarding", 1, "ops", "first_week"),
      line("other", "Champion content", 2, "devrel", "weekly"),
      line("event", "Event presence", 0, "devrel", "milestone"),
    ],
    rhythm: "Fixed call cadence with calendar invites.",
  },
  campaign: {
    lines: [
      line("blog", "Campaign pieces", 4, "writer", "milestone"),
      line("plan", "Distribution plan", 1, "socials", "first_week"),
      line("report", "Wrap-up report", 1, "founder", "end_of_month"),
    ],
    rhythm: "Milestone dates instead of a monthly loop.",
  },
  internal: {
    lines: [
      line("blog", "Studio1 blog posts", 2, "writer", "weekly"),
      line("social_post", "Studio1 social posts", 8, "socials", "weekly"),
    ],
    rhythm: "Our own blog and socials. No client review step.",
  },
};

/** A type's template: its saved row when there is one, else the default. */
export function templateFor(
  type: EngagementType,
  saved: readonly Pick<
    ScopeTemplate,
    "engagement_type" | "lines" | "rhythm"
  >[] = [],
): { lines: TemplateLine[]; rhythm: string; custom: boolean } {
  const row = saved.find((item) => item.engagement_type === type);
  if (row && Array.isArray(row.lines))
    return { lines: row.lines, rhythm: row.rhythm, custom: true };
  // A team-made type whose row is gone starts empty.
  const builtIn = DEFAULT_TEMPLATES[type as BuiltInType] ?? {
    lines: [],
    rhythm: "",
  };
  return { ...builtIn, custom: false };
}

/* ----------------------------------------------------------------- dates */

export function isMonthKey(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

/** "2026-11-15" → "2026-11". */
export function monthOf(day: string) {
  return day.slice(0, 7);
}

/** This month in IST. */
export function thisMonth(at = new Date()) {
  return monthOf(todayKey(at));
}

/** "2026-11" moved by n months: shiftMonth("2026-11", 2) → "2027-01". */
export function shiftMonth(month: string, n: number) {
  const [year, index] = month.split("-").map(Number);
  return new Date(Date.UTC(year, index - 1 + n, 1)).toISOString().slice(0, 7);
}

export function daysInMonth(month: string) {
  const [year, index] = month.split("-").map(Number);
  return new Date(Date.UTC(year, index, 0)).getUTCDate();
}

export function firstDay(month: string) {
  return `${month}-01`;
}

export function lastDay(month: string) {
  return `${month}-${String(daysInMonth(month)).padStart(2, "0")}`;
}

/**
 * How much of a month has gone, 0 to 1, counting today as gone: 1 for past
 * months, 0 for future ones.
 */
export function monthElapsed(month: string, today = todayKey()) {
  const current = monthOf(today);
  if (month < current) return 1;
  if (month > current) return 0;
  return Number(today.slice(8)) / daysInMonth(month);
}

const monthLong = new Intl.DateTimeFormat("en-GB", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});
const monthShort = new Intl.DateTimeFormat("en-GB", {
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

/** "November 2026", or "Nov 2026" with short. */
export function monthLabel(month: string, short = false) {
  if (!isMonthKey(month)) return month;
  return (short ? monthShort : monthLong).format(
    new Date(`${month}-01T00:00:00Z`),
  );
}

/** 1 = Monday … 7 = Sunday. */
export function isoWeekday(day: string) {
  const weekday = new Date(`${day}T00:00:00Z`).getUTCDay();
  return weekday === 0 ? 7 : weekday;
}

/** The Monday of the week a day falls in: the week's key. */
export function weekStart(day = todayKey()) {
  return addDays(day, 1 - isoWeekday(day));
}

/** A valid week key: a date that is a Monday. */
export function isWeekKey(value: unknown): value is string {
  return isDateKey(value) && isoWeekday(value) === 1;
}

export function weekEnd(week: string) {
  return addDays(week, 6);
}

export function shiftWeek(week: string, n: number) {
  return addDays(week, n * 7);
}

/** The seven days of a week, Monday first. */
export function weekDays(week: string) {
  return Array.from({ length: 7 }, (_, index) => addDays(week, index));
}

export function inWeek(day: string | null | undefined, week: string) {
  return (
    Boolean(day) && (day as string) >= week && (day as string) <= weekEnd(week)
  );
}

const dayMonth = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});

/** "9–15 Nov", or "30 Nov – 6 Dec" across months. */
export function weekLabel(week: string) {
  const end = weekEnd(week);
  const startDate = new Date(`${week}T00:00:00Z`);
  const endDate = new Date(`${end}T00:00:00Z`);
  if (week.slice(0, 7) === end.slice(0, 7))
    return `${Number(week.slice(8))}–${dayMonth.format(endDate)}`;
  return `${dayMonth.format(startDate)} – ${dayMonth.format(endDate)}`;
}

/** The Mondays whose weeks touch a month, in order. */
export function weeksOfMonth(month: string) {
  const weeks: string[] = [];
  for (
    let week = weekStart(firstDay(month));
    week <= lastDay(month);
    week = shiftWeek(week, 1)
  )
    weeks.push(week);
  return weeks;
}

/* ------------------------------------------------------------- formatters */

export function plural(count: number, one: string, many = `${one}s`) {
  return `${count} ${count === 1 ? one : many}`;
}

/** "3 pts", "1 pt". */
export function pointsLabel(points: number) {
  return `${points} ${points === 1 ? "pt" : "pts"}`;
}

export function percentOf(done: number, planned: number) {
  return planned > 0 ? Math.round((done / planned) * 100) : 0;
}

/** A person's name: their client_people name, else from the address. */
export function personName(
  email: string | null | undefined,
  names: Readonly<Record<string, string>> = {},
) {
  if (!email) return "";
  return names[email.toLowerCase()] || ownerName(email);
}

/** email → name from the capacity list (names that are set only). */
export function namesFrom(
  people: readonly Pick<ClientPerson, "email" | "name">[],
) {
  const names: Record<string, string> = {};
  for (const person of people)
    if (person.name) names[person.email.toLowerCase()] = person.name;
  return names;
}

/** "/clients/acme". */
export function clientPath(slug: string) {
  return `/clients/${encodeURIComponent(slug)}`;
}
