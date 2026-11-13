import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { parseQuestions, type FormQuestion } from "@/lib/form-questions";
import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n";

const jobsDirectory = path.join(process.cwd(), "content/careers/jobs");
const jobFilePattern = /\.mdx?$/;

export type JobOpening = {
  id: string;
  title: string;
  description: string;
  department: string;
  location: string;
  type: string;
  status: string;
  applySubject: string;
  isRemote: boolean;
  openings: number;
  order: number;
  postedDate: string;
  requisitionId: string;
};

export type JobDetail = JobOpening & {
  content: string;
  /**
   * The role's own questions on the application form, in place of the
   * generic plan link. From the brief's `questions` frontmatter.
   */
  questions: FormQuestion[];
};

type JobFrontmatter = {
  id?: string;
  title?: string;
  description?: string;
  department?: string;
  location?: string;
  type?: string;
  status?: string;
  applySubject?: string;
  isRemote?: boolean;
  openings?: number;
  order?: number;
  postedDate?: string | Date | number;
  requisitionId?: string | number;
  questions?: unknown;
};

function toFrontmatterString(value: unknown): string | undefined {
  if (value == null) return undefined;
  if (value instanceof Date) {
    return value.toISOString().split("T")[0];
  }
  return String(value).trim();
}

function toJobOpening(
  raw: JobFrontmatter,
  fallbackId: string,
  index: number,
): JobOpening | null {
  const id = raw.id?.trim() || fallbackId;
  if (!raw.title?.trim()) return null;

  return {
    id,
    title: raw.title.trim(),
    description: raw.description?.trim() ?? "",
    department: raw.department?.trim() ?? "General",
    location: raw.location?.trim() ?? "Remote",
    type: raw.type?.trim() ?? "Full-time",
    status: raw.status?.trim() ?? "Open",
    applySubject: raw.applySubject?.trim() ?? raw.title.trim(),
    isRemote: raw.isRemote !== false,
    openings:
      typeof raw.openings === "number" && raw.openings > 0
        ? Math.floor(raw.openings)
        : 1,
    order: typeof raw.order === "number" ? raw.order : index + 1,
    postedDate:
      toFrontmatterString(raw.postedDate) ??
      new Date().toISOString().split("T")[0],
    requisitionId:
      toFrontmatterString(raw.requisitionId) ??
      id.toUpperCase().replace(/-/g, "_"),
  };
}

function localeDirectory(locale: Locale) {
  return path.join(jobsDirectory, locale);
}

function getLocaleJobFiles(locale: Locale) {
  const directory = localeDirectory(locale);
  if (!fs.existsSync(directory)) return [];

  return fs
    .readdirSync(directory)
    .filter((fileName) => jobFilePattern.test(fileName))
    .sort();
}

export function validateLocalizedJobs() {
  const sourceFiles = getLocaleJobFiles(DEFAULT_LOCALE);
  if (sourceFiles.length === 0) {
    throw new Error(
      `Missing localized job files in ${localeDirectory(DEFAULT_LOCALE)}`,
    );
  }
}

function readJobFile(fileName: string, locale: Locale): JobDetail | null {
  const fullPath = path.join(localeDirectory(locale), fileName);
  const fileContents = fs.readFileSync(fullPath, "utf8");
  const { data, content } = matter(fileContents);
  const fallbackId = fileName.replace(/\.mdx?$/, "");
  const meta = toJobOpening(data as JobFrontmatter, fallbackId, 0);

  if (!meta) return null;

  return {
    ...meta,
    content: content.trim(),
    questions: parseQuestions(
      (data as JobFrontmatter).questions,
      `content/careers/jobs/${locale}/${fileName}`,
    ),
  };
}

export function getJobOpenings(locale: Locale = DEFAULT_LOCALE): JobOpening[] {
  validateLocalizedJobs();
  const directory = localeDirectory(locale);
  if (!fs.existsSync(directory)) return [];

  const fileNames = fs
    .readdirSync(directory)
    .filter((fileName) => jobFilePattern.test(fileName));

  return fileNames
    .map((fileName) => readJobFile(fileName, locale))
    .filter((job): job is JobDetail => job !== null)
    .map(({ content: _content, ...meta }) => meta)
    .sort((a, b) => a.order - b.order);
}

export function getJobById(
  id: string,
  locale: Locale = DEFAULT_LOCALE,
): JobDetail | null {
  validateLocalizedJobs();
  const directory = localeDirectory(locale);
  const markdownPath = path.join(directory, `${id}.md`);
  const mdxPath = path.join(directory, `${id}.mdx`);
  const fullPath = fs.existsSync(markdownPath)
    ? markdownPath
    : fs.existsSync(mdxPath)
      ? mdxPath
      : null;

  if (!fullPath) return null;

  return readJobFile(path.basename(fullPath), locale);
}

export function getJobIds(): string[] {
  return getJobOpenings(DEFAULT_LOCALE).map((job) => job.id);
}
