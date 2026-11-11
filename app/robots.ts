import { AI_AGENTS, AI_ROBOTS_TOKENS } from "@/lib/ai-agents";
import { baseUrl } from "@/lib/site";

// AI search and assistant crawlers. These only work once Cloudflare's managed
// robots.txt and "Block AI bots" settings stop overriding them at the edge.
const agentUserAgents = [...AI_AGENTS, ...AI_ROBOTS_TOKENS];

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
