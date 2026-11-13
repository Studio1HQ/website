/**
 * Community area: record types, their fields and option lists, and small
 * helpers for money, dates and owners. Plain data, safe for client
 * components; the server checks input against the same field lists.
 *
 * Tables: supabase/migrations/20261113140000_community.sql.
 * Dates are "YYYY-MM-DD" strings in IST, where the team works.
 */

/* ----------------------------------------------------------------- tones */

export type Tone =
  "orange" | "sky" | "violet" | "amber" | "emerald" | "rose" | "stone";

export type Option = { value: string; label: string; tone?: Tone };

function options<T extends string>(
  list: readonly (readonly [T, string, Tone?])[],
): readonly (Option & { value: T })[] {
  return list.map(([value, label, tone]) => ({ value, label, tone }));
}

/* --------------------------------------------------------------- options */

export const EVENT_KINDS = options([
  ["meetup", "Meetup"],
  ["hackathon", "Hackathon"],
  ["campus", "Campus event"],
  ["workshop", "Workshop"],
  ["webinar", "Webinar"],
  ["conference", "Conference"],
  ["other", "Other"],
] as const);

export const EVENT_STATUSES = options([
  ["idea", "Idea", "stone"],
  ["planning", "Planning", "sky"],
  ["confirmed", "Confirmed", "violet"],
  ["live", "Live", "orange"],
  ["done", "Done", "emerald"],
  ["cancelled", "Cancelled", "rose"],
] as const);

export const EVENT_FORMATS = options([
  ["in_person", "In person"],
  ["online", "Online"],
  ["hybrid", "Hybrid"],
] as const);

export const GUEST_ROLES = options([
  ["attendee", "Attendee"],
  ["speaker", "Speaker"],
  ["mentor", "Mentor"],
  ["judge", "Judge"],
  ["volunteer", "Volunteer"],
  ["organiser", "Organiser"],
] as const);

export const GUEST_STATUSES = options([
  ["registered", "Registered", "sky"],
  ["confirmed", "Confirmed", "violet"],
  ["waitlisted", "Waitlisted", "amber"],
  ["attended", "Attended", "emerald"],
  ["no_show", "No-show", "rose"],
  ["cancelled", "Cancelled", "stone"],
] as const);

export const PARTNER_KINDS = options([
  ["college", "College"],
  ["club", "Student club"],
  ["venue", "Venue"],
  ["community", "Community"],
  ["company", "Company"],
] as const);

export const PARTNER_STAGES = options([
  ["prospect", "Prospect", "stone"],
  ["contacted", "Contacted", "sky"],
  ["in_talks", "In talks", "violet"],
  ["active", "Active partner", "emerald"],
  ["paused", "Paused", "amber"],
  ["ended", "Ended", "rose"],
] as const);

export const SPONSOR_STAGES = options([
  ["lead", "Lead", "stone"],
  ["contacted", "Contacted", "sky"],
  ["in_talks", "In talks", "violet"],
  ["proposal", "Proposal sent", "amber"],
  ["won", "Won", "emerald"],
  ["lost", "Lost", "rose"],
  ["paused", "Not now", "stone"],
] as const);

export const SPONSORSHIP_STATUSES = options([
  ["pledged", "Committed", "violet"],
  ["invoiced", "Invoiced", "amber"],
  ["paid", "Paid", "emerald"],
  ["cancelled", "Cancelled", "rose"],
] as const);

export const EXPENSE_CATEGORIES = options([
  ["venue", "Venue"],
  ["food", "Food & drinks"],
  ["swag", "Swag"],
  ["travel", "Travel"],
  ["prizes", "Prizes"],
  ["speakers", "Speakers"],
  ["marketing", "Marketing"],
  ["tools", "Tools"],
  ["other", "Other"],
] as const);

export const EXPENSE_STATUSES = options([
  ["planned", "Planned", "stone"],
  ["to_pay", "To pay", "amber"],
  ["paid", "Paid", "emerald"],
  ["cancelled", "Cancelled", "rose"],
] as const);

