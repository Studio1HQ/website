import type { NextConfig } from "next";
import nextMDX from "@next/mdx";
import createNextIntlPlugin from "next-intl/plugin";
import { AI_AGENT_HEADER_PATTERN } from "./lib/ai-agents";

const withMDX = nextMDX();
const withNextIntl = createNextIntlPlugin("./i18n/request.ts");
const nextConfig: NextConfig = {
  pageExtensions: ["js", "jsx", "mdx", "ts", "tsx"],
  // linkedom (app/ai-md) breaks when bundled: its optional canvas support
  // resolves to a stub. Load it from node_modules at runtime instead.
  serverExternalPackages: ["linkedom"],
  // The dashboard's blog pages read posts and the cover fonts at request time
  // (the public blog reads them at build time), so ship those files with them.
  outputFileTracingIncludes: {
    "/internal/**": [
      "./content/blog/**/*.mdx",
      "./app/fonts/Studio1Sans-Regular.ttf",
      "./app/fonts/Studio1Sans-Medium.ttf",
    ],
  },
  turbopack: {
    root: process.cwd(),
  },
  images: {
    // Serve compact modern formats and reuse optimized derivatives on repeat visits.
    formats: ["image/avif", "image/webp"],
    qualities: [50, 75, 95],
    minimumCacheTTL: 60 * 60 * 24 * 30,
    deviceSizes: [360, 640, 768, 1024, 1280, 1536, 1920],
    imageSizes: [32, 48, 64, 96, 128, 256, 384],
    remotePatterns: [
      {
        protocol: "https" as const,
        hostname: "**",
      },
    ],
    localPatterns: [
      // Any local image without a query string, as before.
      { pathname: "/**", search: "" },
      // Blog covers carry a ?v= version so cache updates reach readers.
      { pathname: "/blog-cover/**" },
    ],
  },
  async rewrites() {
    // AI agents (lib/ai-agents.ts, never search engines) get the markdown
    // version of English pages from app/ai-md. People get the normal page.
    const aiAgent = [
      { type: "header" as const, key: "user-agent", value: AI_AGENT_HEADER_PATTERN },
    ];
    return {
      beforeFiles: [
        { source: "/", has: aiAgent, destination: "/ai-md" },
        {
          source:
            "/:path((?!(?:_next|api|ai-md|blog-md|blog-cover|blog-og|og|brand|admin|internal|unsubscribe|assets|fonts|fr|es|hi|zh)(?:/|$))[^.]+|llms\\.txt|llms-full\\.txt)",
          has: aiAgent,
          destination: "/ai-md/:path",
        },
      ],
      afterFiles: [
        // Markdown version of every blog post, for LLMs and AI tools.
        { source: "/blog/:slug.md", destination: "/blog-md/:slug" },
        // The brand page (Studio1 Sans, design system, downloads): a static
        // build in public/brand, refreshed with scripts/sync-brand.mjs.
        { source: "/brand", destination: "/brand/index.html" },
      ],
      fallback: [],
    };
  },
  async headers() {
    return [
      {
        source: "/assets/:path*",
        headers: [
          {
            key: "Cache-Control",
            value:
              "public, max-age=86400, s-maxage=31536000, stale-while-revalidate=604800",
          },
        ],
      },
    ];
  },
  async redirects() {
    // Keep old service URLs alive while the public pages use SEO-friendly names.
    return [
      // A short, easy link for writers to the dashboard's blog editor.
      {
        source: "/blog/write",
        destination: "/internal/blog",
        permanent: false,
      },
      {
        source: "/sitemap",
        destination: "/sitemap.xml",
        permanent: true,
      },
      {
        source: "/blogs",
        destination: "/blog",
        permanent: true,
      },
      // AI agents guess at /docs paths; point them at the real files.
      {
        source: "/docs/llms.txt",
        destination: "/llms.txt",
        permanent: true,
      },
      {
        source: "/docs",
        destination: "/services",
        permanent: true,
      },
      {
        source:
          "/blog/claude-opus-5-5-what-changed-what-breaks-whether-to-switch",
        destination: "/blog/claude-opus-5-5-review-motion-videos",
        permanent: true,
      },
      {
        source: "/blog/gemini-4-argon-review",
        destination: "/blog/gemini-4-argon-benchmarks-pricing-access",
        permanent: true,
      },
      ...["/work", "/fr/work", "/es/work", "/hi/work", "/zh/work"].map(
        (source) => ({
          source,
          destination: "/case-studies",
          permanent: true,
        }),
      ),
      {
        source: "/blog-as-service",
        destination: "/technical-content-marketing",
        permanent: true,
      },
      {
        source: "/docs-as-service",
        destination: "/developer-documentation-dx-audit",
        permanent: true,
      },
      {
        source: "/content-creation",
        destination: "/developer-video-production",
        permanent: true,
      },
      {
        source: "/careers/growth-intern",
        destination: "/careers/founders-office-associate",
        permanent: true,
      },
      {
        source: "/careers/ai-cloud-engineer",
        destination: "/careers",
        permanent: true,
      },
      {
        source: "/careers/genai-developer-contract",
        destination: "/careers",
        permanent: true,
      },
      // Split into two roles on 2026-11-11.
      {
        source: "/careers/growth-and-content-lead",
        destination: "/careers",
        permanent: true,
      },
      {
        source: "/careers/developer-advocate",
        destination: "/careers/devrel-engineer",
        permanent: true,
      },
      {
        source: "/careers/aws-bedrock-ai-agent-engineer",
        destination: "/careers",
        permanent: true,
      },
      {
        source: "/careers/aws-ai-agent-engineer",
        destination: "/careers",
        permanent: true,
      },
      {
        source: "/devrel-as-service",
        destination: "/developer-relations-growth-campaigns",
        permanent: true,
      },
      {
        source: "/audit-services",
        destination: "/developer-documentation-dx-audit",
        permanent: true,
      },
      {
        source: "/video-production",
        destination: "/developer-video-production",
        permanent: true,
      },
      ...["/product-launch", "/organic-campaign", "/influencer-management"].map(
        (source) => ({
          source,
          destination: "/developer-relations-growth-campaigns",
          permanent: true,
        }),
      ),
    ];
  },
};
export default withNextIntl(withMDX(nextConfig));
