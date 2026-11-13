/**
 * The site's GitHub repo, over the REST API (no SDK), for publishing blog
 * posts from the dashboard. Server-only: it uses GITHUB_TOKEN.
 *
 * Env:
 *   GITHUB_TOKEN   fine-grained token with Contents: read and write on the
 *                  repo below, nothing else
 *   GITHUB_REPO    owner/name, default Studio1HQ/website
 *   GITHUB_BRANCH  default main (Vercel deploys it to production)
 */

import { createHash } from "node:crypto";

const API = "https://api.github.com";

function config() {
  const token = process.env.GITHUB_TOKEN?.trim();
  if (!token) return null;
  return {
    token,
    repo: process.env.GITHUB_REPO?.trim() || "Studio1HQ/website",
    branch: process.env.GITHUB_BRANCH?.trim() || "main",
  };
}

export function isGithubConfigured() {
  return config() !== null;
}

export function githubTarget() {
  const github = config();
  return github ? { repo: github.repo, branch: github.branch } : null;
}

class GithubError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

async function gh<T>(path: string, init: RequestInit = {}): Promise<T> {
  const github = config();
  if (!github) throw new GithubError(0, "GITHUB_TOKEN isn't set");
  const response = await fetch(`${API}/repos/${github.repo}${path}`, {
    ...init,
    headers: {
      accept: "application/vnd.github+json",
      authorization: `Bearer ${github.token}`,
      "x-github-api-version": "2022-11-28",
      ...(init.body ? { "content-type": "application/json" } : {}),
    },
    cache: "no-store",
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new GithubError(response.status, `GitHub ${response.status}: ${detail.slice(0, 300)}`);
  }
  return (await response.json()) as T;
}

const encodePath = (path: string) => path.split("/").map(encodeURIComponent).join("/");

export type RepoFile = { ok: true; content: string; sha: string } | { ok: false; notFound: boolean; message: string };

/** A text file on the publishing branch, with its blob sha. */
export async function readRepoFile(path: string): Promise<RepoFile> {
  const github = config();
  if (!github) return { ok: false, notFound: false, message: "GITHUB_TOKEN isn't set" };
  try {
    const file = await gh<{ content?: string; encoding?: string; sha: string }>(
      `/contents/${encodePath(path)}?ref=${encodeURIComponent(github.branch)}`,
    );
    const content = file.encoding === "base64" && file.content ? Buffer.from(file.content, "base64").toString("utf8") : "";
    return { ok: true, content, sha: file.sha };
  } catch (error) {
    const status = error instanceof GithubError ? error.status : 0;
    return { ok: false, notFound: status === 404, message: String(error instanceof Error ? error.message : error) };
  }
}

/** The blob sha of a file on the branch, or null when it doesn't exist. */
export async function repoFileSha(path: string): Promise<string | null | undefined> {
  const file = await readRepoFile(path);
  if (file.ok) return file.sha;
  return file.notFound ? null : undefined;
}

/** The sha git gives a file with this content, to tell whether the branch already has it. */
export function blobSha(content: string | Buffer) {
  const bytes = typeof content === "string" ? Buffer.from(content, "utf8") : content;
  return createHash("sha1").update(`blob ${bytes.length}\0`).update(bytes).digest("hex");
}

/** A file's page on GitHub, on the publishing branch. */
export function repoFileUrl(path: string) {
  const github = config();
  return github ? `https://github.com/${github.repo}/blob/${encodePath(github.branch)}/${encodePath(path)}` : "";
}

export type CommitResult =
  | { ok: true; commit: string; url: string; shas: Record<string, string> }
  | { ok: false; message: string };

/**
 * Writes files to the branch in one commit on top of its latest head.
 * Text goes in as UTF-8, buffers as binary. Retries once if someone pushed
 * in between; never force-pushes.
 */
export async function commitFiles(
  message: string,
  files: { path: string; content: string | Buffer }[],
): Promise<CommitResult> {
  const github = config();
  if (!github) return { ok: false, message: "Publishing isn't set up: GITHUB_TOKEN is missing." };
  try {
    const blobs = await Promise.all(
      files.map(async (file) => {
        const content = typeof file.content === "string" ? Buffer.from(file.content, "utf8") : file.content;
        const blob = await gh<{ sha: string }>("/git/blobs", {
          method: "POST",
          body: JSON.stringify({ content: content.toString("base64"), encoding: "base64" }),
        });
        return { path: file.path, sha: blob.sha };
      }),
    );
    for (let attempt = 0; attempt < 2; attempt++) {
      const ref = await gh<{ object: { sha: string } }>(`/git/ref/heads/${encodeURIComponent(github.branch)}`);
      const head = await gh<{ tree: { sha: string } }>(`/git/commits/${ref.object.sha}`);
      const tree = await gh<{ sha: string }>("/git/trees", {
        method: "POST",
        body: JSON.stringify({
          base_tree: head.tree.sha,
          tree: blobs.map((blob) => ({ path: blob.path, mode: "100644", type: "blob", sha: blob.sha })),
        }),
      });
      const commit = await gh<{ sha: string; html_url: string }>("/git/commits", {
        method: "POST",
        body: JSON.stringify({ message, tree: tree.sha, parents: [ref.object.sha] }),
      });
      try {
        await gh(`/git/refs/heads/${encodeURIComponent(github.branch)}`, {
          method: "PATCH",
          body: JSON.stringify({ sha: commit.sha, force: false }),
        });
        return {
          ok: true,
          commit: commit.sha,
          url: commit.html_url,
          shas: Object.fromEntries(blobs.map((blob) => [blob.path, blob.sha])),
        };
      } catch (error) {
        // 422: the branch moved on since we read it. Build on the new head.
        if (!(error instanceof GithubError && error.status === 422) || attempt === 1) throw error;
      }
    }
    return { ok: false, message: "The branch kept moving. Try again." };
  } catch (error) {
    const status = error instanceof GithubError ? error.status : 0;
    console.error("[blog] GitHub commit failed", error);
    return {
      ok: false,
      message:
        status === 401 || status === 403 || status === 404
          ? "GitHub refused the token. Check GITHUB_TOKEN has Contents read and write on the repo."
          : "Couldn't reach GitHub. Try again in a minute.",
    };
  }
}
