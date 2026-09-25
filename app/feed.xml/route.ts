import { getAllPosts } from "@/lib/blog";
import { baseUrl } from "@/lib/site";

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET() {
  const posts = getAllPosts();
  const latestPostDate = posts[0]?.updatedDate ?? new Date().toISOString();

  const items = posts
    .map((post) => {
      const url = `${baseUrl}/blog/${post.slug}`;
      const authors = post.authors
        .map((author) => `<author>contact@studio1hq.com (${escapeXml(author)})</author>`)
        .join("\n      ");
      return `    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${escapeXml(url)}</link>
      <guid isPermaLink="true">${escapeXml(url)}</guid>
      <description>${escapeXml(post.description)}</description>
      ${authors}
      <category>${post.tags.map(escapeXml).join("</category><category>")}</category>
      <pubDate>${new Date(post.date).toUTCString()}</pubDate>
    </item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Studio1 Developer Marketing &amp; Tech Blog</title>
    <link>${baseUrl}/blog</link>
    <description>Practical guides on developer marketing, technical content, documentation, and growth for SaaS, AI, and devtool teams.</description>
    <language>en</language>
    <lastBuildDate>${new Date(latestPostDate).toUTCString()}</lastBuildDate>
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "content-type": "application/rss+xml; charset=utf-8",
    },
  });
}