export const TASK_STATUSES = options([
  ["todo", "To do", "stone"],
  ["doing", "Doing", "sky"],
  ["blocked", "Blocked", "rose"],
  ["done", "Done", "emerald"],
] as const);

export const TASK_PRIORITIES = options([
  ["low", "Low", "stone"],
  ["normal", "Normal", "sky"],
  ["high", "High", "amber"],
  ["urgent", "Urgent", "rose"],
] as const);

export const ACTIVITY_KINDS = options([
  ["note", "Note"],
  ["email", "Email"],
  ["call", "Call"],
  ["meeting", "Meeting"],
  ["proposal", "Proposal"],
] as const);

export const CURRENCIES = options([
  ["INR", "INR ₹"],
  ["USD", "USD $"],
  ["EUR", "EUR €"],
  ["GBP", "GBP £"],
  ["SGD", "SGD S$"],
  ["AED", "AED"],
] as const);

/**
 * What a channel key must look like. The same rule is a check on
 * community_metrics.channel, so a key that fails it can't be saved.
 */
export const CHANNEL_KEY = /^[a-z0-9_]{2,24}$/;

/**
 * Growth channels with a known name; others show as typed. Every key has
 * to pass CHANNEL_KEY: X is "twitter" because one letter is too short.
 */
export const CHANNELS: Record<string, string> = {
  discord: "Discord",
  twitter: "X (Twitter)",
  linkedin: "LinkedIn",
  youtube: "YouTube",
  instagram: "Instagram",
  whatsapp: "WhatsApp",
  telegram: "Telegram",
  github: "GitHub",
  newsletter: "Newsletter",
  meetup: "Meetup group",
  luma: "Luma calendar",
  reddit: "Reddit",
};

export function channelLabel(channel: string) {
  return (
    CHANNELS[channel] ??
    channel.replace(/_/g, " ").replace(/^./, (letter) => letter.toUpperCase())
  );
}

/** Other things people type for a known channel. */
const CHANNEL_ALIASES: Record<string, string> = {
  x: "twitter",
  x_twitter: "twitter",
  x_com: "twitter",
};

/**
 * "Discord members" → "discord_members", "X" → "twitter"; null when it
 * can't be a key.
 */
export function channelKey(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const typed = value.trim().toLowerCase();
  const known = Object.entries(CHANNELS).find(
    ([, label]) => label.toLowerCase() === typed,
  );
  if (known) return known[0];
  const key = typed
    .replace(/[^a-z0-9]+/g, "_")
    .slice(0, 24)
    .replace(/^_+|_+$/g, "");
  if (Object.hasOwn(CHANNEL_ALIASES, key)) return CHANNEL_ALIASES[key];
  return CHANNEL_KEY.test(key) ? key : null;
}

export function labelOf(list: readonly Option[], value: unknown) {
  return (
    list.find((option) => option.value === value)?.label ??
    (typeof value === "string" ? value : "")
  );
}

export function toneOf(list: readonly Option[], value: unknown): Tone {
  return list.find((option) => option.value === value)?.tone ?? "stone";
}

/* ---------------------------------------------------------------- fields */

export type RefKind = "event" | "sponsor" | "partner" | "hackathon";

export type FieldType =
  | "text"
  | "textarea"
  | "select"
  | "date"
  | "time"
  | "int"
  | "money"
  | "currency"
  | "email"
  | "url"
  | "owner"
  | "tags"
  | "ref"
  | "bool"
  | "channel";

export type FieldDef = {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  options?: readonly Option[];
  ref?: RefKind;
  placeholder?: string;
  help?: string;
  /** Longest text allowed. */
  max?: number;
  /** Takes a whole row in the form. */
  wide?: boolean;
  /** Shown only while another field has one of these values. */
  showIf?: { key: string; values: readonly string[] };
  /** Typing suggestions for a text field. */
  suggestions?: readonly string[];
  /** A select's value for new records, when it isn't the first option. */
  initial?: string;
};

