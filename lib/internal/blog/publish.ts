import { compileMDX } from "next-mdx-remote/rsc";
import remarkGfm from "remark-gfm";
import { blogMdxComponents, transformBlogMdxContent } from "@/components/blog/mdx";
import { removeTldrSection } from "@/lib/blog";
import { baseUrl } from "@/lib/site";
import { addEvent, getPost, markPublished, sitePosts, takenSlugs } from "@/lib/internal/blog/data";
import { blobSha, commitFiles, isGithubConfigured, repoFileSha, repoFileUrl } from "@/lib/internal/blog/github";
import { draftImages, readImage, removePostImages } from "@/lib/internal/blog/media";
import { findUnsafeMdx, remarkSafeMdx } from "@/lib/internal/blog/safe-mdx";
import { MEDIA_PREFIX, postChecks, todayIst, toMdx, type BlogPostRow, type Check } from "@/lib/internal/blog/shared";
import type { Staff } from "@/lib/internal/session";

export type PublishResult =
  | { ok: true; url: string; commitUrl: string; warning?: string }
  | { ok: false; message: string; conflict?: boolean; checks?: Check[] };

/**
 * Who may put this post live now: it has to be approved, unless it's the
 * publisher's own post (a reviewer's own writing, or a live post they opened
 * to edit). A post that's live with nothing changed has nothing to publish.
 */
export function publishBlocker(post: Pick<BlogPostRow, "status" | "created_by">, publisher: string): string | null {
  if (post.status === "published") return "This post is already live. Edit something to publish again.";
  if (post.status === "approved" || post.created_by === publisher) return null;
  return "Approve this post before publishing it.";
}

/**
 * Puts a post live: one commit to the site's branch with the MDX file and
 * any images uploaded while drafting (moved to public/blog/uploads/<slug>/),
 * which Vercel then deploys. Blog reviewers and admins only.
 *
 *   base   the updated_at the reviewer's editor shows. When the post changed
 *          since (the writer saved an edit), nothing is published: the
 *          reviewer reloads and reads the new text first.
 *   force  overwrite a file someone changed on GitHub since the post was
 *          opened here.
 *
 * Refuses when the checks fail. Publishing again after a failure half way
 * is safe: a file that's already on the branch with this exact content
 * counts as published.
 */
