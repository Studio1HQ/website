"use client";

import { Suspense, useEffect } from "react";
import { usePathname } from "next/navigation";
import { useLocale } from "next-intl";
import CTA from "@/components/landing/cta";
import Footer from "@/components/landing/footer";
import PaperFooter from "@/components/paper/paper-footer";
import { ForcePaperContext } from "@/components/paper/paper-chrome-context";
import Navbar from "@/components/landing/navbar";
import { Preloader } from "@/components/preloader";
import { LocalizedLinkRuntime } from "@/components/localization/localized-link-runtime";
import { SmoothScroll } from "@/components/smooth-scroll";
import { DEFAULT_LOCALE, localeMeta, type Locale } from "@/lib/i18n";
import { isPaperPath } from "@/lib/paper";

export function SiteChrome({
  children,
  paper = false,
  preloader = true,
}: {
  children: React.ReactNode;
  /** Draw the chrome in the paper style whatever the path (e.g. the 404). */
  paper?: boolean;
  /** Play the intro curtain on a full page load. */
  preloader?: boolean;
}) {
  const locale = useLocale() as Locale;
  const pathname = usePathname() || "/";
  const unprefixedPathname =
    pathname.replace(/^\/(fr|es|hi|zh)(?=\/|$)/, "") || "/";
  const isPaper = paper || isPaperPath(pathname);
  const shouldShowGlobalCta =
    !unprefixedPathname.startsWith("/careers") && !isPaper;

  useEffect(() => {
    const meta = localeMeta[locale] ?? localeMeta[DEFAULT_LOCALE];
    document.documentElement.lang = meta.htmlLang;
  }, [locale]);

  return (
    <ForcePaperContext.Provider value={paper}>
      <SmoothScroll />
      {preloader ? <Preloader /> : null}
      <Suspense fallback={null}>
        <Navbar />
      </Suspense>
      {children}
      {shouldShowGlobalCta ? <CTA /> : null}
      {isPaper ? <PaperFooter /> : <Footer />}
      <LocalizedLinkRuntime />
    </ForcePaperContext.Provider>
  );
}
