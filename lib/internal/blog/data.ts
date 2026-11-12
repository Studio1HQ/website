import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import matter from "gray-matter";
import { DEFAULT_AUTHOR } from "@/lib/blog";
import { isCoverArt } from "@/lib/blog-cover-art";
import { deleteRows, insertRow, selectRows, updateRows } from "@/lib/supabase-server";
import type { Staff } from "@/lib/internal/session";
import { readRepoFile } from "@/lib/internal/blog/github";
import {
  BLOG_STATUSES,
  FIELD_KEYS,
  MANAGED_FRONTMATTER,
  MEDIA_PREFIX,
  nameFromEmail,
  normalizeTag,
  slugify,
  type BlogEvent,
  type BlogEventKind,
  type BlogFields,
  type BlogPostRow,
  type BlogStatus,
} from "@/lib/internal/blog/shared";

/**
 * Blog posts in the dashboard (blog_posts, blog_events). Who sees what:
 * blog reviewers and admins see every post; writers only the posts they
 * started. Callers pass the signed-in person from requireBlog().
 */

const POSTS = "blog_posts";
const EVENTS = "blog_events";
export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const CONTENT_DIR = path.join(process.cwd(), "content/blog");

type BlogStaff = Pick<Staff, "email" | "blog">;

export function canSee(staff: BlogStaff, post: Pick<BlogPostRow, "created_by">) {
  return staff.blog === "reviewer" || post.created_by === staff.email;
}

export function isReviewer(staff: BlogStaff) {
  return staff.blog === "reviewer";
}

export { nameFromEmail };

function migrationHint(message: string) {
  return /blog_posts|blog_events|relation .* does not exist|PGRST205/i.test(message)
    ? "Run the blog migration (20261112140000_blog_and_roles.sql) in Supabase first."
    : "Couldn't reach the database. Try again in a minute.";
}

const LIST_COLUMNS =
  "id,created_at,updated_at,created_by,updated_by,status,reviewers,slug,title,seo_title,description,tags,authors,publish_date,unlisted,cover_art,banner_image,source_path,published_at,published_by";

export type BlogListItem = Omit<BlogPostRow, "body" | "tldr_summary" | "tldr_bullets" | "banner_image_alt" | "extra_frontmatter" | "source_sha" | "published_commit">;

export async function listPosts(staff: BlogStaff): Promise<{ ok: true; posts: BlogListItem[] } | { ok: false; message: string }> {
  const query = new URLSearchParams({ select: LIST_COLUMNS, order: "updated_at.desc", limit: "500" });
  if (!isReviewer(staff)) query.set("created_by", `eq.${staff.email}`);
  const result = await selectRows<BlogListItem>(POSTS, query);
  return result.ok ? { ok: true, posts: result.rows } : { ok: false, message: migrationHint(result.message) };
}

export async function getPost(staff: BlogStaff, id: string): Promise<BlogPostRow | null> {
  if (!UUID.test(id)) return null;
  const result = await selectRows<BlogPostRow>(POSTS, new URLSearchParams({ select: "*", id: `eq.${id}`, limit: "1" }));
  const post = result.ok ? result.rows[0] : undefined;
  return post && canSee(staff, post) ? post : null;
}

export async function listEvents(postId: string): Promise<BlogEvent[]> {
  const result = await selectRows<BlogEvent>(
    EVENTS,
    new URLSearchParams({ select: "*", post_id: `eq.${postId}`, order: "created_at.asc", limit: "500" }),
  );
  return result.ok ? result.rows : [];
}

export async function addEvent(
  postId: string,
  actor: string,
  kind: BlogEventKind,
  body = "",
  extra: { quote?: string; parent_id?: string } = {},
) {
  const id = randomUUID();
  const row: Record<string, unknown> = { id, post_id: postId, actor, kind, body: body.slice(0, 5000) };
  // Only sent when used, so plain events still save before the threads migration.
  if (extra.quote) row.quote = extra.quote;
  if (extra.parent_id) row.parent_id = extra.parent_id;
  const result = await insertRow(EVENTS, row);
  if (!result.ok) console.error(`[blog] saving a ${kind} event failed: ${result.message}`);
  return result.ok ? id : null;
}

