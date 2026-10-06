import type { NextConfig } from "next";
import nextMDX from "@next/mdx";
import createNextIntlPlugin from "next-intl/plugin";

const withMDX = nextMDX();
const withNextIntl = createNextIntlPlugin("./i18n/request.ts");
const nextConfig: NextConfig = {
  pageExtensions: ["js", "jsx", "mdx", "ts", "tsx"],
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
      {
        source: "/sitemap",
        destination: "/sitemap.xml",
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
        source: "/careers/aws-bedrock-ai-agent-engineer",
        destination: "/careers/ai-cloud-engineer",
        permanent: true,
      },
      {
        source: "/careers/aws-ai-agent-engineer",
        destination: "/careers/ai-cloud-engineer",
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
      ...[
        "/product-launch",
        "/organic-campaign",
        "/influencer-management",
      ].map((source) => ({
        source,
        destination: "/developer-relations-growth-campaigns",
        permanent: true,
      })),
    ];
  },
};
export default withNextIntl(withMDX(nextConfig));
