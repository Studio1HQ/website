import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Developer Marketing & Tech Blog",
  description:
    "Practical guides on developer marketing, technical content, documentation, and growth for devtool, AI, and open-source teams.",
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
      {children}
    </div>
  );
}
