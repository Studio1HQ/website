/**
 * A client's named links: the company's own (site, GitHub, socials) under
 * its name in the workspace, and planning docs ("Blog plan (Notion)") in a
 * card of their own. Stored as a jsonb array on
 * client_accounts.links (supabase/migrations/20261116110000_client_links.sql).
 * Pure: safe in client components and easy to test.
 */

import { cleanUrl, looksLikeSecret } from "@/lib/internal/clients/clean";

/**
 * company: the client's own places (site, GitHub, socials, community),
 * shown under the name. doc: our planning docs and briefs (Notion, Google
 * Docs…), shown in their own card further down.
 */
export type LinkGroup = "company" | "doc";
export type ClientLink = { label: string; url: string; group: LinkGroup };

/** Hosts that hold docs rather than the client's own pages. */
const DOC_HOSTS = [
  "notion.so",
  "notion.site",
  "notion.com",
  "docs.google.com",
  "drive.google.com",
  "sheets.google.com",
  "slides.google.com",
  "figma.com",
  "miro.com",
  "coda.io",
  "airtable.com",
  "dropbox.com",
  "loom.com",
  "linear.app",
  "craft.do",
];

/** A link's group when nobody picked one: docs by host, else the company's. */
export function guessGroup(url: string): LinkGroup {
  let host = "";
  try {
    host = new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "company";
  }
  return DOC_HOSTS.some((doc) => host === doc || host.endsWith(`.${doc}`))
    ? "doc"
    : "company";
}

function groupOf(value: unknown, url: string): LinkGroup {
  return value === "company" || value === "doc" ? value : guessGroup(url);
}

export const MAX_CLIENT_LINKS = 12;
export const MAX_LINK_LABEL = 60;

export const CLIENT_LINKS_MIGRATION_HINT =
  "Client links need the links migration (supabase/migrations/20261116110000_client_links.sql). Run it in Supabase first.";

/**
 * The saved links, read defensively: anything that isn't a {label, url}
 * with an http(s) url is skipped. Missing column or bad data → [].
 */
export function readLinks(value: unknown): ClientLink[] {
  if (!Array.isArray(value)) return [];
  const links: ClientLink[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const { label, url, group } = item as Record<string, unknown>;
    if (typeof url !== "string" || !/^https?:\/\//i.test(url)) continue;
    links.push({
      label: typeof label === "string" && label.trim() ? label.trim() : url,
      url,
      group: groupOf(group, url),
    });
    if (links.length >= MAX_CLIENT_LINKS) break;
  }
  return links;
}

/**
 * Checks the links a manager typed, in their order. Blank rows are dropped;
 * a row with a link but no name is named after the site.
 */
export function cleanLinks(
  input: unknown,
): { ok: true; links: ClientLink[] } | { ok: false; message: string } {
  if (!Array.isArray(input)) return { ok: false, message: "Add a link." };
  const links: ClientLink[] = [];
  for (const item of input) {
    const row =
      item && typeof item === "object" ? (item as Record<string, unknown>) : {};
    const label =
      typeof row.label === "string"
        ? row.label.replace(/\s+/g, " ").trim()
        : "";
    const raw = typeof row.url === "string" ? row.url.trim() : "";
    if (!label && !raw) continue;
    if (!raw) return { ok: false, message: `Add the link for "${label}".` };
    if (label.length > MAX_LINK_LABEL)
      return {
        ok: false,
        message: `Keep link names under ${MAX_LINK_LABEL} characters.`,
      };
    if (looksLikeSecret(label) || looksLikeSecret(raw))
      return {
        ok: false,
        message:
          "That looks like a password or a key. Don't store those here: share them in a password manager.",
      };
    const url = cleanUrl(raw);
    if (!url)
      return {
        ok: false,
        message: `"${label || raw}" needs a web link (https://…) without a login or key in it.`,
      };
    links.push({
      label: label || siteName(url),
      url,
      group: groupOf(row.group, url),
    });
  }
  if (links.length > MAX_CLIENT_LINKS)
    return {
      ok: false,
      message: `Up to ${MAX_CLIENT_LINKS} links. Remove some first.`,
    };
  return { ok: true, links };
}

/** "notion.so" from a link. */
function siteName(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
