/**
 * A rendered page as plain markdown: headings, paragraphs, lists, quotes,
 * code, figures and links, in reading order. Navigation, the footer,
 * decoration and anything hidden are left out.
 *
 * Shared by the Human / Machine switch (the browser's live DOM) and the
 * markdown version served to AI agents (server-parsed HTML), so both read
 * the same.
 */

const SITE = "https://www.studio1hq.com";

/** Text of an element with whitespace collapsed. */
const clean = (value: string | null | undefined) =>
  (value ?? "").replace(/\s+/g, " ").trim();

/** An absolute link to the live site, without query strings. */
function toUrl(href: string, ownHosts: string[]) {
  try {
    const url = new URL(href, SITE);
    if (url.hostname === "www.studio1hq.com" || ownHosts.includes(url.hostname))
      return `${SITE}${url.pathname}`;
    url.search = "";
    return url.href;
  } catch {
    return href;
  }
}

/** What the page's own structured data says about it (JSON-LD). */
function pageFacts(doc: Document) {
  const facts: Record<string, string> = {};
  const nodes: Record<string, unknown>[] = [];
  doc
    .querySelectorAll('script[type="application/ld+json"]')
    .forEach((script) => {
      try {
        const data = JSON.parse(script.textContent ?? "");
        const list = Array.isArray(data) ? data : (data["@graph"] ?? [data]);
        nodes.push(...list);
      } catch {
        // Ignore malformed blocks
      }
    });
  const main =
    nodes.find((n) =>
      /Article|BlogPosting|CaseStudy|Service|CollectionPage|AboutPage|WebPage/.test(
        String(n["@type"]),
      ),
    ) ?? nodes[0];
  if (!main) return facts;
  const author = main.author as
    { name?: string } | { name?: string }[] | undefined;
  const authorName = Array.isArray(author) ? author[0]?.name : author?.name;
  if (main["@type"]) facts.type = String(main["@type"]);
  if (authorName) facts.author = authorName;
  if (main.datePublished)
    facts.published = String(main.datePublished).slice(0, 10);
  if (main.dateModified) facts.updated = String(main.dateModified).slice(0, 10);
  return facts;
}

/** What kind of page this is, from its address. */
function pageKind(pathname: string) {
  if (pathname === "/") return "Home page";
  if (/^\/case-studies\/./.test(pathname)) return "Case study";
  if (/^\/case-studies/.test(pathname)) return "Case study index";
  if (/^\/blog\/./.test(pathname)) return "Article";
  if (/^\/blog/.test(pathname)) return "Blog index";
  if (/services|marketing|devrel|seo|launch|aeo|reddit|content/.test(pathname))
    return "Service";
  return "Page";
}

const BLOCK_TAGS = new Set([
  "ADDRESS", "ARTICLE", "ASIDE", "BLOCKQUOTE", "BR", "DD", "DIV", "DL", "DT",
  "FIELDSET", "FIGCAPTION", "FIGURE", "FOOTER", "FORM", "H1", "H2", "H3", "H4",
  "H5", "H6", "HEADER", "HR", "LI", "MAIN", "NAV", "OL", "P", "PRE", "SECTION",
  "TABLE", "TD", "TH", "TR", "UL",
]);
/** Tailwind display utilities that put an inline tag on its own line. */
const BLOCK_CLASS = /(?:^|\s)(?:block|flex|grid|inline-block|inline-flex|table|list-item)(?:\s|$)/;
const SKIP_TEXT = "[aria-hidden='true'], script, style, noscript, template, [hidden], svg";

/**
 * Visible text of an element from server-parsed HTML, where there is no
 * layout to tell lines apart: block elements (by tag or Tailwind display
 * class) are separated by spaces, and hidden or decorative parts are left out.
 */
export function serverText(el: Element): string {
  let out = "";
  el.childNodes.forEach((node) => {
    if (node.nodeType === 3) {
      out += node.textContent ?? "";
      return;
    }
    if (node.nodeType !== 1) return;
    const child = node as Element;
    if (child.matches(SKIP_TEXT)) return;
    const isBlock =
      BLOCK_TAGS.has(child.tagName.toUpperCase()) ||
      BLOCK_CLASS.test(child.getAttribute("class") ?? "");
    const text = serverText(child);
    out += isBlock ? ` ${text} ` : text;
  });
  return out;
}

export type PageMarkdownOptions = {
  /** Path of the page on the live site, e.g. "/aeo-agency". */
  pathname: string;
  /**
   * Visible text of an element. The browser passes `innerText`, which skips
   * text hidden by CSS; the server falls back to `textContent`.
   */
  textOf?: (el: Element) => string;
  /** Hostnames that count as this site (e.g. localhost while developing). */
  ownHosts?: string[];
  /** Extra markdown placed right after the summary (e.g. a current offer). */
  afterSummary?: string;
};