/** A thread's first comment on this post, or null. */
export async function getThread(postId: string, threadId: string) {
  if (!UUID.test(threadId)) return null;
  const result = await selectRows<BlogEvent>(
    EVENTS,
    new URLSearchParams({ select: "*", id: `eq.${threadId}`, post_id: `eq.${postId}`, kind: "eq.comment", parent_id: "is.null", limit: "1" }),
  );
  return result.ok ? (result.rows[0] ?? null) : null;
}

/** Everyone who wrote in a thread. */
export async function threadPeople(threadId: string) {
  const result = await selectRows<{ actor: string }>(
    EVENTS,
    new URLSearchParams({ select: "actor", or: `(id.eq.${threadId},parent_id.eq.${threadId})`, limit: "200" }),
  );
  return result.ok ? [...new Set(result.rows.map((row) => row.actor))] : [];
}

/** Resolves a thread, or opens it again. */
export async function resolveThread(postId: string, threadId: string, by: string, resolved: boolean) {
  const result = await updateRows(
    EVENTS,
    new URLSearchParams({ id: `eq.${threadId}`, post_id: `eq.${postId}`, kind: "eq.comment", parent_id: "is.null" }),
    resolved ? { resolved_at: new Date().toISOString(), resolved_by: by } : { resolved_at: null, resolved_by: null },
  );
  if (!result.ok) console.error(`[blog] resolving a thread on ${postId} failed: ${result.message}`);
  return result.ok && result.count > 0;
}


/** Starts a post. The author defaults to the writer's name. */
export async function createPost(staff: BlogStaff) {
  const id = randomUUID();
  const result = await insertRow(POSTS, {
    id,
    created_by: staff.email,
    updated_by: staff.email,
    authors: [nameFromEmail(staff.email)],
  });
  return result.ok ? { ok: true as const, id } : { ok: false as const, message: migrationHint(result.message) };
}

const text = (value: unknown, max: number) => (typeof value === "string" ? value.slice(0, max) : "");
const list = (value: unknown, items: number, max: number) =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === "string").slice(0, items).map((item) => item.slice(0, max)) : [];

/** Only known fields, each cleaned and capped. Unknown input is dropped. */
export function cleanFields(postId: string, input: unknown): Partial<BlogFields> {
  const fields = (typeof input === "object" && input !== null ? input : {}) as Record<string, unknown>;
  const out: Partial<BlogFields> = {};
  for (const key of FIELD_KEYS) {
    if (!(key in fields)) continue;
    const value = fields[key];
    switch (key) {
      case "title":
        out.title = text(value, 200);
        break;
      case "seo_title":
        out.seo_title = text(value, 120);
        break;
      case "slug":
        out.slug = text(value, 100).toLowerCase().replace(/[^a-z0-9-]/g, "");
        break;
      case "description":
        out.description = text(value, 400);
        break;
      case "tldr_summary":
        out.tldr_summary = text(value, 600);
        break;
      case "tldr_bullets":
        out.tldr_bullets = list(value, 6, 300);
        break;
      case "tags":
        out.tags = [...new Set(list(value, 12, 60).map(normalizeTag).filter(Boolean))];
        break;
      case "authors":
        out.authors = list(value, 6, 80).map((name) => name.trim()).filter(Boolean);
        break;
      case "publish_date":
        out.publish_date = typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
        break;
      case "unlisted":
        out.unlisted = value === true;
        break;
      case "cover_art":
        out.cover_art = isCoverArt(value) ? value : null;
        break;
      case "banner_image": {
        // Only this post's uploads or files already on the site.
        const src = text(value, 300);
        out.banner_image =
          src.startsWith(`${MEDIA_PREFIX}${postId}/`) || /^\/blog\/uploads\/[a-z0-9-]+\/[\w.-]+$/.test(src) ? src : null;
        break;
      }
      case "banner_image_alt":
        out.banner_image_alt = text(value, 200) || null;
        break;
      case "body":
        out.body = text(value, 400_000);
        break;
    }
  }
  return out;
}

export type SaveResult =
  | { ok: true; updated_at: string; status: BlogStatus }
  | { ok: false; conflict?: boolean; message: string };

