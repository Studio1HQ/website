import type { Role } from "@/lib/internal/roles";

/**
 * The internal dashboard's sections: one per form table, plus the two
 * read-only views. Everything here is plain data, so it can go to client
 * components. Statuses match the check constraints in
 * supabase/migrations/20261102140000_review_and_filters.sql.
 */

export const JOB_STATUSES = [
  "new",
  "reviewing",
  "shortlisted",
  "interviewing",
  "offer",
  "hired",
  "rejected",
  "withdrawn",
] as const;

export const HACKATHON_STATUSES = [
  "new",
  "confirmed",
  "waitlisted",
  "rejected",
  "attended",
  "no_show",
  "withdrawn",
] as const;

export const COHORT_STATUSES = [
  "new",
  "reviewing",
  "shortlisted",
  "accepted",
  "waitlisted",
  "rejected",
] as const;

export type SectionKey =
  | "jobs"
  | "hackathons"
  | "cohort"
  | "subscribers"
  | "partner-pool";

/** A filter in the Filter menu: one column, any of the chosen values. */
export type Facet = {
  /** URL parameter. */
  key: string;
  column: string;
  label: string;
  type: "value" | "boolean" | "array";
  /** Column holding a readable name for each value. */
  labelColumn?: string;
  /** Fixed names for values. */
  labels?: Record<string, string>;
};

export type ColumnKind =
  | "person"
  | "text"
  | "status"
  | "tags"
  | "date"
  | "link"
  | "list"
  | "team";

export type ColumnSpec = {
  key: string;
  label: string;
  kind: ColumnKind;
  labels?: Record<string, string>;
  /** Hide on narrow screens. */
  wide?: boolean;
};

export type Section = {
  key: SectionKey;
  title: string;
  /** Sidebar label. */
  nav: string;
  /** Sidebar group. */
  group: "Pipelines" | "Audiences";
  description: string;
  path: string;
  table: string;
  /** The column that tells rows apart; also settles ties when rows load in pages. */
  idColumn: string;
  /** Rows link to a detail page in this section. */
  detail: boolean;
  /** The date a row is "received" on, for sorting and the date filter. */
  dateColumn: string;
  /** Columns the search box matches. */
  search: string[];
  facets: Facet[];
  columns: ColumnSpec[];
  /** Review statuses; only on tables the team reviews. */
  statuses?: readonly string[];
  /** One-click actions on each row. */
  quick?: { positive: string; negative: string };
  /** The table has a tags column (after the dashboard migration). */
  tags: boolean;
  tagPresets: string[];
  /** Columns the list needs from Supabase. */
  listSelect: string[];
  /** The least role that can open this section. */
  minRole: Role;
  /** What tells one entry from the same person's others (role, event…). */
  repeatLabel?: string;
};

/** The careers page promises a reply within a week; flag New entries at 5 days. */
export const OVERDUE_DAYS = 5;

export const TAG_PRESETS = ["Strong fit", "Maybe", "Not a fit", "Follow up"];

const YES_NO = { yes: "Yes", no: "No" };