export type EntityKey =
  | "event"
  | "guest"
  | "partner"
  | "sponsor"
  | "contact"
  | "sponsorship"
  | "expense"
  | "task"
  | "activity"
  | "metric";

export type EntityDef = {
  key: EntityKey;
  table: string;
  /** "event", for "New event" and "Event saved". */
  noun: string;
  fields: readonly FieldDef[];
};

const NOTES: FieldDef = {
  key: "notes",
  label: "Notes",
  type: "textarea",
  wide: true,
  max: 5000,
};
const OWNER: FieldDef = {
  key: "owner",
  label: "Owner",
  type: "owner",
  placeholder: "Pick someone or type a name",
};
const TAGS: FieldDef = {
  key: "tags",
  label: "Tags",
  type: "tags",
  placeholder: "Comma separated",
  wide: true,
};

export const ENTITIES: Record<EntityKey, EntityDef> = {
  event: {
    key: "event",
    table: "community_events",
    noun: "event",
    fields: [
      {
        key: "name",
        label: "Name",
        type: "text",
        required: true,
        max: 140,
        wide: true,
        placeholder: "AI Builders Meetup Bengaluru #4",
      },
      { key: "kind", label: "Type", type: "select", options: EVENT_KINDS },
      {
        key: "status",
        label: "Status",
        type: "select",
        options: EVENT_STATUSES,
        initial: "planning",
      },
      {
        key: "format",
        label: "Format",
        type: "select",
        options: EVENT_FORMATS,
      },
      { key: "starts_on", label: "Starts", type: "date" },
      {
        key: "ends_on",
        label: "Ends",
        type: "date",
        help: "Leave blank for one-day events.",
      },
      { key: "start_time", label: "Start time", type: "time" },
      { key: "city", label: "City", type: "text", max: 80 },
      { key: "venue", label: "Venue", type: "text", max: 160 },
      {
        key: "partner_id",
        label: "Host college, club or venue",
        type: "ref",
        ref: "partner",
      },
      {
        key: "hackathon_slug",
        label: "Registrations from the site form",
        type: "ref",
        ref: "hackathon",
        help: "Counts this hackathon's sign-ups from studio1hq.com.",
        showIf: { key: "kind", values: ["hackathon"] },
      },
      {
        key: "registration_url",
        label: "Registration page",
        type: "url",
        placeholder: "https://lu.ma/…",
      },
      { key: "capacity", label: "Capacity", type: "int" },
      {
        key: "registered_count",
        label: "Registered (typed in)",
        type: "int",
        help: "Only when the guest list isn't kept here.",
      },
      { key: "attended_count", label: "Attended (typed in)", type: "int" },
      { key: "budget", label: "Budget", type: "money" },
      { key: "currency", label: "Currency", type: "currency" },
      OWNER,
      {
        key: "recap_url",
        label: "Recap link",
        type: "url",
        placeholder: "Photos, blog post or thread",
      },
      TAGS,
      NOTES,
    ],
  },
  guest: {
    key: "guest",
    table: "community_guests",
    noun: "guest",
    fields: [
      {
        key: "event_id",
        label: "Event",
        type: "ref",
        ref: "event",
        required: true,
      },
      { key: "name", label: "Name", type: "text", max: 120 },
      { key: "email", label: "Email", type: "email", required: true },
      {
        key: "organisation",
        label: "College or company",
        type: "text",
        max: 160,
      },
      { key: "role", label: "Role", type: "select", options: GUEST_ROLES },
      {
        key: "status",
        label: "Status",
        type: "select",
        options: GUEST_STATUSES,
      },
      NOTES,
    ],
  },
  partner: {
    key: "partner",
    table: "community_partners",
    noun: "partner",
    fields: [
      {
        key: "name",
        label: "Name",
        type: "text",
        required: true,
        max: 160,
        wide: true,
        placeholder: "IIT Madras, GDG on Campus, …",
      },
      { key: "kind", label: "Type", type: "select", options: PARTNER_KINDS },
      { key: "stage", label: "Stage", type: "select", options: PARTNER_STAGES },
      {
        key: "parent_id",
        label: "College",
        type: "ref",
        ref: "partner",
        showIf: { key: "kind", values: ["club"] },
      },
      { key: "city", label: "City", type: "text", max: 80 },
      { key: "country", label: "Country", type: "text", max: 80 },
      { key: "website", label: "Website", type: "url" },
      { key: "reach", label: "Students or members", type: "int" },
      {
        key: "capacity",
        label: "Seats",
        type: "int",
        showIf: { key: "kind", values: ["venue", "college"] },
      },
      {
        key: "agreement_url",
        label: "MoU or agreement",
        type: "url",
        placeholder: "Link to the signed document",
      },
      OWNER,
      {
        key: "next_step",
        label: "Next step",
        type: "text",
        max: 200,
        wide: true,
      },
      { key: "follow_up_on", label: "Follow up on", type: "date" },
      { key: "last_contact_on", label: "Last contact", type: "date" },
      TAGS,
      NOTES,
    ],
  },
  sponsor: {
    key: "sponsor",
    table: "community_sponsors",
    noun: "sponsor",
    fields: [
      {
        key: "name",
        label: "Company",
        type: "text",
        required: true,
        max: 160,
        wide: true,
      },
      { key: "stage", label: "Stage", type: "select", options: SPONSOR_STAGES },
      {
        key: "tier",
        label: "Tier",
        type: "text",
        max: 40,
        suggestions: [
          "Title",
          "Gold",
          "Silver",
          "Bronze",
          "Community",
          "In-kind",
        ],
      },
      { key: "website", label: "Website", type: "url" },
      {
        key: "industry",
        label: "Industry",
        type: "text",
        max: 80,
        placeholder: "Dev tools, AI infra, cloud…",
      },
      { key: "ask_amount", label: "Asking for", type: "money" },
      { key: "currency", label: "Currency", type: "currency" },
      {
        key: "proposal_url",
        label: "Proposal",
        type: "url",
        placeholder: "Link to the deck or doc",
      },
      { key: "proposal_sent_on", label: "Proposal sent", type: "date" },
      OWNER,
      {
        key: "next_step",
        label: "Next step",
        type: "text",
        max: 200,
        wide: true,
      },
      { key: "follow_up_on", label: "Follow up on", type: "date" },
      { key: "last_contact_on", label: "Last contact", type: "date" },
      TAGS,
      NOTES,
    ],
  },
  contact: {
    key: "contact",
    table: "community_contacts",
    noun: "contact",
    fields: [
      { key: "sponsor_id", label: "Sponsor", type: "ref", ref: "sponsor" },
      { key: "partner_id", label: "Partner", type: "ref", ref: "partner" },
      { key: "name", label: "Name", type: "text", required: true, max: 120 },
      {
        key: "title",
        label: "Role",
        type: "text",
        max: 120,
        placeholder: "DevRel lead, faculty coordinator…",
      },
      { key: "email", label: "Email", type: "email" },
      { key: "phone", label: "Phone", type: "text", max: 40 },
      { key: "linkedin", label: "LinkedIn", type: "url", wide: true },
      { key: "is_primary", label: "Main contact", type: "bool" },
      NOTES,
    ],
  },
  sponsorship: {
    key: "sponsorship",
    table: "community_sponsorships",
    noun: "sponsorship",
    fields: [
      {
        key: "sponsor_id",
        label: "Sponsor",
        type: "ref",
        ref: "sponsor",
        required: true,
      },
      {
        key: "event_id",
        label: "Event",
        type: "ref",
        ref: "event",
        help: "Blank for a general sponsorship.",
      },
      { key: "amount", label: "Amount", type: "money" },
      { key: "currency", label: "Currency", type: "currency" },
      {
        key: "status",
        label: "Status",
        type: "select",
        options: SPONSORSHIP_STATUSES,
      },
      {
        key: "in_kind",
        label: "In kind",
        type: "text",
        max: 200,
        placeholder: "Swag, credits, venue, food…",
      },
      { key: "invoice_ref", label: "Invoice number", type: "text", max: 60 },
      { key: "due_on", label: "Due on", type: "date" },
      { key: "paid_on", label: "Paid on", type: "date" },
      NOTES,
    ],
  },
  expense: {
    key: "expense",
    table: "community_expenses",
    noun: "expense",
    fields: [
      {
        key: "description",
        label: "What for",
        type: "text",
        required: true,
        max: 200,
        wide: true,
        placeholder: "Pizza for 80",
      },
      {
        key: "event_id",
        label: "Event",
        type: "ref",
        ref: "event",
        help: "Blank for general community spend.",
      },
      {
        key: "category",
        label: "Category",
        type: "select",
        options: EXPENSE_CATEGORIES,
      },
      { key: "amount", label: "Amount", type: "money" },
      { key: "currency", label: "Currency", type: "currency" },
      {
        key: "status",
        label: "Status",
        type: "select",
        options: EXPENSE_STATUSES,
      },
      { key: "vendor", label: "Paid to", type: "text", max: 120 },
      { key: "due_on", label: "Due on", type: "date" },
      { key: "paid_on", label: "Paid on", type: "date" },
      {
        key: "receipt_url",
        label: "Receipt or invoice",
        type: "url",
        wide: true,
        placeholder: "Drive link",
      },
      NOTES,
    ],
  },
  task: {
    key: "task",
    table: "community_tasks",
    noun: "task",
    fields: [
      {
        key: "title",
        label: "Task",
        type: "text",
        required: true,
        max: 200,
        wide: true,
      },
      OWNER,
      { key: "due_on", label: "Due", type: "date" },
      {
        key: "priority",
        label: "Priority",
        type: "select",
        options: TASK_PRIORITIES,
        initial: "normal",
      },
      {
        key: "status",
        label: "Status",
        type: "select",
        options: TASK_STATUSES,
      },
      { key: "event_id", label: "Event", type: "ref", ref: "event" },
      { key: "sponsor_id", label: "Sponsor", type: "ref", ref: "sponsor" },
      { key: "partner_id", label: "Partner", type: "ref", ref: "partner" },
      {
        key: "details",
        label: "Details",
        type: "textarea",
        wide: true,
        max: 5000,
      },
    ],
  },
  activity: {
    key: "activity",
    table: "community_activity",
    noun: "note",
    fields: [
      { key: "sponsor_id", label: "Sponsor", type: "ref", ref: "sponsor" },
      { key: "partner_id", label: "Partner", type: "ref", ref: "partner" },
      { key: "event_id", label: "Event", type: "ref", ref: "event" },
      { key: "kind", label: "Type", type: "select", options: ACTIVITY_KINDS },
      { key: "happened_on", label: "When", type: "date" },
      {
        key: "body",
        label: "What happened",
        type: "textarea",
        required: true,
        wide: true,
        max: 5000,
      },
    ],
  },
  metric: {
    key: "metric",
    table: "community_metrics",
    noun: "number",
    fields: [
      { key: "channel", label: "Channel", type: "channel", required: true },
      { key: "recorded_on", label: "Date", type: "date", required: true },
      {
        key: "value",
        label: "Members or followers",
        type: "int",
        required: true,
      },
      { key: "notes", label: "Notes", type: "text", max: 200 },
    ],
  },
};

