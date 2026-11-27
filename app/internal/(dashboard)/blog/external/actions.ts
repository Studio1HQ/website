"use server";

import fs from "fs";
import path from "path";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { sitePosts } from "@/lib/internal/blog/data";
import { devDraft } from "@/lib/internal/blog/devto";
import {
  createDevDraft,
  devArticlesChanged,
  devArticlesNow,
  devOrganizationId,
  isDevConfigured,
} from "@/lib/internal/blog/devto-api";
import { requireBlog } from "@/lib/internal/session";

/*
 * Blog → External. Server actions are public endpoints: each checks the
 * session and the Blog reviewer role first, and cleans its input.
 */

/** Back to the page with a note in the URL (`sent`, `already` or `error`). */
function back(query: Record<string, string>): never {
  redirect(`/blog/external?${new URLSearchParams(query)}`);
}

function refresh() {
  devArticlesChanged();
  revalidatePath("/internal/blog/external");
}

/**
 * Sends a live post to DEV as an unpublished draft, its canonical URL on
 * studio1hq.com. Checks DEV first, so a post is never copied twice.
 */
export async function sendToDev(slug: unknown) {
  await requireBlog("reviewer");
  if (typeof slug !== "string" || !/^[a-z0-9-]{1,120}$/.test(slug))
    back({ error: "That post isn't valid." });
  const post = sitePosts().find((item) => item.slug === slug);
  if (!post) back({ error: "That post isn't on the site." });
  if (!isDevConfigured())
    back({ error: "DEV isn't connected yet. Add DEV_API_KEY first." });

  const list = await devArticlesNow();
  if (!list.ok)
    back({
      error: `Couldn't check DEV first, so nothing was sent. ${list.message}`,
    });
  const existing = list.articles.find((article) => article.slug === slug);
  if (existing) {
    refresh();
    const at = existing.url ? new URL(existing.url).pathname : "";
    back({ already: slug, ...(at ? { at } : {}) });
  }

  let source: string;
  try {
    // Every site post is content/blog/<file>. Reading from that folder (not
    // any path) keeps the build from tracing the whole project, public/
    // images included, into this function: that went over Vercel's 250 MB.
    source = fs.readFileSync(
      path.join(process.cwd(), "content", "blog", path.basename(post.path)),
      "utf8",
    );
  } catch {
    back({ error: "Couldn't read that post's file. Try again in a minute." });
  }

  const created = await createDevDraft(
    devDraft(source, slug, { organizationId: devOrganizationId() }),
  );
  refresh();
  if (!created.ok) back({ error: created.message });
  back({ sent: slug, ...(created.path ? { at: created.path } : {}) });
}