/**
 * Autosave. `base` is the updated_at the editor last saw: when someone else
 * saved in between, nothing is written and the editor offers to reload.
 * Edits move a post back for another look: an approved post a writer
 * changes goes back to review, and a live post becomes a draft with
 * unpublished changes.
 */
export async function savePost(staff: BlogStaff, id: string, input: unknown, base: string): Promise<SaveResult> {
  const post = await getPost(staff, id);
  if (!post) return { ok: false, message: "This post doesn't exist or isn't yours." };
  const fields = cleanFields(id, input);
  let status = post.status;
  if (status === "published") status = "draft";
  else if (status === "approved" && !isReviewer(staff)) status = "in_review";
  const updatedAt = new Date().toISOString();
  const result = await updateRows(
    POSTS,
    new URLSearchParams({ id: `eq.${id}`, updated_at: `eq.${base}` }),
    { ...fields, status, updated_at: updatedAt, updated_by: staff.email },
  );
  if (!result.ok) {
    console.error(`[blog] saving ${id} failed: ${result.message}`);
    return { ok: false, message: migrationHint(result.message) };
  }
  if (result.count === 0) {
    return { ok: false, conflict: true, message: "Someone else saved this post since you opened it." };
  }
  return { ok: true, updated_at: updatedAt, status };
}

export async function setStatus(
  id: string,
  patch: { status: BlogStatus; reviewers?: string[] } & Record<string, unknown>,
  by: string,
) {
  if (!BLOG_STATUSES.includes(patch.status)) return false;
  // updated_at is the editor's save version: only content changes (a publish
  // moving image links) bump it, so a review never collides with typing.
  const touchesContent = "body" in patch || "banner_image" in patch;
  const result = await updateRows(POSTS, new URLSearchParams({ id: `eq.${id}` }), {
    ...patch,
    ...(touchesContent ? { updated_at: new Date().toISOString() } : {}),
    updated_by: by,
  });
  if (!result.ok) console.error(`[blog] status change on ${id} failed: ${result.message}`);
  return result.ok && result.count > 0;
}

/** Deletes a post that never went live (its history goes with it). */
export async function deletePost(id: string) {
  const result = await deleteRows(POSTS, new URLSearchParams({ id: `eq.${id}`, source_path: "is.null" }));
  if (!result.ok) console.error(`[blog] deleting ${id} failed: ${result.message}`);
  return result.ok && result.count > 0;
}

/** Sidebar badge: posts waiting for a reviewer, or a writer's posts with news. */
export async function blogBadge(staff: BlogStaff): Promise<number> {
  const query = new URLSearchParams({ select: "id", limit: "1" });
  if (isReviewer(staff)) query.set("status", "eq.in_review");
  else {
    query.set("created_by", `eq.${staff.email}`);
    query.set("status", "in.(changes_requested,approved)");
  }
  const result = await selectRows(POSTS, query, { count: true });
  return result.ok ? (result.total ?? 0) : 0;
}

// ---------------------------------------------------------------------
// Posts already on the site (content/blog), for reviewers to edit.
// ---------------------------------------------------------------------

export type SitePost = { slug: string; title: string; date: string; unlisted: boolean; path: string };

/** Live posts in this deployment's content/blog, newest first. */
export function sitePosts(): SitePost[] {
  if (!fs.existsSync(CONTENT_DIR)) return [];
  return fs
    .readdirSync(CONTENT_DIR)
    .filter((name) => name.endsWith(".mdx"))
    .flatMap((name) => {
      const { data } = matter(fs.readFileSync(path.join(CONTENT_DIR, name), "utf8"));
      if (data.draft === true) return [];
      const date = data.date instanceof Date ? data.date.toISOString().slice(0, 10) : String(data.date ?? "");
      return [
        {
          slug: typeof data.slug === "string" && data.slug ? data.slug : name.replace(/\.mdx$/, ""),
          title: String(data.title ?? name),
          date,
          unlisted: data.unlisted === true,
          path: `content/blog/${name}`,
        },
      ];
    })
    .sort((a, b) => b.date.localeCompare(a.date));
}

