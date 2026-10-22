"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import type { MouseEvent } from "react";
import { useState } from "react";
import { CaretDown, Globe } from "@phosphor-icons/react";
import { LocaleFlag } from "@/components/localization/locale-flag";
import {
  DEFAULT_LOCALE,
  LOCALES,
  hasLocalizedAlternates,
  localeMeta,
  localizePathname,
  type Locale,
} from "@/lib/i18n";
import { cn } from "@/lib/utils";

const translationKeys: Record<Locale, Parameters<ReturnType<typeof useTranslations>>[0]> = {
  en: "english",
  fr: "french",
  es: "spanish",
  hi: "hindi",
  zh: "chinese",
};

function localeHref(pathname: string, search: string, locale: Locale) {
  const sourcePath = hasLocalizedAlternates(pathname) ? pathname : "/";
  const localizedPath = localizePathname(sourcePath || "/", locale);
  return `${localizedPath}${sourcePath === "/" ? "" : search ? `?${search}` : ""}`;
}

function prefetchLocalePage(href: string) {
  if (typeof document === "undefined") return;
  if (document.querySelector(`link[rel="prefetch"][href="${href}"]`)) return;

  const link = document.createElement("link");
  link.rel = "prefetch";
  link.href = href;
  document.head.appendChild(link);
}

export function LanguageSwitcher({
  compact = false,
  inline = false,
}: {
  compact?: boolean;
  inline?: boolean;
}) {
  const activeLocale = useLocale() as Locale;
  const pathname = usePathname() || "/";
  const searchParams = useSearchParams();
  const t = useTranslations("LocaleSwitcher");
  const search = searchParams.toString();
  const activeMeta = localeMeta[activeLocale] ?? localeMeta[DEFAULT_LOCALE];
  const [pendingLocale, setPendingLocale] = useState<Locale | null>(null);

  const navigateToLocale = (
    event: MouseEvent<HTMLAnchorElement>,
    locale: Locale,
  ) => {
    event.preventDefault();

    if (locale === activeLocale) return;

    const href = event.currentTarget.href;
    setPendingLocale(locale);
    document.documentElement.setAttribute("aria-busy", "true");
    document.body.style.cursor = "progress";
    document.cookie = `studio1-locale=${locale}; Path=/; Max-Age=${60 * 60 * 24 * 365}; SameSite=Lax`;
    window.location.assign(href);
  };

  const optionClassName = (isActive: boolean) =>
    cn(
      "group/item flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
      "text-[var(--home-ink-soft)] hover:bg-primary/10 hover:text-[var(--home-ink)]",
      isActive && "bg-primary/10 text-[var(--home-ink)] hover:bg-primary/15",
    );

  const options = LOCALES.map((locale) => {
    const meta = localeMeta[locale];
    const isActive = locale === activeLocale;
    const isPending = locale === pendingLocale;
    const href = localeHref(pathname, search, locale);

    return (
      <a
        key={locale}
        href={href}
        hrefLang={meta.hreflang}
        aria-current={isActive ? "true" : undefined}
        aria-busy={isPending ? "true" : undefined}
        className={cn(
          optionClassName(isActive),
          pendingLocale && "pointer-events-none opacity-70",
        )}
        onClick={(event) => navigateToLocale(event, locale)}
        onFocus={() => prefetchLocalePage(href)}
        onPointerEnter={() => prefetchLocalePage(href)}
      >
        <LocaleFlag
          locale={locale}
          className="transition-transform duration-200 group-hover/item:scale-110"
        />
        <span>{isPending ? t("switching") : t(translationKeys[locale])}</span>
      </a>
    );
  });

  if (inline) {
    return (
      <div className="rounded-xl border border-border/70 bg-background/70 p-1.5 shadow-sm backdrop-blur">
        <div className="mb-1 flex items-center gap-2 px-2 py-1 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
          <Globe className="size-3.5" weight="duotone" />
          {t("label")}
        </div>
        <div className="grid grid-cols-2 gap-1 sm:grid-cols-3">{options}</div>
      </div>
    );
  }

  return (
    <div className="group/lang relative">
      <button
        type="button"
        aria-label={t("label")}
        className={cn(
          "inline-flex h-10 items-center justify-center gap-2 rounded-full border border-black/10 bg-black/[0.03] dark:border-white/15 dark:bg-white/[0.06] pl-1.5 pr-3 text-[13px] font-medium text-current backdrop-blur-md transition-colors hover:border-primary/40",
          "shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]",
          compact && "h-10",
        )}
      >
        <span className="flex size-7 items-center justify-center rounded-full bg-black/[0.05] dark:bg-white/10">
          <LocaleFlag locale={activeLocale} className="size-[18px]" />
        </span>
        <span className="uppercase tracking-[0.06em]">{activeLocale}</span>
        {!compact ? (
          <span className="hidden lg:inline">{activeMeta.nativeName}</span>
        ) : null}
        <CaretDown
          weight="bold"
          className="size-3 opacity-60 transition-transform duration-300 group-hover/lang:rotate-180"
        />
      </button>

      <div
        className={cn(
          "absolute right-0 top-full z-[570] origin-top pt-4",
          "opacity-0 -translate-y-1 scale-95 pointer-events-none",
          "transition-all duration-300 ease-out",
          "group-hover/lang:opacity-100 group-hover/lang:translate-y-0 group-hover/lang:scale-100 group-hover/lang:pointer-events-auto",
          "group-focus-within/lang:opacity-100 group-focus-within/lang:translate-y-0 group-focus-within/lang:scale-100 group-focus-within/lang:pointer-events-auto",
        )}
      >
        <div className="s1-glass-card s1-glass-raised min-w-[15rem] space-y-0.5 rounded-2xl p-1.5">
          {options}
        </div>
      </div>
    </div>
  );
}
