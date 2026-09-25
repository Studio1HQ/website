import { baseUrl } from "@/lib/site";

const agentUserAgents = [
  "GPTBot",
  "ChatGPT-User",
  "ClaudeBot",
  "Google-Extended",
  "DeepSeekBot",
  "PerplexityBot",
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
