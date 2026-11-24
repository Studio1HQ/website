/**
 * Links in a task's note, as short names: many notes (the ones brought over
 * from Notion most of all) are just a long URL, which reads badly on a small
 * card. "https://app.notion.com/p/studio1hq/Studio1-Backlink-Plan-41cc…"
 * shows as "Notion · Studio1 Backlink Plan". Pure, so it's easy to test.
 */

export type NotePart = { text: string } | { url: string; label: string };

const URL_PATTERN = /https?:\/\/[^\s<>"']+/g;

/** Longest a link's name gets on a card; the full URL is in its title. */
const MAX_LABEL = 48;

/** A Notion page id at the end of a slug: 32 hex characters. */
const NOTION_ID = /-?[0-9a-f]{32}$/i;

function clip(text: string) {
  return text.length > MAX_LABEL ? `${text.slice(0, MAX_LABEL - 1).trimEnd()}…` : text;
}

/** "Studio1-Backlink-Plan-41cc…" → "Studio1 Backlink Plan"; a bare id → "". */
function slugWords(segment: string) {
  let words = segment;
  try {
    words = decodeURIComponent(segment);
  } catch {
    // Keep it as it came.
  }
  return words.replace(NOTION_ID, "").replace(/[-_+]+/g, " ").trim();
}

/** A short, readable name for a link. */
export function linkLabel(raw: string): string {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return clip(raw);
  }
  const host = url.hostname.replace(/^www\./, "").toLowerCase();
  const parts = url.pathname.split("/").filter(Boolean);

  if (host === "notion.so" || host.endsWith(".notion.so") || host === "notion.com" || host.endsWith(".notion.com") || host.endsWith(".notion.site")) {
    const title = parts.length ? slugWords(parts[parts.length - 1]) : "";
    return title ? clip(`Notion · ${title}`) : "Notion page";
  }
  if (host === "docs.google.com") {
    if (parts[0] === "document") return "Google Doc";
    if (parts[0] === "spreadsheets") return "Google Sheet";
    if (parts[0] === "presentation") return "Google Slides";
    if (parts[0] === "forms") return "Google Form";
    return "Google Docs";
  }
  if (host === "drive.google.com") return "Google Drive";
  if (host === "github.com" && parts.length >= 2) {
    const repo = `${parts[0]}/${parts[1]}`;
    const number = (parts[2] === "pull" || parts[2] === "issues") && parts[3] ? ` #${parts[3]}` : "";
    return clip(`GitHub · ${repo}${number}`);
  }
  if (host.endsWith(".slack.com")) return parts[0] === "archives" ? "Slack message" : "Slack";
  if (host === "claude.ai" && parts[0] === "artifact") return "Claude artifact";
  if (host === "figma.com" || host.endsWith(".figma.com")) return "Figma";
  if (host === "x.com" || host === "twitter.com") return parts[0] ? clip(`X · @${parts[0]}`) : "X";
  if (host === "linkedin.com" || host.endsWith(".linkedin.com")) return "LinkedIn";
  if (host === "youtube.com" || host === "youtu.be" || host.endsWith(".youtube.com")) return "YouTube";
  // Anything else: where it is, and the first bit of the path.
  return clip(parts.length ? `${host}/${parts[0]}` : host);
}

/** Splits a note into plain text and links (a full stop or bracket right after a link stays text). */
export function noteParts(text: string): NotePart[] {
  const parts: NotePart[] = [];
  let at = 0;
  for (const match of text.matchAll(URL_PATTERN)) {
    let url = match[0];
    // Sentence punctuation after a link isn't part of it; a ")" is, only when the link opened one.
    while (/[.,;:!?)\]]$/.test(url) && !(url.endsWith(")") && url.includes("("))) url = url.slice(0, -1);
    const start = match.index ?? 0;
    if (start > at) parts.push({ text: text.slice(at, start) });
    parts.push({ url, label: linkLabel(url) });
    at = start + url.length;
  }
  if (at < text.length) parts.push({ text: text.slice(at) });
  return parts;
}

/** The note with each link as its short name: for one-line previews (search results). */
export function notePreview(text: string) {
  return noteParts(text)
    .map((part) => ("url" in part ? part.label : part.text))
    .join("")
    .replace(/\s+/g, " ")
    .trim();
}
