import type { Metadata } from "next";
import { PageSideBeamGlows } from "@/components/shared/page-side-beam-glows";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Developer Marketing & Tech Blog",
  description:
    "Practical guides on developer marketing, technical content, documentation, and growth for SaaS, AI, and devtool teams.",
  path: "/blog",
  rssPath: "/feed.xml",
  keywords: [
    "technical content",
    "developer relations",
    "DevRel",
    "API documentation",
    "developer marketing",
    "technical writing",
    "SEO",
    "developer tools",
  ],
});

export default function BlogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen overflow-x-clip">
      <PageSideBeamGlows />
      {children}
    </div>
  );
}
