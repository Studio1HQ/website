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

/** Platforms whose posts have views. A newsletter has opens instead. */
export const VIEW_PLATFORMS: readonly Platform[] = PLATFORMS.map((platform) => platform.value).filter(
  (platform) => platform !== "newsletter",
);

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
    value: "newsletter_primary",
    platform: "newsletter",
    label: "Primary sponsor (top slot)",
  },
  {
    value: "newsletter_feature",
    platform: "newsletter",
    label: "Sponsored feature",
  },
  {
    value: "newsletter_secondary",
    platform: "newsletter",
    label: "Secondary slot",
  },
  {
    value: "newsletter_classified",
    platform: "newsletter",
    label: "Classified ad",
  },
  {
    value: "newsletter_dedicated",
    platform: "newsletter",
    label: "Dedicated send",
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

/**
 * The domains a creator covers, picked from this list so the roster can be
 * filtered by them. What they actually post about goes in "Posts about".
 */
export const NICHES = options([
  ["ai_ml", "AI & ML"],
  ["ai_agents", "AI agents"],
  ["devtools", "Dev tools"],
  ["open_source", "Open source"],
  ["cloud", "Cloud & infra"],
  ["devops", "DevOps & SRE"],
  ["web", "Web dev"],
  ["mobile", "Mobile"],
  ["data", "Data & databases"],
  ["security", "Security"],
  ["web3", "Web3"],
  ["startups", "Startups & founders"],
  ["careers", "Careers & learning"],
  ["product", "Product & design"],
] as const);
export type Niche = (typeof NICHES)[number]["value"];

export function isNiche(value: unknown): value is Niche {
  return NICHES.some((niche) => niche.value === value);
}

export function nicheLabel(value: string) {
  return NICHES.find((niche) => niche.value === value)?.label ?? value;
}

/** Audience size by followers on a platform, as agencies usually split it. */
export const SIZES = [
  { value: "nano", label: "Nano", note: "under 10k", min: 0, max: 10_000 },
  { value: "micro", label: "Micro", note: "10k–100k", min: 10_000, max: 100_000 },
  { value: "mid", label: "Mid", note: "100k–500k", min: 100_000, max: 500_000 },
  { value: "macro", label: "Macro", note: "500k–1M", min: 500_000, max: 1_000_000 },
  { value: "mega", label: "Mega", note: "1M and up", min: 1_000_000, max: Number.POSITIVE_INFINITY },
] as const;
export type Size = (typeof SIZES)[number]["value"];

export function isSize(value: unknown): value is Size {
  return SIZES.some((size) => size.value === value);
}

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
    key: "niches",
    label: "Niche",
    type: "tags",
    options: NICHES,
    wide: true,
    help: "Pick every domain they cover; the roster filters by these.",
  },
  {
    key: "topics",
    label: "Posts about",
    type: "text",
    max: 200,
    wide: true,
    placeholder: "MCP servers, Cursor tips, building agents in TypeScript",
    help: "The topics themselves, in their words.",
  },
  {
    key: "audience",
    label: "Who follows them",
    type: "text",
    max: 200,
    wide: true,
    placeholder: "Junior and mid-level devs, mostly India and the US",
  },
  {
    key: "languages",
    label: "Posts in",
    type: "text",
    max: 80,
    placeholder: "English, Hindi",
    suggestions: ["English", "English, Hindi", "Hindi", "Spanish", "Portuguese"],
  },
  {
    key: "content_style",
    label: "Style",
    type: "text",
    max: 140,
    placeholder: "Tutorials and demos",
    suggestions: [
      "Tutorials and demos",
      "Deep dives",
      "News and hot takes",
      "Memes and humour",
      "Tool reviews",
      "Shorts and reels",
      "Live streams",
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
    label: "Handle or name",
    type: "text",
    max: 80,
    placeholder: "@priyabuilds, or the newsletter's name",
  },
  {
    key: "url",
    label: "Link",
    type: "url",
    placeholder: "https://x.com/priyabuilds",
    help: "For a newsletter, its site: its icon shows on the Newsletters tab.",
  },
  {
    key: "followers",
    label: "Followers or subscribers",
    type: "int",
    placeholder: "120k",
    help: "120k and 1.2M work.",
  },
  {
    key: "posts_per_month",
    label: "Posts or issues a month",
    type: "int",
    placeholder: "20",
    help: "How often they post here.",
  },
  {
    key: "median_views",
    label: "Typical views (median)",
    type: "int",
    placeholder: "32k",
    help: "The middle post of their last 10 or so: line them up, take the one in the middle.",
    showIf: { key: "platform", values: VIEW_PLATFORMS },
  },
  {
    key: "avg_views",
    label: "Average views (mean)",
    type: "int",
    placeholder: "45k",
    help: "All views over those posts, divided by how many.",
    showIf: { key: "platform", values: VIEW_PLATFORMS },
  },
  {
    key: "best_views",
    label: "Best recent post",
    type: "int",
    placeholder: "310k",
    help: "Views on their biggest post of the last few months.",
    showIf: { key: "platform", values: VIEW_PLATFORMS },
  },
  {
    key: "avg_engagements",
    label: "Engagements a post",
    type: "int",
    placeholder: "900",
    help: "Likes, comments, reposts and saves added up, on a usual post.",
    showIf: { key: "platform", values: VIEW_PLATFORMS },
  },
  {
    key: "open_rate",
    label: "Open rate, %",
    type: "money",
    placeholder: "42",
    help: "From their media kit or sponsor page.",
    showIf: { key: "platform", values: ["newsletter"] },
  },
  {
    key: "click_rate",
    label: "Click rate, %",
    type: "money",
    placeholder: "4.5",
    help: "Subscribers who click a link in an issue.",
    showIf: { key: "platform", values: ["newsletter"] },
  },
  { key: "checked_on", label: "Numbers checked on", type: "date" },
  { key: "notes", label: "Notes", type: "textarea", max: 1000, wide: true },
];