/** Own keys only: "constructor" and the like are not record types. */
export function isEntityKey(value: unknown): value is EntityKey {
  return typeof value === "string" && Object.hasOwn(ENTITIES, value);
}

/** Fields that a quick status menu may change, per record type. */
export const QUICK_FIELDS: Partial<
  Record<EntityKey, { key: string; options: readonly Option[] }>
> = {
  event: { key: "status", options: EVENT_STATUSES },
  guest: { key: "status", options: GUEST_STATUSES },
  partner: { key: "stage", options: PARTNER_STAGES },
  sponsor: { key: "stage", options: SPONSOR_STAGES },
  sponsorship: { key: "status", options: SPONSORSHIP_STATUSES },
  expense: { key: "status", options: EXPENSE_STATUSES },
  task: { key: "status", options: TASK_STATUSES },
};

/** The quick menu's field for a record type, or null when it has none. */
export function quickField(entity: EntityKey) {
  return Object.hasOwn(QUICK_FIELDS, entity)
    ? (QUICK_FIELDS[entity] ?? null)
    : null;
}

/** Stages where nobody is waiting on a follow-up any more. */
export const SPONSOR_CLOSED_STAGES = ["lost", "paused"] as const;
export const PARTNER_CLOSED_STAGES = ["ended"] as const;