export const SECTIONS: Record<SectionKey, Section> = {
  jobs: {
    key: "jobs",
    title: "Job applications",
    nav: "Jobs",
    group: "Pipelines",
    description: "Everyone who applied through the careers pages.",
    path: "/internal/jobs",
    table: "job_applications",
    idColumn: "id",
    detail: true,
    dateColumn: "created_at",
    search: ["name", "email", "location", "job_title"],
    facets: [
      { key: "role", column: "job_id", label: "Role", type: "value", labelColumn: "job_title" },
      { key: "start", column: "start_availability", label: "Can start", type: "value" },
      { key: "location", column: "location", label: "Location", type: "value" },
      { key: "updates", column: "email_updates", label: "Wants future emails", type: "boolean", labels: YES_NO },
    ],
    columns: [
      { key: "name", label: "Applicant", kind: "person" },
      { key: "job_title", label: "Role", kind: "text" },
      { key: "location", label: "Location", kind: "text", wide: true },
      { key: "start_availability", label: "Can start", kind: "text", wide: true },
      { key: "tags", label: "Tags", kind: "tags" },
      { key: "review_status", label: "Status", kind: "status" },
      { key: "created_at", label: "Applied", kind: "date" },
    ],
    statuses: JOB_STATUSES,
    repeatLabel: "job_title",
    quick: { positive: "shortlisted", negative: "rejected" },
    tags: true,
    tagPresets: [...TAG_PRESETS, "Referral"],
    listSelect: [
      "id", "created_at", "updated_at", "name", "email", "job_id", "job_title",
      "location", "start_availability", "email_updates", "review_status",
    ],
    minRole: "viewer",
  },
  hackathons: {
    key: "hackathons",
    title: "Hackathon registrations",
    nav: "Hackathons",
    group: "Pipelines",
    description: "Everyone who registered for a Studio1 hackathon.",
    path: "/internal/hackathons",
    table: "hackathon_registrations",
    idColumn: "id",
    detail: true,
    dateColumn: "created_at",
    search: ["name", "email", "github", "country", "team_name"],
    facets: [
      { key: "event", column: "hackathon_slug", label: "Event", type: "value", labelColumn: "hackathon_name" },
      { key: "track", column: "track", label: "Track", type: "value" },
      {
        key: "team",
        column: "team",
        label: "Team",
        type: "value",
        labels: { solo: "Going solo", team: "Has a team", looking: "Looking for a team" },
      },
      { key: "role", column: "role", label: "Role", type: "value" },
      { key: "experience", column: "experience", label: "Experience", type: "value" },
      { key: "country", column: "country", label: "Country", type: "value" },
      { key: "partners", column: "partner_consent", label: "Open to partner referrals", type: "boolean", labels: YES_NO },
    ],
    columns: [
      { key: "name", label: "Participant", kind: "person" },
      { key: "hackathon_name", label: "Event", kind: "text" },
      { key: "track", label: "Track", kind: "text", wide: true },
      {
        key: "team",
        label: "Team",
        kind: "team",
        labels: { solo: "Solo", looking: "Looking" },
        wide: true,
      },
      { key: "country", label: "Country", kind: "text", wide: true },
      { key: "tags", label: "Tags", kind: "tags" },
      { key: "review_status", label: "Status", kind: "status" },
      { key: "created_at", label: "Registered", kind: "date" },
    ],
    statuses: HACKATHON_STATUSES,
    repeatLabel: "hackathon_name",
    quick: { positive: "confirmed", negative: "rejected" },
    tags: true,
    tagPresets: [...TAG_PRESETS, "Needs a team"],
    listSelect: [
      "id", "created_at", "updated_at", "name", "email", "github", "hackathon_slug",
      "hackathon_name", "role", "experience", "country", "team", "team_name", "track",
      "partner_consent", "review_status",
    ],
    minRole: "viewer",
  },
  cohort: {
    key: "cohort",
    title: "DevRel Cohort applications",
    nav: "DevRel Cohort",
    group: "Pipelines",
    description: "Everyone who applied to the DevRel Cohort.",
    path: "/internal/cohort",
    table: "devrel_cohort_applications",
    idColumn: "id",
    detail: true,
    dateColumn: "created_at",
    search: ["name", "email", "location", "role", "favorite_tool"],
    facets: [
      { key: "cohort", column: "cohort", label: "Cohort", type: "value" },
      { key: "role", column: "role", label: "Role", type: "value" },
      { key: "location", column: "location", label: "Location", type: "value" },
      {
        key: "outcome",
        column: "outcome",
        label: "Outcome",
        type: "value",
        labels: { completed: "Completed", dropped: "Dropped", interviewed: "Interviewed", hired: "Hired" },
      },
      { key: "partners", column: "partner_consent", label: "Open to partner referrals", type: "boolean", labels: YES_NO },
    ],
    columns: [
      { key: "name", label: "Applicant", kind: "person" },
      { key: "cohort", label: "Cohort", kind: "text" },
      { key: "role", label: "Role", kind: "text", wide: true },
      { key: "location", label: "Location", kind: "text", wide: true },
      { key: "tags", label: "Tags", kind: "tags" },
      { key: "review_status", label: "Status", kind: "status" },
      { key: "created_at", label: "Applied", kind: "date" },
    ],
    statuses: COHORT_STATUSES,
    repeatLabel: "cohort",
    quick: { positive: "shortlisted", negative: "rejected" },
    tags: true,
    tagPresets: TAG_PRESETS,
    listSelect: [
      "id", "created_at", "updated_at", "name", "email", "cohort", "role", "location",
      "favorite_tool", "partner_consent", "outcome", "review_status",
    ],
    minRole: "viewer",
  },
  subscribers: {
    key: "subscribers",
    title: "Email subscribers",
    nav: "Subscribers",
    group: "Audiences",
    description:
      "Everyone who opted in to emails about future roles, cohorts and events, one row per address.",
    path: "/internal/subscribers",
    table: "email_subscribers",
    idColumn: "email",
    detail: false,
    dateColumn: "last_seen",
    search: ["email", "name"],
    facets: [
      {
        key: "form",
        column: "forms",
        label: "Signed up on",
        type: "array",
        labels: { job: "Careers", hackathon: "Hackathons", devrel_cohort: "DevRel Cohort" },
      },
    ],
    columns: [
      { key: "name", label: "Person", kind: "person" },
      {
        key: "forms",
        label: "Signed up on",
        kind: "list",
        labels: { job: "Careers", hackathon: "Hackathons", devrel_cohort: "DevRel Cohort" },
      },
      { key: "first_opted_in", label: "First opted in", kind: "date", wide: true },
      { key: "last_seen", label: "Last seen", kind: "date" },
    ],
    tags: false,
    tagPresets: [],
    listSelect: ["email", "name", "forms", "first_opted_in", "last_seen"],
    minRole: "admin",
  },
  "partner-pool": {
    key: "partner-pool",
    title: "Partner referral pool",
    nav: "Partner pool",
    group: "Audiences",
    description:
      "Cohort applicants and hackathon registrants who agreed that Studio1 can refer them to partner companies.",
    path: "/internal/partner-pool",
    table: "partner_referral_pool",
    idColumn: "record_id",
    detail: false,
    dateColumn: "created_at",
    search: ["name", "email", "role", "location", "program"],
    facets: [
      {
        key: "form",
        column: "form",
        label: "Came from",
        type: "value",
        labels: { devrel_cohort: "DevRel Cohort", hackathon: "Hackathons" },
      },
      { key: "program", column: "program", label: "Program", type: "value" },
      { key: "role", column: "role", label: "Role", type: "value" },
      { key: "location", column: "location", label: "Location", type: "value" },
    ],
    columns: [
      { key: "name", label: "Person", kind: "person" },
      { key: "program", label: "Program", kind: "text" },
      { key: "role", label: "Role", kind: "text", wide: true },
      { key: "location", label: "Location", kind: "text", wide: true },
      { key: "profile", label: "Profile", kind: "link", wide: true },
      { key: "review_status", label: "Status", kind: "status" },
      { key: "referred_to", label: "Referred to", kind: "list", wide: true },
      { key: "created_at", label: "Joined", kind: "date" },
    ],
    tags: false,
    tagPresets: [],
    listSelect: [
      "form", "record_id", "program", "name", "email", "location", "role", "profile",
      "work", "review_status", "outcome", "referred_to", "created_at",
    ],
    minRole: "admin",
  },
};

