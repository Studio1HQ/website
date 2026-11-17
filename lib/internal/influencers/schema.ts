import type { FieldDef, Option, Tone } from "@/lib/internal/community/schema";

/**
 * Influencers: the creators Studio1 can book, what each one charges for
 * each format on each platform, how their posts usually do, and how the
 * ones we paid for did. Record types, their fields and option lists. Plain
 * data, safe for client components; the server checks input against the
 * same field lists.
 *
 * Tables: supabase/migrations/20261118130000_influencers.sql.
 * Dates are "YYYY-MM-DD" strings in IST, where the team works.
 *
 * Outreach keeps the conversation with someone new (its "Influencer" kind);
 * this is the roster and the numbers.
 */

function options<T extends string>(
  list: readonly (readonly [T, string, Tone?])[],
): readonly (Option & { value: T })[] {
  return list.map(([value, label, tone]) => ({ value, label, tone }));
}

export const PLATFORMS = options([
  ["x", "X", "stone"],
  ["linkedin", "LinkedIn", "sky"],
  ["youtube", "YouTube", "rose"],
  ["instagram", "Instagram", "violet"],
  ["newsletter", "Newsletter", "amber"],
  ["other", "Other", "stone"],
] as const);
export type Platform = (typeof PLATFORMS)[number]["value"];

export function isPlatform(value: unknown): value is Platform {
  return PLATFORMS.some((platform) => platform.value === value);
}

/**
 * Everything a creator can be paid for, by platform. The value is what's
 * saved; its platform is saved beside it. To add one, add a line here.
 */
export const FORMATS = [
  { value: "x_post", platform: "x", label: "Post" },
  { value: "x_thread", platform: "x", label: "Thread" },
  { value: "x_quote", platform: "x", label: "Quote tweet" },
  { value: "x_repost", platform: "x", label: "Retweet" },
  { value: "x_reply", platform: "x", label: "Comment" },
  { value: "x_like", platform: "x", label: "Like" },
  { value: "x_save", platform: "x", label: "Save" },
  { value: "linkedin_post", platform: "linkedin", label: "Post" },
  { value: "linkedin_repost", platform: "linkedin", label: "Repost" },
  { value: "linkedin_comment", platform: "linkedin", label: "Comment" },
  { value: "linkedin_like", platform: "linkedin", label: "Like" },
  { value: "linkedin_save", platform: "linkedin", label: "Save" },
  { value: "youtube_video", platform: "youtube", label: "Sponsored video" },
  { value: "youtube_section", platform: "youtube", label: "Sponsored section" },
  { value: "youtube_short", platform: "youtube", label: "Short" },
  { value: "instagram_reel", platform: "instagram", label: "Reel" },
  { value: "instagram_post", platform: "instagram", label: "Post" },
  { value: "instagram_carousel", platform: "instagram", label: "Carousel" },
  { value: "instagram_story", platform: "instagram", label: "Story" },
  { value: "instagram_collab", platform: "instagram", label: "Collab post" },
  {
    value: "newsletter_feature",
    platform: "newsletter",
    label: "Sponsored feature",
  },
  { value: "newsletter_mention", platform: "newsletter", label: "Mention" },
  { value: "other", platform: "other", label: "Something else" },
] as const satisfies readonly {
  value: string;
  platform: Platform;
  label: string;
}[];
export type Format = (typeof FORMATS)[number]["value"];

export function formatInfo(value: unknown) {
  return FORMATS.find((format) => format.value === value) ?? null;
}

export function formatsFor(platform: Platform) {
  return FORMATS.filter((format) => format.platform === platform);
}

export function platformLabel(value: unknown) {
  return (
    PLATFORMS.find((platform) => platform.value === value)?.label ?? "Other"
  );
}

/** "Quote tweet", or the saved value when the list no longer has it. */
export function formatLabel(value: unknown) {
  return formatInfo(value)?.label ?? String(value ?? "");
}

/** "X · Quote tweet": for lists that mix platforms. */
export function formatName(value: unknown) {
  const info = formatInfo(value);
  return info
    ? `${platformLabel(info.platform)} · ${info.label}`
    : String(value ?? "");
}

/** The format picker: one list, platform first, so one field says both. */
const FORMAT_OPTIONS: readonly Option[] = FORMATS.map((format) => ({
  value: format.value,
  label: formatName(format.value),
}));

export const STATUSES = options([
  ["prospect", "To approach", "stone"],
  ["talking", "In talks", "sky"],
  ["active", "Working with", "emerald"],
  ["past", "Worked with", "violet"],
  ["avoid", "Don't use", "rose"],
] as const);
export type Status = (typeof STATUSES)[number]["value"];

export function isStatus(value: unknown): value is Status {
  return STATUSES.some((status) => status.value === value);
}

/* ---------------------------------------------------------------- fields */