/**
 * What else goes when a record is deleted, shown before the second click.
 * Matches the tables' "on delete" rules in the migration.
 */
export const DELETE_NOTES: Partial<Record<EntityKey, string>> = {
  event:
    "Its guest list and notes are deleted too. Its expenses, sponsorships and tasks stay, as General.",
  sponsor:
    "Its contacts, sponsorships (paid ones too) and outreach log are deleted too. Its tasks stay.",
  partner:
    "Its contacts and outreach log are deleted too. Its events, clubs and tasks stay, unlinked.",
};

/* --------------------------------------------------------------- records */

type Stamps = {
  id: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
};

export type CommunityEvent = Stamps & {
  name: string;
  kind: string;
  status: string;
  format: string;
  starts_on: string | null;
  ends_on: string | null;
  start_time: string | null;
  city: string;
  venue: string;
  partner_id: string | null;
  hackathon_slug: string | null;
  registration_url: string | null;
  capacity: number | null;
  registered_count: number | null;
  attended_count: number | null;
  budget: number | null;
  currency: string;
  owner: string | null;
  recap_url: string | null;
  notes: string;
  tags: string[];
};

export type Guest = Stamps & {
  event_id: string;
  name: string;
  email: string;
  organisation: string;
  role: string;
  status: string;
  checked_in_at: string | null;
  source: string;
  notes: string;
};

