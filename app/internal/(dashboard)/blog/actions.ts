"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  UUID,
  addEvent,
  createPost,
  deletePost,
  getPost,
  getThread,
  importSitePost,
  nameFromEmail,
  recentEvents,
  resolveThread,
  savePost,
  setStatus,
  threadPeople,
  type SaveResult,
} from "@/lib/internal/blog/data";
import { draftImages, removePostImages } from "@/lib/internal/blog/media";
import { notifyPeople } from "@/lib/internal/blog/notify";
import { publishPost, type PublishResult } from "@/lib/internal/blog/publish";
import { membersWith } from "@/lib/internal/members";
import { requireBlog } from "@/lib/internal/session";
import { cleanQuote } from "@/lib/internal/blog/shared";
import { withoutLinks } from "@/lib/internal/email-templates";

/*
 * Server actions are public endpoints: every one checks the session, the
 * person's blog role and whether they can see the post, and cleans its input.
 */

export type ActionResult = { ok: true } | { ok: false; message: string };

const note = (value: unknown) => (typeof value === "string" ? value.trim().slice(0, 5000) : "");
/** A post's title for an email: one line, and nothing that could turn into a link. */
const titleOf = (title: string) => withoutLinks(title.replace(/\s+/g, " ")) || "Untitled post";
const quoted = (title: string) => `“${titleOf(title)}”`;

/** Blog reviewers and admins as of now: only they may still hear about other people's posts. */
const currentReviewers = async () => new Set(await membersWith(["admin", "blog_reviewer"]));

const SLOW_DOWN = "That's a lot in a few minutes. Wait a little, then try again.";

function refresh(id?: string) {
  revalidatePath("/internal/blog");
  if (id) revalidatePath(`/internal/blog/${id}`);
}

export async function newPost() {
  const staff = await requireBlog("writer");
  const created = await createPost(staff);
  if (!created.ok) redirect(`/internal/blog?error=${encodeURIComponent(created.message)}`);
  redirect(`/internal/blog/${created.id}`);
}

/** Opens a live site post in the editor (reviewers only). */
export async function editSitePost(slug: unknown) {
  const staff = await requireBlog("reviewer");
  if (typeof slug !== "string" || !/^[a-z0-9-]{1,120}$/.test(slug)) redirect("/internal/blog?tab=live");
  const opened = await importSitePost(staff, slug);
  if (!opened.ok) redirect(`/internal/blog?tab=live&error=${encodeURIComponent(opened.message)}`);
  redirect(`/internal/blog/${opened.id}`);
}

export async function saveDraft(id: unknown, fields: unknown, base: unknown): Promise<SaveResult> {
  const staff = await requireBlog("writer");
  if (typeof id !== "string" || !UUID.test(id) || typeof base !== "string" || base.length > 64) {
    return { ok: false, message: "That save isn't valid." };
  }
  const result = await savePost(staff, id, fields, base);
  if (result.ok) revalidatePath("/internal/blog");
  return result;
}

/** Like a pull request: pick reviewers, who get an email and see it waiting. */
export async function requestReview(id: unknown, reviewers: unknown, message: unknown): Promise<ActionResult> {
  const staff = await requireBlog("writer");
  const post = typeof id === "string" ? await getPost(staff, id) : null;
  if (!post) return { ok: false, message: "This post doesn't exist or isn't yours." };
  if (post.status === "published") {
    return { ok: false, message: "This post is live and nothing has changed. Edit it first, then ask for a review." };
  }
  // Each request emails the reviewers: three in ten minutes is plenty.
  if ((await recentEvents(post.id, staff.email, "review_requested", 10)) >= 3) return { ok: false, message: SLOW_DOWN };
  const allowed = await membersWith(["admin", "blog_reviewer"]);
  const chosen = (Array.isArray(reviewers) ? reviewers : [])
    .filter((email): email is string => typeof email === "string")
    .map((email) => email.toLowerCase())
    .filter((email) => allowed.includes(email) && email !== staff.email);
  if (!chosen.length) return { ok: false, message: "Pick at least one reviewer." };
  const text = note(message);
  const merged = [...new Set([...post.reviewers, ...chosen])];
  if (!(await setStatus(post.id, { status: "in_review", reviewers: merged }, staff.email))) {
    return { ok: false, message: "Couldn't save. Try again in a minute." };
  }
  await addEvent(post.id, staff.email, "review_requested", `to:${chosen.join(",")}\n${text}`);
  await notifyPeople(chosen, staff.email, post.id, {
    subject: `Review requested: ${titleOf(post.title)}`,
    text: `${nameFromEmail(staff.email)} asked you to review ${quoted(post.title)} on the Studio1 blog.`,
    note: text,
  });
  refresh(post.id);
  return { ok: true };
}

