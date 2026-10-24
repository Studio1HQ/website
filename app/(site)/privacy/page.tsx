import { Metadata } from "next";
import { MDXRemote } from "next-mdx-remote/rsc";
import remarkGfm from "remark-gfm";
import { getLegalPage } from "@/lib/legal";
import { pageMetadata } from "@/lib/seo";
import { NightHeader } from "@/components/shared/night-header";

export async function generateMetadata(): Promise<Metadata> {
  const page = getLegalPage("privacy");

  return pageMetadata({
    title: page.title,
    description: page.description,
    path: "/privacy",
  });
}

export default async function PrivacyPage() {
  const page = getLegalPage("privacy");

  return (
    <section className="bg-[var(--home-cream)] pb-28 text-[var(--home-ink)] tabular-nums">
      <NightHeader className="pb-28 pt-40 md:pb-36 md:pt-48">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <h1 className="text-[40px] font-medium leading-[1.04] tracking-[-0.05em] sm:text-[56px] lg:text-[68px]">
            {page.title}
          </h1>
          <p className="mt-6 text-[15px] text-white/55">
            Last updated: {page.lastUpdated}
          </p>
        </div>
      </NightHeader>

      <div className="mx-auto -mt-16 max-w-4xl px-4 sm:px-6 md:-mt-20">
        <div className="s1-glass-card s1-glass-raised rounded-[28px] p-6 sm:p-10 md:p-14">
          <div className="prose prose-neutral max-w-none dark:prose-invert prose-headings:font-medium prose-headings:tracking-[-0.03em] prose-headings:text-[var(--home-ink)] prose-h2:text-[26px] prose-p:text-[16px] prose-p:leading-[1.75] prose-p:text-[var(--home-ink-soft)] prose-a:text-primary prose-strong:text-[var(--home-ink)] prose-li:text-[16px] prose-li:leading-[1.7] prose-li:text-[var(--home-ink-soft)]">
            <MDXRemote
              source={page.content}
              options={{ mdxOptions: { remarkPlugins: [remarkGfm] } }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
