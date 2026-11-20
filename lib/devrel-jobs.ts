/**
 * The public DevRel jobs board (/devrel-jobs). The listings live in Supabase
 * (devrel_jobs) and are edited on the dashboard's DevRel jobs page by anyone
 * given that area; lib/devrel-jobs-data.ts reads them. This file is pure, so
 * the board's client component can use it.
 */

export const WORKPLACES = [
  "Remote",
  "Hybrid",
  "On-site",
  "Unspecified",
] as const;
export type DevRelJobWorkplace = (typeof WORKPLACES)[number];

export function isWorkplace(value: unknown): value is DevRelJobWorkplace {
  return WORKPLACES.includes(value as DevRelJobWorkplace);
}

export type DevRelJobCategory = string;

/** Suggestions for the dashboard form; any other wording is fine too. */
export const JOB_CATEGORIES = [
  "Developer Relations",
  "Developer Advocacy",
  "Developer Experience",
  "Developer Marketing",
  "Developer Community",
  "Technical Writing",
] as const;
export const JOB_TYPES = [
  "Full-time",
  "Part-time",
  "Contract",
  "Internship",
] as const;
export const JOB_LEVELS = [
  "Junior",
  "Mid",
  "Senior",
  "Staff",
  "Principal",
  "Lead",
  "Manager",
  "Head",
  "Director",
  "Unspecified",
] as const;

export type DevRelJob = {
  id: string;
  title: string;
  company: string;
  /** Our logo route for the company's icon (see devRelJobLogo), if there's a site to take it from. */
  logo?: string;
  location: string;
  workplace: DevRelJobWorkplace;
  category: DevRelJobCategory;
  type: string;
  level: string;
  featured?: boolean;
  salary: string | null;
  url: string;
  /** "YYYY-MM-DD". */
  postedDate: string;
  tags: string[];
};

export const DEVREL_JOB_SUBMIT_URL =
  "https://github.com/Arindam200/studio1/issues/new?template=submit-devrel-job.yml";

const NEW_JOB_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;

/** Pinned listings first, then the newest. */
export function sortDevRelJobs<
  T extends Pick<DevRelJob, "featured" | "postedDate">,
>(jobs: readonly T[]): T[] {
  return jobs.slice().sort((a, b) => {
    if (Boolean(a.featured) !== Boolean(b.featured)) {
      return Number(Boolean(b.featured)) - Number(Boolean(a.featured));
    }

    return new Date(b.postedDate).getTime() - new Date(a.postedDate).getTime();
  });
}

/**
 * Hiring sites that host other companies' job pages. Their icon isn't the
 * company's, so an apply link on one of them can't stand in for the
 * company's website.
 */
const JOB_BOARD_HOSTS = [
  "ashbyhq.com",
  "greenhouse.io",
  "lever.co",
  "workable.com",
  "wellfound.com",
  "angel.co",
  "ycombinator.com",
  "workatastartup.com",
  "linkedin.com",
  "indeed.com",
  "glassdoor.com",
  "myworkdayjobs.com",
  "workday.com",
  "smartrecruiters.com",
  "bamboohr.com",
  "recruitee.com",
  "breezy.hr",
  "teamtailor.com",
  "personio.de",
  "personio.com",
  "jobvite.com",
  "rippling.com",
  "rippling-ats.com",
  "gem.com",
  "dover.com",
  "pinpointhq.com",
  "comeet.com",
  "applytojob.com",
  "jazzhr.com",
  "join.com",
  "polymer.co",
  "notion.site",
  "notion.so",
  "google.com",
  "forms.gle",
  "typeform.com",
  "tally.so",
  "github.com",
  "remoteok.com",
  "weworkremotely.com",
  "otta.com",
  "welcometothejungle.com",
];

/** The host of an http(s) address without "www.", or null. */
export function hostOf(address: string | null | undefined): string | null {
  if (!address) return null;
  try {
    const url = new URL(address);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return url.hostname.toLowerCase().replace(/^www\./, "") || null;
  } catch {
    return null;
  }
}

export function isJobBoardHost(host: string) {
  return JOB_BOARD_HOSTS.some(
    (board) => host === board || host.endsWith(`.${board}`),
  );
}