/** A reviewer's verdict: send it back with changes, or approve it. */
export async function review(id: unknown, verdict: unknown, message: unknown): Promise<ActionResult> {
  const staff = await requireBlog("reviewer");
  const post = typeof id === "string" ? await getPost(staff, id) : null;
  if (!post) return { ok: false, message: "This post doesn't exist." };
  if (verdict !== "changes" && verdict !== "approve") return { ok: false, message: "That review isn't valid." };
  if (post.status === "draft" || post.status === "published") {
    return {
      ok: false,
      message: post.status === "draft" ? "This post hasn't been sent for review yet." : "This post is live and nothing has changed.",
    };
  }
  const text = note(message);
  if (verdict === "changes" && !text) return { ok: false, message: "Say what needs to change." };
  const status = verdict === "changes" ? "changes_requested" : "approved";
  const reviewers = post.reviewers.includes(staff.email) ? post.reviewers : [...post.reviewers, staff.email];
  if (!(await setStatus(post.id, { status, reviewers }, staff.email))) {
    return { ok: false, message: "Couldn't save. Try again in a minute." };
  }
  await addEvent(post.id, staff.email, status, text);
  await notifyPeople([post.created_by], staff.email, post.id, {
    subject: `${verdict === "changes" ? "Changes requested" : "Approved"}: ${titleOf(post.title)}`,
    text:
      verdict === "changes"
        ? `${nameFromEmail(staff.email)} reviewed ${quoted(post.title)} and asked for changes. Make them in the editor, then ask for another review.`
        : `${nameFromEmail(staff.email)} approved ${quoted(post.title)}. A reviewer will publish it.`,
    note: text,
  });
  refresh(post.id);
  return { ok: true };
}

/**
 * A comment. With `quote` it's about text selected in the editor; with
 * `threadId` it's a reply in that thread (which opens it again if resolved).
 */
export async function comment(id: unknown, message: unknown, quote?: unknown, threadId?: unknown): Promise<ActionResult> {
  const staff = await requireBlog("writer");
  const post = typeof id === "string" ? await getPost(staff, id) : null;
  if (!post) return { ok: false, message: "This post doesn't exist or isn't yours." };
  const text = note(message);
  if (!text) return { ok: false, message: "Write a comment first." };
  // Each comment emails the people on the post.
  if ((await recentEvents(post.id, staff.email, "comment", 10)) >= 20) return { ok: false, message: SLOW_DOWN };

  let thread = null;
  if (threadId !== undefined && threadId !== null && threadId !== "") {
    thread = typeof threadId === "string" ? await getThread(post.id, threadId) : null;
    if (!thread) return { ok: false, message: "That thread isn't on this post anymore." };
  }
  const saved = await addEvent(post.id, staff.email, "comment", text, thread ? { parent_id: thread.id } : { quote: cleanQuote(quote) });
  if (!saved) return { ok: false, message: "Couldn't save the comment. Try again in a minute." };
  if (thread?.resolved_at) await resolveThread(post.id, thread.id, staff.email, false);

  // Only people who can still open the post: its writer, and current blog
  // reviewers and admins. Someone whose role was taken away since they
  // reviewed or replied gets nothing more.
  const current = await currentReviewers();
  const people = [...post.reviewers, ...(thread ? await threadPeople(thread.id) : [])].filter((email) => current.has(email));
  const about = withoutLinks(thread?.quote || cleanQuote(quote));
  await notifyPeople([post.created_by, ...people], staff.email, post.id, {
    subject: `${thread ? "New reply" : "New comment"}: ${titleOf(post.title)}`,
    text: `${nameFromEmail(staff.email)} ${thread ? "replied to a comment on" : "commented on"} ${quoted(post.title)}${about ? `, about: “${about}”` : ""}.`,
    note: text,
  });
  refresh(post.id);
  return { ok: true };
}

/** Marks a thread resolved, or opens it again. Anyone on the post can. */
export async function resolveComment(id: unknown, threadId: unknown, resolved: unknown): Promise<ActionResult> {
  const staff = await requireBlog("writer");
  const post = typeof id === "string" ? await getPost(staff, id) : null;
  if (!post) return { ok: false, message: "This post doesn't exist or isn't yours." };
  const thread = typeof threadId === "string" ? await getThread(post.id, threadId) : null;
  if (!thread) return { ok: false, message: "That thread isn't on this post anymore." };
  if (!(await resolveThread(post.id, thread.id, staff.email, resolved === true))) {
    return { ok: false, message: "Couldn't save. Try again in a minute." };
  }
  refresh(post.id);
  return { ok: true };
}

/**
 * `base` is the version (updated_at) the reviewer's editor shows: a post
 * that changed since isn't published until they've reloaded and read it.
 */
export async function publish(id: unknown, base: unknown, force: unknown): Promise<PublishResult> {
  const staff = await requireBlog("reviewer");
  if (typeof id !== "string" || !UUID.test(id) || typeof base !== "string" || base.length > 64) {
    return { ok: false, message: "That post isn't valid." };
  }
  const result = await publishPost(staff, id, { base, force: force === true });
  if (result.ok) {
    const post = await getPost(staff, id);
    if (post) {
      const current = await currentReviewers();
      await notifyPeople([post.created_by, ...post.reviewers.filter((email) => current.has(email))], staff.email, post.id, {
        subject: `Published: ${titleOf(post.title)}`,
        text: `${nameFromEmail(staff.email)} published ${quoted(post.title)}. It goes live at ${result.url} in a few minutes, once the site redeploys.`,
      });
    }
    refresh(id);
  }
  return result;
}

/** Deletes a post that never went live. Its writer or a reviewer can. */
export async function deleteDraft(id: unknown): Promise<ActionResult> {
  const staff = await requireBlog("writer");
  const post = typeof id === "string" ? await getPost(staff, id) : null;
  if (!post) return { ok: false, message: "This post doesn't exist or isn't yours." };
  if (post.source_path) return { ok: false, message: "Live posts can't be deleted here." };
  if (!(await deletePost(post.id))) return { ok: false, message: "Couldn't delete it. Try again in a minute." };
  // Every image uploaded to the draft goes with it, used or not.
  await removePostImages(post.id, draftImages(post.id, post.body, post.banner_image));
  refresh();
  return { ok: true };
}
