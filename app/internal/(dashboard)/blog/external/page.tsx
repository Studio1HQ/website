import type { Metadata } from "next";
import {
  BlogExternalView,
  type ExternalNote,
} from "@/components/internal/blog/external";
import { sitePosts } from "@/lib/internal/blog/data";
import { devSort, isDevPath } from "@/lib/internal/blog/devto";
import { devArticles, isDevConfigured } from "@/lib/internal/blog/devto-api";
import { requireBlog } from "@/lib/internal/session";
import { sendToDev } from "./actions";

export const metadata: Metadata = { title: "External publishing" };

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const one = (value: string | string[] | undefined) =>
  typeof value === "string" ? value : "";

/** The DEV account's articles and numbers, and live posts to send there as drafts (blog reviewers). */
export default async function BlogExternalPage({ searchParams }: Props) {
  await requireBlog("reviewer");
  const params = await searchParams;
  const configured = isDevConfigured();
  const list = configured ? await devArticles() : null;
  const site = sitePosts();

  // After a send: which post, and where it is on DEV (a path the page checks before linking).
  const sent = one(params.sent);
  const already = one(params.already);
  const noted = site.find((post) => post.slug === (sent || already));
  const at = one(params.at);
  const note: ExternalNote | null = noted
    ? {
        kind: sent ? "sent" : "already",
        title: noted.title,
        path: isDevPath(at) ? at : null,
      }
    : null;
  const error = one(params.error).slice(0, 400) || null;

  return (
    <BlogExternalView
      configured={configured}
      list={list}
      sort={devSort(params.sort)}
      site={site}
      note={note}
      error={error}
      send={sendToDev}
    />
  );
}