export type Partner = Stamps & {
  name: string;
  kind: string;
  parent_id: string | null;
  stage: string;
  city: string;
  country: string;
  website: string | null;
  reach: number | null;
  capacity: number | null;
  agreement_url: string | null;
  owner: string | null;
  next_step: string;
  follow_up_on: string | null;
  last_contact_on: string | null;
  notes: string;
  tags: string[];
};

export type Sponsor = Stamps & {
  name: string;
  website: string | null;
  industry: string;
  stage: string;
  tier: string;
  ask_amount: number | null;
  currency: string;
  proposal_url: string | null;
  proposal_sent_on: string | null;
  owner: string | null;
  next_step: string;
  follow_up_on: string | null;
  last_contact_on: string | null;
  notes: string;
  tags: string[];
};

export type Contact = Stamps & {
  sponsor_id: string | null;
  partner_id: string | null;
  name: string;
  title: string;
  email: string | null;
  phone: string | null;
  linkedin: string | null;
  is_primary: boolean;
  notes: string;
};

export type Sponsorship = Stamps & {
  sponsor_id: string;
  event_id: string | null;
  amount: number | null;
  currency: string;
  in_kind: string;
  status: string;
  invoice_ref: string;
  due_on: string | null;
  paid_on: string | null;
  notes: string;
};

export type Expense = Stamps & {
  event_id: string | null;
  category: string;
  description: string;
  vendor: string;
  amount: number | null;
  currency: string;
  status: string;
  due_on: string | null;
  paid_on: string | null;
  receipt_url: string | null;
  notes: string;
};

export type Task = Stamps & {
  title: string;
  details: string;
  owner: string | null;
  due_on: string | null;
  priority: string;
  status: string;
  event_id: string | null;
  sponsor_id: string | null;
  partner_id: string | null;
  completed_at: string | null;
};

