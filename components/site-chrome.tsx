"use client";

import { Suspense, useEffect } from "react";
import { usePathname } from "next/navigation";
import { useLocale } from "next-intl";
import CTA from "@/components/landing/cta";
import Footer from "@/components/landing/footer";
import PaperFooter from "@/components/paper/paper-footer";
import Navbar from "@/components/landing/navbar";
import { Preloader } from "@/components/preloader";
import { LocalizedLinkRuntime } from "@/components/localization/localized-link-runtime";
import ScrollToTopButton from "@/components/scroll-to-top-button";
import { SmoothScroll } from "@/components/smooth-scroll";
import { DEFAULT_LOCALE, localeMeta, type Locale } from "@/lib/i18n";
import { isPaperPath } from "@/lib/paper";

export function SiteChrome({ children }: { children: React.ReactNode }) {
  const locale = useLocale() as Locale;
  const pathname = usePathname() || "/";
  const unprefixedPathname =
    pathname.replace(/^\/(fr|es|hi|zh)(?=\/|$)/, "") || "/";
  const shouldShowGlobalCta =
    !unprefixedPathname.startsWith("/careers") && !isPaperPath(pathname);

  useEffect(() => {
    const meta = localeMeta[locale] ?? localeMeta[DEFAULT_LOCALE];
    document.documentElement.lang = meta.htmlLang;
  }, [locale]);

  return (
    <>
      <SmoothScroll />
      <Preloader />
      <Suspense fallback={null}>
        <Navbar />
      </Suspense>
      {children}
      {shouldShowGlobalCta ? <CTA /> : null}
      {isPaperPath(pathname) ? <PaperFooter /> : <Footer />}
      <ScrollToTopButton />
      <LocalizedLinkRuntime />
    </>
  );
}
