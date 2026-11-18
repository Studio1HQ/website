import { AI_AGENTS, AI_ROBOTS_TOKENS } from "@/lib/ai-agents";
import { baseUrl } from "@/lib/site";

// AI search and assistant crawlers. These only work once Cloudflare's managed
// robots.txt and "Block AI bots" settings stop overriding them at the edge.
const agentUserAgents = [...AI_AGENTS, ...AI_ROBOTS_TOKENS];

// The staff dashboard must never show up anywhere. It lives on
// dashboard.studio1hq.com (its robots.txt comes from proxy.ts), and old
// /internal links here only redirect there. Search engines (the "*" group)
// may follow them so they read the noindex header: a path blocked here can
// still be listed as a bare URL if someone links to it. AI crawlers don't all
// honour noindex, so they stay out.
const disallowed = ["/api/", "/admin/", "/unsubscribe"];

export default function robots() {
  return {
    rules: [
      ...agentUserAgents.map((userAgent) => ({
        userAgent,
        allow: "/",
        disallow: [...disallowed, "/internal"],
      })),
      {
        userAgent: "*",
        allow: "/",
        disallow: disallowed,
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
