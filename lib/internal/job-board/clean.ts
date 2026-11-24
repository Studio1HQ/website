import { looksLikeSecret } from "@/lib/internal/clients/clean";
import { isPublicHost } from "@/lib/internal/clients/logo-pick";
import {
  JOB_CATEGORIES,
  JOB_TYPES,
  isWorkplace,
  type DevRelJobWorkplace,
} from "@/lib/devrel-jobs";

/*
 * Checks a DevRel jobs listing from the dashboard form before it's saved
 * (app/internal/(dashboard)/job-board/actions.ts). Pure, so it's tested.
 */

/** A listing as written to devrel_jobs. */
export type JobInput = {
  title: string;
  company: string;
  website: string | null;
  url: string;
  location: string;
  workplace: DevRelJobWorkplace;
  category: string;
  job_type: string;
  level: string;
  salary: string | null;
  /** "YYYY-MM-DD". */
  posted_on: string;
  tags: string[];
  featured: boolean;
  live: boolean;
};

export type Cleaned =
  { ok: true; job: JobInput } | { ok: false; message: string };

export const MAX_TAGS = 12;

/** One line of text: spaces collapsed, trimmed, cut to `max`. */
function line(value: unknown, max: number) {
  return typeof value === "string"
    ? value.replace(/\s+/g, " ").trim().slice(0, max)
    : "";
}

/**
 * An http(s) address on a public host, or null. "acme.com/jobs" is taken as
 * https://acme.com/jobs. Addresses with a user name or password are refused.
 */
export function cleanLink(value: unknown): URL | null {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw || /\s/.test(raw)) return null;
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(raw)
    ? raw
    : `https://${raw.replace(/^\/+/, "")}`;
  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  if (url.username || url.password) return null;
  if (!isPublicHost(url.hostname)) return null;
  return url;
}

/** "AI, Databases" (or a list) → ["AI", "Databases"]: trimmed, no repeats, at most MAX_TAGS. */
export function cleanTags(value: unknown): string[] {
  const parts = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(/[,\n]/)
      : [];
  const seen = new Set<string>();
  const tags: string[] = [];
  for (const part of parts) {
    const tag = line(part, 40);
    if (!tag || seen.has(tag.toLowerCase())) continue;
    seen.add(tag.toLowerCase());
    tags.push(tag);
    if (tags.length === MAX_TAGS) break;
  }
  return tags;
}

/** A "YYYY-MM-DD" that's a real day. */
export function isDay(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    return false;
  const date = new Date(`${value}T00:00:00Z`);
  return (
    !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}

/** The day after `day` ("YYYY-MM-DD"), so a listing dated today in any time zone is fine. */
function dayAfter(day: string) {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

/**
 * The form's values as a listing to save, or what to fix. `today` is
 * "YYYY-MM-DD"; an empty posted date means today.
 */
export function cleanJob(values: unknown, today: string): Cleaned {
  const input =
    values && typeof values === "object"
      ? (values as Record<string, unknown>)
      : {};

  const title = line(input.title, 140);
  if (!title) return { ok: false, message: "Add the job title." };
  const company = line(input.company, 80);
  if (!company) return { ok: false, message: "Add the company." };

  const apply = cleanLink(input.url);
  if (!apply || apply.href.length > 1000) {
    return {
      ok: false,
      message:
        "The apply link should be a web address, like https://jobs.ashbyhq.com/acme/…",
    };
  }

  const websiteText =
    typeof input.website === "string" ? input.website.trim() : "";
  const website = websiteText ? cleanLink(websiteText) : null;
  if (websiteText && !website) {
    return {
      ok: false,
      message: "The company website should be a web address, like acme.com.",
    };
  }

  const location = line(input.location, 120);
  if (!location)
    return {
      ok: false,
      message: "Add where the job is, like Remote, Global or London, UK.",
    };

  const posted =
    typeof input.posted_on === "string" && input.posted_on.trim()
      ? input.posted_on.trim()
      : today;
  if (!isDay(posted) || posted < "2000-01-01" || posted > dayAfter(today)) {
    return {
      ok: false,
      message: "Pick the day the job was posted (today or earlier).",
    };
  }

  const salary = line(input.salary, 80) || null;
  const fields = [
    title,
    company,
    location,
    salary ?? "",
    apply.href,
    website?.href ?? "",
  ];
  if (fields.some(looksLikeSecret)) {
    return {
      ok: false,
      message: "That looks like a password or a key. Don't store those here.",
    };
  }

  return {
    ok: true,
    job: {
      title,
      company,
      // The site is all the logo needs.
      website: website ? website.origin : null,
      url: apply.href,
      location,
      workplace: isWorkplace(input.workplace) ? input.workplace : "Unspecified",
      category: line(input.category, 60) || JOB_CATEGORIES[0],
      job_type: line(input.job_type, 40) || JOB_TYPES[0],
      level: line(input.level, 40) || "Unspecified",
      salary,
      posted_on: posted,
      tags: cleanTags(input.tags),
      featured: input.featured === true,
      live: input.live !== false,
    },
  };
}

/** What the dashboard's job board actions answer. */
export type JobResult =
  { ok: true; message?: string } | { ok: false; message: string };

/** Every field of a listing: what an edit may send, and what the audit trail compares. */
const AUDITED: (keyof JobInput)[] = [
  "title",
  "company",
  "website",
  "url",
  "location",
  "workplace",
  "category",
  "job_type",
  "level",
  "salary",
  "posted_on",
  "tags",
  "featured",
  "live",
];

/**
 * An edit from the dashboard form, which sends only the fields that were
 * changed. They're checked together with the rest of the stored listing
 * (it still needs its title, apply link and so on), and `patch` is what to
 * write: the fields sent and nothing else, so two people changing different
 * fields don't undo each other.
 */
export function cleanJobEdit(
  before: Record<string, unknown>,
  values: unknown,
  today: string,
):
  | { ok: true; job: JobInput; patch: Partial<JobInput> }
  | { ok: false; message: string } {
  const sent =
    values && typeof values === "object"
      ? (values as Record<string, unknown>)
      : {};
  const cleaned = cleanJob({ ...before, ...sent }, today);
  if (!cleaned.ok) return cleaned;
  const patch = Object.fromEntries(
    AUDITED.filter((key) =>
      Object.prototype.hasOwnProperty.call(sent, key),
    ).map((key) => [key, cleaned.job[key]]),
  ) as Partial<JobInput>;
  return { ok: true, job: cleaned.job, patch };
}

/**
 * The fields a save changed, as { field: [before, after] }, for the audit
 * trail. Only the fields in `after` are compared: an edit writes a few.
 */
export function jobChanges(
  before: Partial<Record<keyof JobInput, unknown>>,
  after: Partial<JobInput>,
) {
  const changes: Record<string, [unknown, unknown]> = {};
  for (const key of AUDITED) {
    if (!Object.prototype.hasOwnProperty.call(after, key)) continue;
    const was = before[key] ?? null;
    const now = after[key] ?? null;
    if (JSON.stringify(was) !== JSON.stringify(now)) changes[key] = [was, now];
  }
  return changes;
}
