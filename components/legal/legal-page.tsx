import { MDXRemote } from "next-mdx-remote/rsc";
import remarkGfm from "remark-gfm";
import type { LegalPageContent } from "@/lib/legal";
import { PAPER_SCOPE } from "@/lib/paper";

/** Terms and privacy pages: plain content on the paper sheet, from content/legal. */
export function LegalPage({ page }: { page: LegalPageContent }) {
  return (
    <div style={PAPER_SCOPE}>
      <article className="mx-auto w-full max-w-[760px] px-4 pb-28 pt-32 tabular-nums sm:px-6 md:pt-40">
        <h1 className="text-[40px] font-medium leading-[1.1] tracking-[-0.05em] sm:text-[52px]">{page.title}</h1>
        <p className="mt-4 border-b border-[var(--p-line)] pb-8 text-[15px] text-[var(--p-muted)]">
          Last updated {page.lastUpdated}
        </p>

        <div className="prose prose-neutral mt-10 max-w-none prose-headings:font-medium prose-headings:tracking-[-0.03em] prose-headings:text-[var(--p-fg)] prose-h2:mb-3 prose-h2:mt-10 prose-h2:text-[22px] prose-p:text-[16px] prose-p:leading-[1.75] prose-p:text-[var(--p-muted)] prose-a:font-medium prose-a:text-primary prose-a:underline prose-a:decoration-primary/30 prose-a:underline-offset-4 hover:prose-a:decoration-primary prose-strong:font-medium prose-strong:text-primary prose-li:text-[16px] prose-li:leading-[1.7] prose-li:text-[var(--p-muted)]">
          <MDXRemote source={page.content} options={{ mdxOptions: { remarkPlugins: [remarkGfm] } }} />
        </div>
      </article>
    </div>
  );
}
