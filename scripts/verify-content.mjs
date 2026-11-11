// Content checks for SEO and AI search, run against a running server.
//
//   pnpm test:content                                  # against localhost:3000
//   CONTENT_BASE_URL=https://www.studio1hq.com pnpm test:content
//
// Crawls every English URL in the sitemap and reports pages that break the
// page standard: title and meta length, a missing H1, too few FAQs on service
// pages, internal links that 404, llms.txt links that 404, and banned phrases.
// Exits 1 when any check fails, so it can gate a release.

const baseUrl = process.env.CONTENT_BASE_URL ?? "http://localhost:3000";
const siteUrl = "https://www.studio1hq.com";
const LOCALE_PREFIX = /^\/(fr|es|hi|zh)(\/|$)/;

const TITLE_MAX = 60;
const META_MIN = 110;
const META_MAX = 160;
const SERVICE_FAQ_MIN = 5;
const BANNED_PHRASES = ["Quoted per scope", "quote by scope", "lorem ipsum"];
const SERVICE_PATHS = new Set([
  "/technical-content-marketing",
  "/developer-documentation-dx-audit",
  "/developer-video-production",
  "/developer-relations-growth-campaigns",
  "/github-growth-agency",
  "/product-launch-service",
  "/aeo-agency",
  "/reddit-marketing-agency",
  "/developer-content-distribution",
  "/influencer-marketing-agency",
]);

const decode = (text) =>
  text
    .replace(/&amp;/g, "&")
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
const stripTags = (html) =>
  decode(html.replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
const toLocal = (url) => url.replace(siteUrl, baseUrl);

/** fetch that retries dropped connections, e.g. while a dev server restarts. */
async function fetchWithRetry(url, init, attempts = 5) {
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await fetch(url, init);
    } catch (error) {
      if (attempt >= attempts) throw error;
      await new Promise((resolve) => setTimeout(resolve, 3000 * attempt));
    }
  }
}

async function get(url) {
  const response = await fetchWithRetry(url, { redirect: "manual" });
  return { status: response.status, text: await response.text() };
}

/** Status of a path, following redirects (308 to a live page is fine). */
const statusCache = new Map();
async function finalStatus(path) {
  if (!statusCache.has(path)) {
    statusCache.set(
      path,
      fetchWithRetry(new URL(path, baseUrl), { redirect: "follow" }).then(
        (response) => response.status,
        () => 0,
      ),
    );
  }
  return statusCache.get(path);
}

function inspect(path, html) {
  const head = html.split("</head>")[0];
  const title = decode(head.match(/<title>(.*?)<\/title>/s)?.[1] ?? "");
  const meta = decode(
    head.match(/<meta name="description" content="([^"]*)"/)?.[1] ?? "",
  );
  const h1s = [...html.matchAll(/<h1[^>]*>(.*?)<\/h1>/gs)].map((m) =>
    stripTags(m[1]),
  );
  const faqCount = [...html.matchAll(/"@type":"Question"/g)].length;
  const body = html.replace(/<script[\s\S]*?<\/script>/g, "");
  const links = [
    ...new Set(
      [...body.matchAll(/href="(\/[^"#?]*)/g)]
        .map((m) => m[1])
        .filter(
          (href) => !/\.(png|jpe?g|svg|webp|ico|xml|txt|css|js)$/.test(href),
        ),
    ),
  ];

  const problems = [];
  if (!title) problems.push("no <title>");
  else if (title.length > TITLE_MAX)
    problems.push(`title ${title.length} chars: "${title}"`);
  if (!meta) problems.push("no meta description");
  else if (meta.length < META_MIN || meta.length > META_MAX)
    problems.push(`meta ${meta.length} chars`);
  if (h1s.length === 0) problems.push("no <h1> in server HTML");
  // Responsive layouts may render the same H1 twice (one copy CSS-hidden).
  const distinctH1s = new Set(h1s);
  if (distinctH1s.size > 1)
    problems.push(`${distinctH1s.size} different <h1> texts`);
  if (SERVICE_PATHS.has(path) && faqCount < SERVICE_FAQ_MIN)
    problems.push(`only ${faqCount} FAQs (want ${SERVICE_FAQ_MIN}+)`);
  for (const phrase of BANNED_PHRASES) {
    if (body.toLowerCase().includes(phrase.toLowerCase()))
      problems.push(`contains "${phrase}"`);
  }
  return { title, h1: h1s[0] ?? "", problems, links };
}

async function main() {
  const sitemap = await get(`${baseUrl}/sitemap.xml`);
  if (sitemap.status !== 200)
    throw new Error(`sitemap returned ${sitemap.status}`);
  const paths = [...sitemap.text.matchAll(/<loc>([^<]+)<\/loc>/g)]
    .map((m) => new URL(m[1]).pathname)
    .filter((path) => !LOCALE_PREFIX.test(path));

  let failures = 0;
  const brokenLinks = new Map();

  for (const path of paths) {
    const { status, text } = await get(toLocal(`${siteUrl}${path}`));
    if (status !== 200) {
      console.log(`FAIL ${path}: returned ${status}`);
      failures += 1;
      continue;
    }
    const { problems, links } = inspect(path, text);
    for (const link of links) {
      const linkStatus = await finalStatus(link);
      if (linkStatus >= 400 || linkStatus === 0) {
        if (!brokenLinks.has(link)) brokenLinks.set(link, new Set());
        brokenLinks.get(link).add(path);
      }
    }
    if (problems.length) {
      failures += 1;
      console.log(`FAIL ${path}\n  - ${problems.join("\n  - ")}`);
    }
  }

  for (const [link, pages] of brokenLinks) {
    failures += 1;
    console.log(`FAIL broken link ${link} (on ${[...pages].join(", ")})`);
  }

  const llms = await get(`${baseUrl}/llms.txt`);
  const llmsPaths = [
    ...new Set(
      [
        ...llms.text.matchAll(/\]\((https:\/\/www\.studio1hq\.com[^)]*)\)/g),
      ].map((m) => new URL(m[1]).pathname),
    ),
  ];
  for (const path of llmsPaths) {
    const linkStatus = await finalStatus(path);
    if (linkStatus >= 400 || linkStatus === 0) {
      failures += 1;
      console.log(
        `FAIL llms.txt links to ${path}, which returns ${linkStatus}`,
      );
    }
  }

  console.log(
    `\nChecked ${paths.length} sitemap pages and ${llmsPaths.length} llms.txt links: ${failures} failure(s).`,
  );
  if (failures > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
