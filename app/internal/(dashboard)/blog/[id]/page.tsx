import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BlogEditor } from "@/components/internal/blog/editor";
import { getPost, listEvents, sitePosts, takenSlugs } from "@/lib/internal/blog/data";
import { isGithubConfigured } from "@/lib/internal/blog/github";
import { nameFromEmail } from "@/lib/internal/blog/shared";
import { membersWith } from "@/lib/internal/members";
import { requireBlog } from "@/lib/internal/session";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const staff = await requireBlog("writer");
  const post = await getPost(staff, (await params).id);
  return { title: post?.title.trim() || "Untitled post" };
}

export default async function BlogPostPage({ params }: Props) {
  const staff = await requireBlog("writer");
  const post = await getPost(staff, (await params).id);
  if (!post) notFound();

  const [events, reviewerEmails, taken] = await Promise.all([
    listEvents(post.id),
    membersWith(["admin", "blog_reviewer"]),
    takenSlugs({ id: post.id, sourcePath: post.source_path }),
  ]);
  const liveSlug = post.source_path
    ? (sitePosts().find((site) => site.path === post.source_path)?.slug ?? post.slug)
    : null;

  return (
    <BlogEditor
      post={post}
      events={events}
      me={{ email: staff.email, blog: staff.blog }}
      reviewers={reviewerEmails
        .filter((email) => email !== staff.email)
        .map((email) => ({ email, name: nameFromEmail(email) }))}
      takenSlugs={taken}
      liveSlug={liveSlug}
      githubReady={isGithubConfigured()}
    />
  );
}
