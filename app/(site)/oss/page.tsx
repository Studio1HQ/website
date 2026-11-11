import type { Metadata } from "next";
import { OssPage } from "@/components/oss/oss-page";
import {
  AWESOME_APP_COUNT,
  AWESOME_SNAPSHOT,
  AWESOME_URL,
  OSS_REPOS,
} from "@/data/oss";
import { DEFAULT_LOCALE } from "@/lib/i18n";
import { getOssStats } from "@/lib/oss";
import {
  breadcrumbJsonLd,
  ORGANIZATION_ID,
  pageMetadata,
  pageUrl,
} from "@/lib/seo";

// Star counts come from GitHub; keep in step with OSS_REVALIDATE_SECONDS.
export const revalidate = 21600;

const PATH = "/oss";
const TITLE = "Open Source AI Apps and Agents";
const DESCRIPTION = `Studio1's open-source work: Awesome AI Apps, ${AWESOME_APP_COUNT} runnable LLM apps and agents, and full products in Studio1-OSS. Search the projects, clone one, and run it.`;

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata({
    title: TITLE,
    description: DESCRIPTION,
    path: PATH,
    locale: DEFAULT_LOCALE,
    keywords: [
      "awesome ai apps",
      "open source ai agents",
      "open source llm apps",
      "ai agent examples",
      "mcp agents",
      "rag examples",
      "studio1 open source",
    ],
  });
}

export default async function OpenSource() {
  const stats = await getOssStats();

  const repoJsonLd = (
    name: string,
    url: string,
    description: string,
    language: string,
    license: string | null,
  ) => ({
    "@type": "SoftwareSourceCode",
    name,
    codeRepository: url,
    description,
    programmingLanguage: language,
    ...(license
      ? { license: `https://spdx.org/licenses/${license}.html` }
      : {}),
    author: { "@id": ORGANIZATION_ID },
  });

  const collectionJsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: TITLE,
    description: DESCRIPTION,
    url: pageUrl(PATH),
    publisher: { "@id": ORGANIZATION_ID },
    mainEntity: {
      "@type": "ItemList",
      itemListElement: [
        repoJsonLd(
          "Awesome AI Apps",
          AWESOME_URL,
          `${AWESOME_APP_COUNT} runnable LLM apps and agents: RAG, MCP, voice, memory, multi-agent and fine-tuning examples.`,
          "Python",
          AWESOME_SNAPSHOT.license,
        ),
        ...OSS_REPOS.map((repo) =>
          repoJsonLd(
            repo.name,
            `https://github.com/Studio1-OSS/${repo.repo}`,
            repo.tagline,
            repo.language,
            repo.license,
          ),
        ),
      ].map((item, index) => ({
        "@type": "ListItem",
        position: index + 1,
        item,
      })),
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbJsonLd([
              { name: "Home", path: "/" },
              { name: "Open Source", path: PATH },
            ]),
          ),
        }}
      />
      <OssPage stats={stats} />
    </>
  );
}
