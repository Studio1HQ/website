import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { SiteChrome } from "@/components/site-chrome";
import { PaperNotFound } from "@/components/paper/paper-error-pages";
import { DEFAULT_LOCALE } from "@/lib/i18n";
import { getMessages } from "@/lib/i18n-messages";

const agentRecoveryMarkdown = `# Page not found

This Studio1 URL does not exist.

Useful machine-readable links:
- Sitemap: /sitemap.xml
- Agent overview: /llms.txt
- Homepage: /
- Services: /technical-content-marketing, /developer-documentation-dx-audit, /developer-video-production, /developer-relations-growth-campaigns
- Case studies: /case-studies
- Careers: /careers`;

/**
 * Renders under the root layout only (unmatched URLs and notFound() both land
 * here), so it brings its own messages and chrome, forced into the paper style.
 * No intro curtain: a dead end should get out of the way, and the curtain's
 * boot script can't run when the 404 renders on the client.
 */
export const metadata: Metadata = {
  title: { absolute: "Page not found | Studio1" },
};

export default async function NotFound() {
  // Without this, next-intl reads the locale from headers(). On a static
  // route (an unknown /<segment> matched by [locale], or /careers/<bad-id>)
  // that throws "static to dynamic at runtime" and the 404 becomes a 500.
  setRequestLocale(DEFAULT_LOCALE);
  const messages = await getMessages(DEFAULT_LOCALE);

  return (
    <NextIntlClientProvider locale={DEFAULT_LOCALE} messages={messages}>
      <SiteChrome paper preloader={false}>
        <PaperNotFound />
        <pre className="sr-only" data-agent-404-recovery>
          {agentRecoveryMarkdown}
        </pre>
      </SiteChrome>
    </NextIntlClientProvider>
  );
}