/**
 * "Add newsletter": the publication and its newsletter channel in one form.
 * The keys are the two tables' own; NEWSLETTER_CHANNEL_KEYS go to the
 * channel, the rest to the influencer row.
 */
export const NEWSLETTER_FIELDS: readonly FieldDef[] = [
  {
    key: "name",
    label: "Newsletter",
    type: "text",
    required: true,
    max: 140,
    placeholder: "TLDR AI",
  },
  {
    key: "url",
    label: "Site",
    type: "url",
    placeholder: "https://tldr.tech/ai",
    help: "Its icon shows on the Newsletters tab.",
  },
  {
    key: "followers",
    label: "Subscribers",
    type: "int",
    placeholder: "500k",
    help: "120k and 1.2M work.",
  },
  { key: "posts_per_month", label: "Issues a month", type: "int", placeholder: "20" },
  {
    key: "open_rate",
    label: "Open rate, %",
    type: "money",
    placeholder: "42",
    help: "From their media kit or sponsor page.",
  },
  {
    key: "click_rate",
    label: "Click rate, %",
    type: "money",
    placeholder: "4.5",
  },
  {
    key: "niches",
    label: "Niche",
    type: "tags",
    options: NICHES,
    wide: true,
  },
  {
    key: "topics",
    label: "Covers",
    type: "text",
    max: 200,
    wide: true,
    placeholder: "AI news, new models and tools, a weekly paper",
  },
  {
    key: "audience",
    label: "Who reads it",
    type: "text",
    max: 200,
    wide: true,
    placeholder: "Engineers and founders building with AI, mostly US",
  },
  { key: "status", label: "Status", type: "select", options: STATUSES },
  { key: "owner", label: "Owner", type: "owner" },
  {
    key: "contact_via",
    label: "Sponsorship contact",
    type: "text",
    max: 140,
    placeholder: "Their advertise page, or sponsors@…",
  },
  { key: "email", label: "Email", type: "email" },
  { key: "checked_on", label: "Numbers checked on", type: "date" },
  { key: "notes", label: "Notes", type: "textarea", max: 5000, wide: true },
];

export const NEWSLETTER_CHANNEL_KEYS = [
  "url",
  "followers",
  "posts_per_month",
  "open_rate",
  "click_rate",
  "checked_on",
] as const;

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
  "median_views",
  "avg_views",
  "best_views",
  "avg_engagements",
  "views",
  "likes",
  "comments",
  "reposts",
  "saves",
  "clicks",
] as const;

/** Percent fields: "42", "42.5" or "42%", from 0 to 100. */
export const PERCENT_KEYS = ["open_rate", "click_rate"] as const;

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
  /** Values from NICHES. */
  niches: string[];
  topics: string;
  audience: string;
  languages: string;
  content_style: string;
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
  /** The middle post's views: what a usual post gets. */
  median_views: number | null;
  /** The mean; a few viral posts can lift it well above the median. */
  avg_views: number | null;
  best_views: number | null;
  avg_engagements: number | null;
  posts_per_month: number | null;
  /** Newsletters: percent of subscribers who open an issue, and who click. */
  open_rate: number | null;
  click_rate: number | null;
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

export const INFLUENCER_DETAILS_HINT =
  "Niches, audience and the median and best views need one more step: run supabase/migrations/20261118140000_influencer_details.sql in the Supabase SQL editor, then try again.";

export const INFLUENCERS_MIGRATION_HINT =
  "Influencers needs its tables first: run supabase/migrations/20261118130000_influencers.sql in the Supabase SQL editor, then reload.";