export const INFLUENCER_FIELDS: readonly FieldDef[] = [
  {
    key: "name",
    label: "Name",
    type: "text",
    required: true,
    max: 140,
    placeholder: "Priya Sharma",
  },
  { key: "status", label: "Status", type: "select", options: STATUSES },
  {
    key: "topics",
    label: "Posts about",
    type: "text",
    max: 200,
    placeholder: "AI agents, dev tools",
    suggestions: [
      "AI agents",
      "Dev tools",
      "Open source",
      "Cloud and infra",
      "Web dev",
      "Data and ML",
      "Startups",
    ],
  },
  {
    key: "location",
    label: "Based in",
    type: "text",
    max: 80,
    placeholder: "Bengaluru, India",
  },
  { key: "email", label: "Email", type: "email" },
  {
    key: "contact_via",
    label: "Best way to reach them",
    type: "text",
    max: 140,
    placeholder: "DM on X, or their manager Sam",
  },
  { key: "owner", label: "Owner", type: "owner" },
  {
    key: "tags",
    label: "Tags",
    type: "tags",
    placeholder: "Comma separated",
    wide: true,
  },
  {
    key: "notes",
    label: "Notes",
    type: "textarea",
    max: 5000,
    wide: true,
    placeholder: "How they like to work, turnaround, what they won't post",
  },
];

export const CHANNEL_FIELDS: readonly FieldDef[] = [
  {
    key: "platform",
    label: "Platform",
    type: "select",
    options: PLATFORMS,
    required: true,
  },
  {
    key: "handle",
    label: "Handle",
    type: "text",
    max: 80,
    placeholder: "@priyabuilds",
  },
  {
    key: "url",
    label: "Link",
    type: "url",
    placeholder: "https://x.com/priyabuilds",
  },
  {
    key: "followers",
    label: "Followers",
    type: "int",
    placeholder: "120k",
    help: "Or subscribers. 120k and 1.2M work.",
  },
  {
    key: "avg_views",
    label: "Average views a post",
    type: "int",
    placeholder: "45k",
    help: "What a normal post gets, not their best one.",
  },
  {
    key: "avg_engagements",
    label: "Average engagements a post",
    type: "int",
    placeholder: "900",
    help: "Likes, comments, reposts and saves added up.",
  },
  { key: "checked_on", label: "Numbers checked on", type: "date" },
  { key: "notes", label: "Notes", type: "textarea", max: 1000, wide: true },
];

export const RATE_FIELDS: readonly FieldDef[] = [
  {
    key: "format",
    label: "What for",
    type: "select",
    options: FORMAT_OPTIONS,
    required: true,
    wide: true,
  },
  {
    key: "price",
    label: "Price",
    type: "money",
    required: true,
    placeholder: "500",
  },
  { key: "currency", label: "Currency", type: "currency" },
  { key: "quoted_on", label: "Quoted on", type: "date" },
  {
    key: "details",
    label: "What the price covers",
    type: "text",
    max: 300,
    wide: true,
    placeholder: "Stays pinned for 24 hours, one round of edits",
  },
];

export const POST_FIELDS: readonly FieldDef[] = [
  {
    key: "format",
    label: "What they posted",
    type: "select",
    options: FORMAT_OPTIONS,
    required: true,
    wide: true,
  },
  {
    key: "campaign",
    label: "For",
    type: "text",
    max: 140,
    placeholder: "OpenLore launch",
  },
  { key: "posted_on", label: "Posted on", type: "date", required: true },
  { key: "url", label: "Link to the post", type: "url", wide: true },
  {
    key: "cost",
    label: "What we paid",
    type: "money",
    placeholder: "500",
    help: "Leave empty if it was free.",
  },
  { key: "currency", label: "Currency", type: "currency" },
  { key: "views", label: "Views", type: "int", placeholder: "38k" },
  { key: "likes", label: "Likes", type: "int" },
  { key: "comments", label: "Comments", type: "int" },
  { key: "reposts", label: "Reposts", type: "int" },
  { key: "saves", label: "Saves", type: "int" },
  { key: "clicks", label: "Link clicks", type: "int" },
  { key: "notes", label: "Notes", type: "textarea", max: 2000, wide: true },
];

/** The number fields that take "120k" and "1.2M" as well as digits. */
export const COUNT_KEYS = [
  "followers",
  "avg_views",
  "avg_engagements",
  "views",
  "likes",
  "comments",
  "reposts",
  "saves",
  "clicks",
] as const;

/* ----------------------------------------------------------------- types */

type Stamps = {
  id: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
};

export type Influencer = Stamps & {
  name: string;
  status: Status;
  topics: string;
  location: string;
  email: string | null;
  contact_via: string;
  owner: string | null;
  tags: string[];
  notes: string;
};

export type Channel = Stamps & {
  influencer_id: string;
  platform: Platform;
  handle: string;
  url: string | null;
  followers: number | null;
  avg_views: number | null;
  avg_engagements: number | null;
  checked_on: string | null;
  notes: string;
};

export type Rate = Stamps & {
  influencer_id: string;
  platform: Platform;
  format: string;
  price: number;
  currency: string;
  details: string;
  quoted_on: string | null;
};

export type Post = Stamps & {
  influencer_id: string;
  platform: Platform;
  format: string;
  campaign: string;
  posted_on: string;
  url: string | null;
  cost: number | null;
  currency: string;
  views: number | null;
  likes: number | null;
  comments: number | null;
  reposts: number | null;
  saves: number | null;
  clicks: number | null;
  notes: string;
};

export type InfluencerResult =
  { ok: true; message?: string; id?: string } | { ok: false; message: string };

export const INFLUENCERS_MIGRATION_HINT =
  "Influencers needs its tables first: run supabase/migrations/20261118130000_influencers.sql in the Supabase SQL editor, then reload.";