export async function publishPost(
  staff: Pick<Staff, "email" | "blog">,
  id: string,
  options: { base: string; force?: boolean },
): Promise<PublishResult> {
  if (staff.blog !== "reviewer") return { ok: false, message: "Only blog reviewers can publish." };
  const post = await getPost(staff, id);
  if (!post) return { ok: false, message: "This post doesn't exist." };
  if (!isGithubConfigured()) {
    return { ok: false, message: "Publishing isn't set up yet: GITHUB_TOKEN is missing on the server." };
  }
  if (Date.parse(post.updated_at) !== Date.parse(options.base)) {
    return { ok: false, message: "This post changed since you opened it. Reload, read the changes, then publish." };
  }
  const blocked = publishBlocker(post, staff.email);
  if (blocked) return { ok: false, message: blocked };

  // The checks, with the post parsed the way the site parses it: no HTML,
  // components or code gets into the file that's committed.
  const unsafe = await findUnsafeMdx(post.body);
  const taken = await takenSlugs({ id: post.id, sourcePath: post.source_path });
  const failing = postChecks(
    post,
    taken,
    unsafe.found.map((issue) => issue.label),
  ).filter((check) => check.level === "error");
  if (failing.length) return { ok: false, message: "Fix the checks marked in red first.", checks: failing };
  if (!unsafe.parsed) {
    return { ok: false, message: "The site can't read part of this post (often a stray { } or <). Open the preview to see where." };
  }

  const filePath = post.source_path ?? `content/blog/${post.slug}.mdx`;
  if (post.source_path) {
    const live = sitePosts().find((site) => site.path === post.source_path);
    if (live && live.slug !== post.slug) {
      return { ok: false, message: `A live post's URL can't change. Set the slug back to "${live.slug}".` };
    }
  }

  // Draft images move into the repo next to the post.
  const files = draftImages(post.id, post.body, post.banner_image);
  const images: { path: string; content: Buffer }[] = [];
  for (const file of files) {
    const image = await readImage(`${post.id}/${file}`);
    if (!image.ok) {
      return {
        ok: false,
        message: image.notFound
          ? `An image in this post is missing (${file}). Upload it again, then publish.`
          : "Couldn't copy the post's images. Try again in a minute.",
      };
    }
    images.push({ path: `public/blog/uploads/${post.slug}/${file}`, content: Buffer.from(image.body) });
  }
  const draftPrefix = `${MEDIA_PREFIX}${post.id}/`;
  const livePrefix = `/blog/uploads/${post.slug}/`;
  const body = post.body.split(draftPrefix).join(livePrefix);
  const bannerImage = post.banner_image?.split(draftPrefix).join(livePrefix) ?? null;
  if (body.includes(MEDIA_PREFIX) || bannerImage?.includes(MEDIA_PREFIX)) {
    return { ok: false, message: "Some images were copied from another draft. Upload them again in this post." };
  }

  // The site builds every post with MDX; a post it can't read would break the deploy.
  try {
    await compileMDX({
      source: transformBlogMdxContent(removeTldrSection(body)),
      components: blogMdxComponents,
      options: { mdxOptions: { remarkPlugins: [remarkGfm, [remarkSafeMdx, { generated: true }]] } },
    });
  } catch (error) {
    const detail = String(error instanceof Error ? error.message : error).split("\n")[0].slice(0, 200);
    return { ok: false, message: `The site can't read part of this post (often a stray { } or <). ${detail}` };
  }

  const today = todayIst();
  const date = post.publish_date ?? today;
  const mdx = toMdx(
    { ...post, body, banner_image: bannerImage },
    { date, updatedDate: post.source_path ? today : date, extra: post.extra_frontmatter },
  );
  const ours = blobSha(mdx);

  const remoteSha = await repoFileSha(filePath);
  if (remoteSha === undefined) return { ok: false, message: "Couldn't reach GitHub. Try again in a minute." };
  // Already there with exactly this content: an earlier publish got as far
  // as GitHub but not the dashboard. Nothing to commit, only to record.
  const alreadyThere = remoteSha === ours;
  if (!alreadyThere) {
    if (!post.source_path && remoteSha) {
      return { ok: false, message: `${filePath} already exists on GitHub. Pick a different slug.` };
    }
    if (post.source_path && remoteSha !== post.source_sha && !options.force) {
      return {
        ok: false,
        conflict: true,
        message: "This post changed on GitHub after it was opened here. Publishing will replace those changes.",
      };
    }
  }

  let commitSha: string | null = null;
  let commitUrl = repoFileUrl(filePath);
  if (!alreadyThere) {
    const title = post.title.replace(/\s+/g, " ").trim().replace(/"/g, "'");
    const commit = await commitFiles(
      `${post.source_path ? "update" : "add"}: blog post "${title}"\n\nPublished from the internal dashboard by ${staff.email}.`,
      [{ path: filePath, content: mdx }, ...images],
    );
    if (!commit.ok) return { ok: false, message: commit.message };
    commitSha = commit.commit;
    commitUrl = commit.url;
  }

  const recorded = await markPublished(
    post.id,
    {
      body,
      banner_image: bannerImage,
      publish_date: date,
      source_path: filePath,
      source_sha: ours,
      published_by: staff.email,
      published_commit: commitSha ?? post.published_commit,
    },
    post.updated_at,
  );
  if (recorded === "failed") {
    // The draft keeps its images and its links to them, so nothing breaks.
    return {
      ok: false,
      message: "The post is on its way to the site, but the dashboard couldn't record that. Press Publish again in a minute.",
    };
  }
  await addEvent(post.id, staff.email, "published", commitUrl);
  const url = `${baseUrl}/blog/${post.slug}`;
  if (recorded === "edited") {
    // Their text still points at the draft's images: keep those.
    return {
      ok: true,
      url,
      commitUrl,
      warning: "Published. Someone saved an edit while it was publishing: that edit isn't live yet.",
    };
  }
  // The images are in the repo now; the draft's copies (used or not) can go.
  await removePostImages(post.id, files);
  return { ok: true, url, commitUrl };
}
