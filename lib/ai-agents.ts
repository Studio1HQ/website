/**
 * AI assistants and AI crawlers, by the token in their user-agent string.
 * One list for robots.txt and for the markdown version that AI agents get.
 *
 * Search-engine crawlers (Googlebot, Bingbot, Applebot, DuckDuckBot,
 * YandexBot) must never be added here: serving them different content from
 * people is cloaking under search engines' spam policies.
 */
export const AI_AGENTS = [
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "ClaudeBot",
  "Claude-SearchBot",
  "Claude-User",
  "anthropic-ai",
  "PerplexityBot",
  "Perplexity-User",
  "DeepSeekBot",
  "MistralAI-User",
  "Meta-ExternalAgent",
  "Meta-ExternalFetcher",
  "cohere-ai",
  "DuckAssistBot",
  "YouBot",
  "ora-agent",
] as const;

/**
 * Robots-only tokens: they control AI training use in robots.txt but are
 * never sent as a user-agent, so they only belong in robots rules.
 */
export const AI_ROBOTS_TOKENS = ["Google-Extended", "Applebot-Extended"] as const;

const escape = (token: string) => token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** "GPTBot" -> "[gG][pP][tT][bB][oO][tT]": case-insensitive without flags. */
const anyCase = (token: string) =>
  [...token]
    .map((ch) =>
      /[a-z]/i.test(ch)
        ? `[${ch.toLowerCase()}${ch.toUpperCase()}]`
        : escape(ch),
    )
    .join("");

/**
 * Pattern for a `has` header match in next.config rewrites. Those patterns
 * take no regex flags, so case-insensitivity is spelled out per letter.
 */
export const AI_AGENT_HEADER_PATTERN = `.*(?:${AI_AGENTS.map(anyCase).join("|")}).*`;

const AI_AGENT_RE = new RegExp(`(${AI_AGENTS.map(escape).join("|")})`, "i");

/** The AI agent a user-agent string belongs to, or null for everyone else. */
export function aiAgentName(userAgent: string | null | undefined) {
  const match = userAgent?.match(AI_AGENT_RE);
  if (!match) return null;
  const token = match[1].toLowerCase();
  return AI_AGENTS.find((agent) => agent.toLowerCase() === token) ?? match[1];
}