/**
 * The site a listing's logo comes from: the company's website, or else the
 * apply link when it's on the company's own site (careers.acme.com, not a
 * hiring site like jobs.ashbyhq.com). Null when there's neither.
 */
export function logoSite(job: {
  website?: string | null;
  url: string;
}): string | null {
  if (job.website && hostOf(job.website)) return job.website;
  const host = hostOf(job.url);
  return host && !isJobBoardHost(host) ? job.url : null;
}

/**
 * Our address for a listing's logo (app/api/devrel-jobs/logo/[id]): the
 * site's icon, found once and kept. ?v= is the host, so a new website gets
 * a new address instead of the old icon from a cache.
 */
export function devRelJobLogo(
  id: string,
  site: string | null,
): string | undefined {
  const host = hostOf(site);
  return host
    ? `/api/devrel-jobs/logo/${encodeURIComponent(id)}?v=${encodeURIComponent(host)}`
    : undefined;
}

export function getDevRelJobCategories(jobs: DevRelJob[]): DevRelJobCategory[] {
  return Array.from(new Set(jobs.map((job) => job.category))).sort();
}

export function getDevRelJobWorkplaces(
  jobs: DevRelJob[],
): DevRelJobWorkplace[] {
  const present = new Set(jobs.map((job) => job.workplace));
  return WORKPLACES.filter((workplace) => present.has(workplace));
}

export function getDevRelJobTypes(jobs: DevRelJob[]): string[] {
  return Array.from(new Set(jobs.map((job) => job.type))).sort();
}

export function getDevRelJobLocations(jobs: DevRelJob[]): string[] {
  return Array.from(new Set(jobs.map((job) => job.location))).sort();
}

export function getDevRelJobLevels(jobs: DevRelJob[]): string[] {
  return Array.from(new Set(jobs.map((job) => job.level))).sort();
}

export function isNewDevRelJob(job: DevRelJob, now = Date.now()): boolean {
  const posted = new Date(job.postedDate).getTime();
  if (Number.isNaN(posted)) return false;
  return now - posted <= NEW_JOB_WINDOW_MS;
}

/* ------------------------------------------------------------- records */

/** A listing as stored (devrel_jobs), with what only the dashboard shows. */
export type DevRelJobRecord = Omit<DevRelJob, "logo" | "featured"> & {
  /** The company's website, for its logo. */
  website: string | null;
  featured: boolean;
  /** Shown on the public board. */
  live: boolean;
  updatedAt: string;
  updatedBy: string | null;
};

const textOf = (value: unknown) => (typeof value === "string" ? value : "");

/** A devrel_jobs row as a record; null for anything malformed. */
export function toJobRecord(
  row: Record<string, unknown>,
): DevRelJobRecord | null {
  if (
    typeof row.id !== "string" ||
    !textOf(row.title) ||
    !textOf(row.company) ||
    !hostOf(textOf(row.url))
  ) {
    return null;
  }
  return {
    id: row.id,
    title: textOf(row.title),
    company: textOf(row.company),
    website: textOf(row.website) || null,
    url: textOf(row.url),
    location: textOf(row.location),
    workplace: isWorkplace(row.workplace) ? row.workplace : "Unspecified",
    category: textOf(row.category) || JOB_CATEGORIES[0],
    type: textOf(row.job_type) || JOB_TYPES[0],
    level: textOf(row.level) || "Unspecified",
    salary: textOf(row.salary) || null,
    postedDate: textOf(row.posted_on).slice(0, 10),
    tags: Array.isArray(row.tags)
      ? row.tags.filter(
          (tag): tag is string => typeof tag === "string" && tag !== "",
        )
      : [],
    featured: row.featured === true,
    live: row.live !== false,
    updatedAt: textOf(row.updated_at),
    updatedBy: typeof row.updated_by === "string" ? row.updated_by : null,
  };
}

/** What the public board gets: no website, editor or visibility fields. */
export function toPublicJob(record: DevRelJobRecord): DevRelJob {
  return {
    id: record.id,
    title: record.title,
    company: record.company,
    logo: devRelJobLogo(record.id, logoSite(record)),
    location: record.location,
    workplace: record.workplace,
    category: record.category,
    type: record.type,
    level: record.level,
    featured: record.featured,
    salary: record.salary,
    url: record.url,
    postedDate: record.postedDate,
    tags: record.tags,
  };
}
