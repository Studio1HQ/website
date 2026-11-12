import { compileMDX } from "next-mdx-remote/rsc";
import remarkGfm from "remark-gfm";
import { transformBlogMdxContent } from "@/components/blog/mdx";
import { removeTldrSection } from "@/lib/blog";
import { baseUrl } from "@/lib/site";
import { addEvent, getPost, setStatus, sitePosts, takenSlugs } from "@/lib/internal/blog/data";
import { commitFiles, isGithubConfigured, repoFileSha } from "@/lib/internal/blog/github";
import { draftImages, readImage, removeImages } from "@/lib/internal/blog/media";
import { remarkSafeMdx } from "@/lib/internal/blog/safe-mdx";
import { MEDIA_PREFIX, postChecks, todayIst, toMdx, type Check } from "@/lib/internal/blog/shared";
import type { Staff } from "@/lib/internal/session";

export type PublishResult =
  | { ok: true; url: string; commitUrl: string }
  | { ok: false; message: string; conflict?: boolean; checks?: Check[] };

/**
 * Puts a post live: one commit to the site's branch with the MDX file and
 * any images uploaded while drafting (moved to public/blog/uploads/<slug>/),
 * which Vercel then deploys. Blog reviewers and admins only. Refuses when
 * the checks fail, and asks before overwriting a file someone changed on
 * GitHub since the post was opened (`force` overrides that).
 */
export async function publishPost(staff: Pick<Staff, "email" | "blog">, id: string, force = false): Promise<PublishResult> {
  if (staff.blog !== "reviewer") return { ok: false, message: "Only blog reviewers can publish." };
  const post = await getPost(staff, id);
  if (!post) return { ok: false, message: "This post doesn't exist." };
  if (!isGithubConfigured()) {
    return { ok: false, message: "Publishing isn't set up yet: GITHUB_TOKEN is missing on the server." };
  }

  const taken = await takenSlugs({ id: post.id, sourcePath: post.source_path });
  const failing = postChecks(post, taken).filter((check) => check.level === "error");
  if (failing.length) return { ok: false, message: "Fix the checks marked in red first.", checks: failing };

  const filePath = post.source_path ?? `content/blog/${post.slug}.mdx`;
  if (post.source_path) {
    const live = sitePosts().find((site) => site.path === post.source_path);
    if (live && live.slug !== post.slug) {
      return { ok: false, message: `A live post's URL can't change. Set the slug back to "${live.slug}".` };
    }
  }

  const remoteSha = await repoFileSha(filePath);
  if (remoteSha === undefined) return { ok: false, message: "Couldn't reach GitHub. Try again in a minute." };
  if (!post.source_path && remoteSha) {
    return { ok: false, message: `${filePath} already exists on GitHub. Pick a different slug.` };
  }
  if (post.source_path && remoteSha !== post.source_sha && !force) {
    return {
      ok: false,
      conflict: true,
      message: "This post changed on GitHub after it was opened here. Publishing will replace those changes.",
    };
  }

  // Draft images move into the repo next to the post.
  const files = draftImages(post.id, post.body, post.banner_image);
  const images: { path: string; content: Buffer }[] = [];
  for (const file of files) {
    const image = await readImage(`${post.id}/${file}`);
    if (!image.ok) {
      if (image.notFound) continue;
      return { ok: false, message: "Couldn't copy the post's images. Try again in a minute." };
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
      options: { mdxOptions: { remarkPlugins: [remarkGfm, remarkSafeMdx] } },
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

  const title = post.title.trim().replace(/"/g, "'");
  const commit = await commitFiles(
    `${post.source_path ? "update" : "add"}: blog post "${title}"\n\nPublished from the internal dashboard by ${staff.email}.`,
    [{ path: filePath, content: mdx }, ...images],
  );
  if (!commit.ok) return { ok: false, message: commit.message };

  await setStatus(
    post.id,
    {
      status: "published",
      body,
      banner_image: bannerImage,
      publish_date: date,
      source_path: filePath,
      source_sha: commit.shas[filePath] ?? null,
      published_at: new Date().toISOString(),
      published_by: staff.email,
      published_commit: commit.commit,
    },
    staff.email,
  );
  await addEvent(post.id, staff.email, "published", commit.url);
  if (files.length) await removeImages(files.map((file) => `${post.id}/${file}`));

  return { ok: true, url: `${baseUrl}/blog/${post.slug}`, commitUrl: commit.url };
}
