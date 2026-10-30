import { baseUrl } from "@/lib/site";

// AI search and assistant crawlers. These only work once Cloudflare's managed
// robots.txt and "Block AI bots" settings stop overriding them at the edge.
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

export default function robots() {
  return {
    rules: [
      ...agentUserAgents.map((userAgent) => ({
        userAgent,
        allow: "/",
        disallow: ["/api/", "/admin/"],
      })),
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/admin/"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