export type Activity = Stamps & {
  sponsor_id: string | null;
  partner_id: string | null;
  event_id: string | null;
  kind: string;
  body: string;
  happened_on: string;
};

export type Metric = Stamps & {
  channel: string;
  recorded_on: string;
  value: number;
  notes: string;
};

/** Options for the reference pickers, passed from the page to the forms. */
export type RefOptions = Partial<Record<RefKind, Option[]>>;

/** What a save or change returns to the browser. */
export type ActionResult =
  | {
      ok: true;
      message?: string;
      id?: string;
      /** The main change was saved, but a follow-on step wasn't. */
      warning?: string;
    }
  | { ok: false; message: string };

export const COMMUNITY_MIGRATION_HINT =
  "Run the community migration (supabase/migrations/20261113140000_community.sql) in Supabase first.";

/* ----------------------------------------------------------------- money */

export type Money = { amount: number | null; currency: string };

/** ₹1,20,000 or $500: whole units, Indian grouping for rupees. */
export function formatMoney(
  amount: number | null | undefined,
  currency = "INR",
) {
  if (amount === null || amount === undefined || !Number.isFinite(amount))
    return "—";
  try {
    return new Intl.NumberFormat(currency === "INR" ? "en-IN" : "en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString("en-IN")}`;
  }
}

/** Adds amounts per currency; blanks count as nothing. */
export function sumMoney(items: readonly Money[]): Record<string, number> {
  const totals: Record<string, number> = {};
  for (const item of items) {
    if (item.amount === null || !Number.isFinite(item.amount)) continue;
    totals[item.currency] = (totals[item.currency] ?? 0) + item.amount;
  }
  return totals;
}

/** "₹1,20,000 + $500", rupees first; "₹0" when empty. */
export function formatTotals(totals: Record<string, number>, empty = "₹0") {
  const entries = Object.entries(totals)
    .filter(([, amount]) => Math.abs(amount) > 0.004)
    .sort(([a], [b]) =>
      a === "INR" ? -1 : b === "INR" ? 1 : a.localeCompare(b),
    );
  if (!entries.length) return empty;
  return entries
    .map(([currency, amount]) =>
      formatMoney(Math.round(amount * 100) / 100, currency),
    )
    .join(" + ");
}

/** One currency's total, for bars and ratios; rupees by default. */
export function inCurrency(totals: Record<string, number>, currency = "INR") {
  return totals[currency] ?? 0;
}

/* ----------------------------------------------------------------- dates */

const IST = "Asia/Kolkata";

/** Today in IST, "YYYY-MM-DD". */
export function todayKey(at = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: IST,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(at);
}

export function isDateKey(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    return false;
  const date = new Date(`${value}T00:00:00Z`);
  return (
    !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}

/** Whole days from `from` to `to` (both "YYYY-MM-DD"). */
export function daysBetween(from: string, to: string) {
  return Math.round(
    (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) /
      86_400_000,
  );
}

export function addDays(day: string, days: number) {
  return new Date(Date.parse(`${day}T00:00:00Z`) + days * 86_400_000)
    .toISOString()
    .slice(0, 10);
}

const dayFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});
const shortDayFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});
const weekdayFormat = new Intl.DateTimeFormat("en-GB", {
  weekday: "short",
  timeZone: "UTC",
});
const monthFormat = new Intl.DateTimeFormat("en-GB", {
  month: "short",
  year: "2-digit",
  timeZone: "UTC",
});

/** "13 Nov 2026", or "13 Nov" within this year. */
export function formatDay(day: string | null | undefined, today = todayKey()) {
  if (!day || !isDateKey(day)) return "—";
  const date = new Date(`${day}T00:00:00Z`);
  return day.slice(0, 4) === today.slice(0, 4)
    ? shortDayFormat.format(date)
    : dayFormat.format(date);
}