export const SECTION_ORDER: SectionKey[] = [
  "jobs",
  "hackathons",
  "cohort",
  "subscribers",
  "partner-pool",
];

export const PIPELINES: SectionKey[] = ["jobs", "hackathons", "cohort"];

export function sectionFor(key: unknown): Section | null {
  return typeof key === "string" && Object.hasOwn(SECTIONS, key)
    ? SECTIONS[key as SectionKey]
    : null;
}

/** Which section a `form` value from the views belongs to. */
export const FORM_SECTION: Record<string, SectionKey> = {
  job: "jobs",
  hackathon: "hackathons",
  devrel_cohort: "cohort",
};

export const PAGE_SIZE = 50;

export const SORTS = {
  newest: "Newest first",
  oldest: "Oldest first",
  updated: "Recently updated",
  name: "Name A–Z",
} as const;
export type SortKey = keyof typeof SORTS;

export const SINCE = {
  "1d": { label: "Last 24 hours", days: 1 },
  "7d": { label: "Last 7 days", days: 7 },
  "30d": { label: "Last 30 days", days: 30 },
  "90d": { label: "Last 90 days", days: 90 },
} as const;
export type SinceKey = keyof typeof SINCE;

export type Filters = {
  status?: string;
  q?: string;
  tags: string[];
  /** Facet key → chosen values (any of). */
  facets: Record<string, string[]>;
  since?: SinceKey;
  /** Only New entries older than OVERDUE_DAYS. */
  overdue?: boolean;
  sort: SortKey;
  page: number;
};