export function pageToMarkdown(doc: Document, options: PageMarkdownOptions) {
  const { pathname, ownHosts = [], afterSummary } = options;
  const textOf =
    options.textOf ??
    ((el: Element) => (el as HTMLElement).innerText ?? el.textContent ?? "");
  const link = (href: string) => toUrl(href, ownHosts);

  const root =
    doc.querySelector<HTMLElement>("main") ??
    doc.querySelector<HTMLElement>("#__next") ??
    doc.body;
  const lines: string[] = [];
  const seen = new Set<string>();
  const push = (line: string) => {
    if (!line || seen.has(line)) return;
    seen.add(line);
    lines.push(line);
  };

  const skip = (el: Element) =>
    el.closest(
      "nav, footer, header[data-site-header], [aria-hidden='true'], script, style, noscript, template, [hidden], [data-machine-view]",
    ) !== null;

  // Only start at the page's first heading: everything before it is chrome.
  const firstHeading = root.querySelector("h1");
  let started = !firstHeading;
  // Every element in document order, the root first (as a TreeWalker visits).
  const elements = [root, ...Array.from(root.querySelectorAll("*"))];
  for (const el of elements) {
    if (el === firstHeading) started = true;
    if (!started || skip(el)) continue;
    const tag = el.tagName.toUpperCase();
    const text = clean(textOf(el));
    if (/^H[1-6]$/.test(tag) && text) {
      push(`${"#".repeat(Number(tag[1]))} ${text}`);
    } else if (tag === "P" && text && !el.closest("li, blockquote")) {
      push(text);
    } else if (tag === "LI" && text && !el.querySelector("li")) {
      const href = el.querySelector("a[href]")?.getAttribute("href");
      push(
        href && !href.startsWith("#") ? `- [${text}](${link(href)})` : `- ${text}`,
      );
    } else if (tag === "BLOCKQUOTE" && text) {
      push(`> ${text}`);
    } else if (tag === "PRE" && text) {
      push("```\n" + textOf(el).trim() + "\n```");
    } else if (tag === "IMG") {
      const alt = clean(el.getAttribute("alt"));
      if (alt) push(`![${alt}]`);
    } else if (tag === "A" && !el.closest("p, li, h1, h2, h3, h4, h5, h6")) {
      const href = el.getAttribute("href");
      if (text && href && !href.startsWith("#") && text.length < 80) {
        push(`- [${text}](${link(href)})`);
      }
    } else if (tag === "DT" && text) {
      // The value is usually the next <dd>; some stat cards put it first.
      const next = el.nextElementSibling;
      const prev = el.previousElementSibling;
      const value = clean(
        next?.tagName.toUpperCase() === "DD"
          ? next.textContent
          : prev?.tagName.toUpperCase() === "DD"
            ? prev.textContent
            : next?.textContent,
      );
      push(value ? `- **${text}:** ${value}` : `- ${text}`);
    }
  }

  const title = clean(doc.title);
  const description = clean(
    doc.querySelector('meta[name="description"]')?.getAttribute("content"),
  );
  const url = `${SITE}${pathname}`;
  const facts = pageFacts(doc);
  const body = lines.join(" ");
  const words = body.split(/\s+/).filter(Boolean).length;
  const sections = lines.filter((line) => /^#{2} /.test(line)).length;

  // The page's main sections, and the lines that carry its numbers
  const outline = lines
    .filter((line) => /^## /.test(line))
    .map((line) => `- ${line.replace(/^## /, "")}`);
  const keyFacts = lines
    .filter(
      (line) =>
        !/^#/.test(line) &&
        /(?<![a-zA-Z])\d[\d,.]*\s?(?:[KMB%x]|\+)/.test(line) &&
        line.length > 12 &&
        line.length < 180,
    )
    .slice(0, 8)
    .map((line) => (line.startsWith("- ") ? line : `- ${line}`));

  const block = (heading: string, rows: string[]) =>
    rows.length ? `## ${heading}\n\n${rows.join("\n")}` : "";

  const content = lines
    .map((line, k) =>
      k > 0 && line.startsWith("- ") && lines[k - 1].startsWith("- ")
        ? `\n${line}`
        : `\n\n${line}`,
    )
    .join("")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  const frontMatter = [
    "---",
    `title: ${title}`,
    `url: ${url}`,
    `page_type: ${pageKind(pathname)}`,
    description ? `description: ${description}` : "",
    facts.type ? `schema_type: ${facts.type}` : "",
    facts.author ? `author: ${facts.author}` : "",
    facts.published ? `published: ${facts.published}` : "",
    facts.updated && facts.updated !== facts.published
      ? `updated: ${facts.updated}`
      : "",
    sections ? `sections: ${sections}` : "",
    `words: ${words.toLocaleString("en-US")}`,
    `reading_time: ${Math.max(1, Math.round(words / 230))} min`,
    "publisher: Studio1 (https://www.studio1hq.com)",
    "site_index: https://www.studio1hq.com/llms.txt",
    "sitemap: https://www.studio1hq.com/sitemap.xml",
    "---",
  ].filter(Boolean);

  return [
    frontMatter.join("\n"),
    description ? block("Summary", [description]) : "",
    afterSummary?.trim() ?? "",
    block("On this page", outline),
    block("Key facts", keyFacts),
    content,
    block("About Studio1", [
      "Studio1 is a DevRel and developer marketing agency for devtool, AI, and open-source teams, covering technical content, docs, video, launches, and community.",
      "- Services: technical content, SEO and AEO, developer relations, documentation, product launches and community growth",
      "- Clients include Memori, Nebius, LiteLLM, Bright Data, Permit.io, Jozu, OpenLore and ScrapeGraphAI",
      "- Contact: contact@studio1hq.com · https://cal.com/studio1/collab",
    ]),
    block("Cite this page", [`${title}. Studio1. ${url}`]),
  ]
    .filter(Boolean)
    .join("\n\n");
}