/** Slugs other posts already use, so two posts never share a URL. */
export async function takenSlugs(except: { id: string; sourcePath: string | null }) {
  const live = sitePosts()
    .filter((post) => post.path !== except.sourcePath)
    .map((post) => post.slug);
  const result = await selectRows<{ id: string; slug: string }>(
    POSTS,
    new URLSearchParams({ select: "id,slug", slug: "neq.", id: `neq.${except.id}`, limit: "1000" }),
  );
  const drafts = result.ok ? result.rows.map((row) => row.slug) : [];
  return [...new Set([...live, ...drafts])];
}

const dateString = (value: unknown) =>
  value instanceof Date ? value.toISOString().slice(0, 10) : typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value) ? value.slice(0, 10) : null;

/**
 * Opens a live post in the editor: reads its file from GitHub (the source
 * of truth; this deployment's copy when GitHub isn't set up) and makes a
 * dashboard post for it, or returns the one that already exists.
 */
export async function importSitePost(staff: BlogStaff, slug: string) {
  const site = sitePosts().find((post) => post.slug === slug);
  if (!site) return { ok: false as const, message: "That post isn't on the site." };

  const existing = await selectRows<{ id: string }>(
    POSTS,
    new URLSearchParams({ select: "id", source_path: `eq.${site.path}`, limit: "1" }),
  );
  if (!existing.ok) return { ok: false as const, message: migrationHint(existing.message) };
  if (existing.rows[0]) return { ok: true as const, id: existing.rows[0].id };

  const remote = await readRepoFile(site.path);
  const source = remote.ok ? remote.content : fs.readFileSync(path.join(CONTENT_DIR, path.basename(site.path)), "utf8");
  const { data, content } = matter(source);
  const fileSlug = path.basename(site.path, ".mdx");
  const postSlug = typeof data.slug === "string" && data.slug ? data.slug : fileSlug;
  // Older posts point bannerImage at a saved copy of the generated cover.
  const banner = typeof data.bannerImage === "string" ? data.bannerImage.trim() : "";
  const generatedCopy = /\/blog\/uploads\/[^/]+\/cover\.png$/.test(banner);
  const bannerAlt = typeof data.bannerImageAlt === "string" && data.bannerImageAlt !== "banner-image" ? data.bannerImageAlt : null;
  const extra = Object.fromEntries(Object.entries(data).filter(([key]) => !MANAGED_FRONTMATTER.has(key)));
  const authors = Array.isArray(data.authors)
    ? data.authors.map(String)
    : typeof data.author === "string"
      ? [data.author]
      : [DEFAULT_AUTHOR];
  const tags = Array.isArray(data.tags)
    ? data.tags.flatMap((tag: unknown) => String(tag).split(",")).map(normalizeTag).filter(Boolean)
    : [];
  const date = dateString(data.date);

  const id = randomUUID();
  const inserted = await insertRow(POSTS, {
    id,
    created_by: staff.email,
    updated_by: staff.email,
    status: "published",
    slug: slugify(postSlug) === postSlug ? postSlug : fileSlug,
    title: String(data.title ?? ""),
    seo_title: String(data.seoTitle ?? ""),
    description: String(data.description ?? ""),
    tldr_summary: String(data.tldrSummary ?? ""),
    tldr_bullets: Array.isArray(data.tldrBullets) ? data.tldrBullets.map(String) : [],
    tags: [...new Set(tags)],
    authors,
    publish_date: date,
    unlisted: data.unlisted === true,
    cover_art: isCoverArt(data.coverArt) ? data.coverArt : null,
    banner_image: banner && !generatedCopy ? banner : null,
    banner_image_alt: banner && !generatedCopy ? bannerAlt : null,
    body: content.replace(/^\s*\n/, ""),
    extra_frontmatter: extra,
    source_path: site.path,
    source_sha: remote.ok ? remote.sha : null,
    published_at: date ? `${date}T00:00:00Z` : null,
  });
  if (!inserted.ok) {
    // Someone opened it at the same moment: use theirs.
    if (inserted.duplicate) return importSitePost(staff, slug);
    return { ok: false as const, message: migrationHint(inserted.message) };
  }
  return { ok: true as const, id };
}
