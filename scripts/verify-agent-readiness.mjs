const baseUrl = process.env.AGENT_READINESS_BASE_URL ?? "http://localhost:3000";

// Keep in sync with app/robots.ts.
const agentUserAgents = [
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "ClaudeBot",
  "Claude-SearchBot",
  "Claude-User",
  "PerplexityBot",
  "Perplexity-User",
  "Google-Extended",
  "Applebot-Extended",
  "DeepSeekBot",
  "ora-agent",
];

const blockSignals = [
  "access denied",
  "request blocked",
  "captcha",
  "cloudflare ray id",
  "attention required",
];

function url(path) {
  return new URL(path, baseUrl).toString();
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function fetchText(path, init) {
  const response = await fetch(url(path), init);
  const text = await response.text();
  return { response, text };
}

async function verifyCrawlerReachability() {
  for (const userAgent of agentUserAgents) {
    const { response, text } = await fetchText("/", {
      headers: { "User-Agent": userAgent },
    });
    const lowerText = text.toLowerCase();

    assert(
      response.status === 200,
      `${userAgent} homepage request returned ${response.status}`,
    );
    assert(
      !blockSignals.some((signal) => lowerText.includes(signal)),
      `${userAgent} homepage response looks blocked`,
    );
  }
}

async function verifyRobots() {
  const { response, text } = await fetchText("/robots.txt");

  assert(response.status === 200, `robots.txt returned ${response.status}`);
  for (const userAgent of agentUserAgents) {
    assert(
      text.includes(`User-Agent: ${userAgent}`),
      `robots.txt missing explicit ${userAgent} rule`,
    );
  }
  assert(text.includes("Allow: /"), "robots.txt missing Allow: /");
  assert(
    text.includes("Sitemap: https://www.studio1hq.com/sitemap.xml"),
    "robots.txt missing production sitemap URL",
  );
}

async function verifyHomepageWithoutJavaScript() {
  const { response, text } = await fetchText("/");

  assert(response.status === 200, `homepage returned ${response.status}`);
  assert(text.length > 500, "homepage raw HTML has less than 500 characters");
  assert(/<h1[\s>]/i.test(text), "homepage raw HTML is missing an H1");
  assert(/<h2[\s>]/i.test(text), "homepage raw HTML is missing an H2");
  assert(/<h3[\s>]/i.test(text), "homepage raw HTML is missing an H3");
  assert(
    text.includes("Studio1 Services Overview"),
    "homepage raw HTML missing agent-readable overview",
  );
}

async function verifyAgentFriendly404() {
  const { response, text } = await fetchText(
    "/agent-readiness-missing-page-check",
  );

  assert(response.status === 404, `missing page returned ${response.status}`);
  assert(text.includes("# Page not found"), "404 body missing markdown title");
  assert(text.includes("/sitemap.xml"), "404 body missing sitemap hint");
  assert(text.includes("/llms.txt"), "404 body missing llms.txt hint");
}

async function verifyJsonApiErrors() {
  for (const path of ["/api", "/api/agent-readiness-missing"]) {
    const { response, text } = await fetchText(path, {
      headers: { Accept: "application/json" },
    });
    const contentType = response.headers.get("content-type") ?? "";
    const parsed = JSON.parse(text);

    assert(response.status === 404, `${path} returned ${response.status}`);
    assert(
      contentType.includes("application/json"),
      `${path} did not return JSON content-type`,
    );
    assert(parsed.error?.code === "API_NOT_FOUND", `${path} missing error code`);
    assert(parsed.error?.links?.sitemap === "/sitemap.xml", `${path} missing links`);
  }
}

async function verifyMachineReadableFiles() {
  const sitemap = await fetchText("/sitemap.xml");
  assert(sitemap.response.status === 200, "sitemap.xml did not return 200");
  assert(
    (sitemap.response.headers.get("content-type") ?? "").includes(
      "application/xml",
    ),
    "sitemap.xml did not return XML content-type",
  );
  assert(
    sitemap.text.includes("https://www.studio1hq.com/case-studies/jozu"),
    "sitemap.xml missing the Jozu case study URL",
  );

  const llms = await fetchText("/llms.txt");
  assert(llms.response.status === 200, "llms.txt did not return 200");
  assert(llms.text.includes("# Studio1"), "llms.txt missing Studio1 heading");
}

const checks = [
  ["crawler reachability", verifyCrawlerReachability],
  ["robots.txt", verifyRobots],
  ["homepage without JavaScript", verifyHomepageWithoutJavaScript],
  ["agent-friendly 404", verifyAgentFriendly404],
  ["JSON API errors", verifyJsonApiErrors],
  ["machine-readable files", verifyMachineReadableFiles],
];

for (const [name, check] of checks) {
  await check();
  console.log(`✓ ${name}`);
}

console.log(`Agent readiness checks passed for ${baseUrl}`);