type Params = Record<string, string | string[] | undefined>;

function all(value: string | string[] | undefined) {
  return (Array.isArray(value) ? value : value ? [value] : [])
    .map((item) => item.slice(0, 120))
    .filter(Boolean)
    .slice(0, 20);
}

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export function cleanSearch(value: unknown) {
  if (typeof value !== "string") return undefined;
  const cleaned = value.replace(/\s+/g, " ").trim().slice(0, 80);
  return cleaned || undefined;
}

/** A tag as stored: trimmed, single spaces, at most 32 characters. */
export function cleanTag(value: unknown) {
  if (typeof value !== "string") return null;
  const tag = value
    .replace(/[^\p{L}\p{N} &+/._-]/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 32);
  return tag || null;
}

export function parseFilters(section: Section, params: Params): Filters {
  const status = first(params.status);
  const since = first(params.since);
  const sort = first(params.sort);
  const page = Number.parseInt(first(params.page) ?? "1", 10);
  const facets: Record<string, string[]> = {};
  for (const facet of section.facets) {
    const values = all(params[facet.key]);
    if (values.length) facets[facet.key] = values;
  }
  return {
    status: section.statuses?.includes(status ?? "") ? status : undefined,
    q: cleanSearch(first(params.q)),
    tags: section.tags
      ? all(params.tag).map(cleanTag).filter((tag): tag is string => Boolean(tag))
      : [],
    facets,
    since: since && Object.hasOwn(SINCE, since) ? (since as SinceKey) : undefined,
    overdue: Boolean(section.statuses) && first(params.overdue) === "1",
    sort: sort && Object.hasOwn(SORTS, sort) ? (sort as SortKey) : "newest",
    page: Number.isFinite(page) && page > 0 ? Math.min(page, 10_000) : 1,
  };
}

/** The filters as URL search params, for links, the CSV export and paging. */
export function filterParams(filters: Partial<Filters>, options: { page?: boolean } = {}) {
  const params = new URLSearchParams();
  if (filters.status) params.set("status", filters.status);
  if (filters.q) params.set("q", filters.q);
  for (const tag of filters.tags ?? []) params.append("tag", tag);
  for (const [key, values] of Object.entries(filters.facets ?? {})) {
    for (const value of values) params.append(key, value);
  }
  if (filters.since) params.set("since", filters.since);
  if (filters.overdue) params.set("overdue", "1");
  if (filters.sort && filters.sort !== "newest") params.set("sort", filters.sort);
  if (options.page !== false && filters.page && filters.page > 1) {
    params.set("page", String(filters.page));
  }
  return params;
}

export function withQuery(path: string, params: URLSearchParams) {
  const query = params.toString();
  return query ? `${path}?${query}` : path;
}

export const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function statusLabel(status: string) {
  const label = status.replace(/_/g, " ");
  return label.charAt(0).toUpperCase() + label.slice(1);
}