/** "Fri, 13 Nov" or "13–15 Nov" for a range. */
export function formatEventDate(
  starts: string | null,
  ends: string | null,
  today = todayKey(),
) {
  if (!starts || !isDateKey(starts)) return "No date yet";
  const start = new Date(`${starts}T00:00:00Z`);
  if (!ends || !isDateKey(ends) || ends === starts)
    return `${weekdayFormat.format(start)}, ${formatDay(starts, today)}`;
  if (starts.slice(0, 7) === ends.slice(0, 7)) {
    return `${starts.slice(8).replace(/^0/, "")}–${formatDay(ends, today)}`;
  }
  return `${formatDay(starts, today)} – ${formatDay(ends, today)}`;
}

/** "Today", "Tomorrow", "in 5 days", "3 days ago". */
export function relativeDay(
  day: string | null | undefined,
  today = todayKey(),
) {
  if (!day || !isDateKey(day)) return "";
  const diff = daysBetween(today, day);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  return diff > 0 ? `in ${diff} days` : `${-diff} days ago`;
}

/** "2026-11" → "Nov 26". */
export function formatMonth(month: string) {
  return monthFormat.format(new Date(`${month}-01T00:00:00Z`));
}

/** The last `count` months up to this one, oldest first: ["2025-12", …]. */
export function lastMonths(count: number, today = todayKey()) {
  const [year, month] = today.split("-").map(Number);
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(Date.UTC(year, month - 1 - (count - 1 - index), 1));
    return date.toISOString().slice(0, 7);
  });
}

/* ---------------------------------------------------------------- people */

/** An owner's display name: "priya.k@studio1hq.com" → "Priya K". */
export function ownerName(owner: string | null | undefined) {
  if (!owner) return "";
  if (!owner.includes("@")) return owner;
  return owner
    .split("@")[0]
    .split(/[._+-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

/**
 * Whether a record's owner is this person. By email only: an owner typed
 * as a name ("Priya K") is a volunteer without a login, and a name is not
 * proof of who someone is.
 */
export function isOwnedBy(owner: string | null | undefined, email: string) {
  if (!owner || !email) return false;
  return owner.trim().toLowerCase() === email.trim().toLowerCase();
}

/* ------------------------------------------------------------ event math */

export type Turnout = {
  /** Everyone signed up, waitlist included, cancellations not. */
  signedUp: number;
  attended: number;
  /** attended ÷ (signed up − waitlisted), for events that are over. */
  showUp: number | null;
  /** Where the numbers came from. */
  source: "list" | "typed" | "none";
};

export type GuestCounts = {
  signed_up: number;
  attended: number;
  waitlisted: number;
  no_show: number;
};

/** An event's turnout from its guest list and site sign-ups, else typed-in numbers. */
export function turnoutOf(
  event: Pick<
    CommunityEvent,
    "registered_count" | "attended_count" | "starts_on" | "ends_on" | "status"
  >,
  guests: GuestCounts | undefined,
  hackathon: GuestCounts | undefined,
  today = todayKey(),
): Turnout {
  const listed = [guests, hackathon].filter((counts): counts is GuestCounts =>
    Boolean(counts && counts.signed_up),
  );
  let signedUp = 0;
  let attended = 0;
  let accepted = 0;
  let source: Turnout["source"] = "none";
  if (listed.length) {
    source = "list";
    for (const counts of listed) {
      signedUp += counts.signed_up;
      attended += counts.attended;
      accepted += counts.signed_up - counts.waitlisted;
    }
  } else if (event.registered_count !== null || event.attended_count !== null) {
    source = "typed";
    signedUp = event.registered_count ?? 0;
    attended = event.attended_count ?? 0;
    accepted = signedUp;
  }
  const over =
    event.status === "done" ||
    (event.ends_on ?? event.starts_on ?? "9999") < today;
  const showUp =
    over && accepted > 0 && attended > 0
      ? Math.min(1, attended / accepted)
      : null;
  return { signedUp, attended, showUp, source };
}

export function percent(value: number | null | undefined) {
  return value === null || value === undefined
    ? "—"
    : `${Math.round(value * 100)}%`;
}
