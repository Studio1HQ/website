export const DEFAULT_LOCALE = "en";

export const LOCALES = ["en", "fr", "es", "hi", "zh"] as const;

export type Locale = (typeof LOCALES)[number];

export const LOCALIZED_PUBLIC_PATHS = [
  "/",
  "/technical-content-marketing",
  "/developer-documentation-dx-audit",
  "/developer-video-production",
  "/developer-relations-growth-campaigns",
  "/about-us",
  "/product",
] as const;

const localizedPublicPathSet = new Set<string>(LOCALIZED_PUBLIC_PATHS);

export function isLocalizedPublicPath(pathname: string) {
  const { pathname: unprefixed } = splitLocaleFromPathname(pathname);

  return localizedPublicPathSet.has(unprefixed);
}

export const localeMeta: Record<
  Locale,
  {
    flag: string;
    hreflang: string;
    htmlLang: string;
    label: string;
    nativeName: string;
    pathPrefix: string;
  }
> = {
  en: {
    flag: "🇺🇸",
    hreflang: "en",
    htmlLang: "en",
    label: "English",
    nativeName: "English",
    pathPrefix: "/en",
  },
  fr: {
    flag: "🇫🇷",
    hreflang: "fr",
    htmlLang: "fr",
    label: "French",
    nativeName: "Français",
    pathPrefix: "/fr",
  },
  es: {
    flag: "🇪🇸",
    hreflang: "es",
    htmlLang: "es",
    label: "Spanish",
    nativeName: "Español",
    pathPrefix: "/es",
  },
  hi: {
    flag: "🇮🇳",
    hreflang: "hi",
    htmlLang: "hi",
    label: "Hindi",
    nativeName: "हिन्दी",
    pathPrefix: "/hi",
  },
  zh: {
    flag: "🇨🇳",
    hreflang: "zh-Hans",
    htmlLang: "zh-Hans",
    label: "Chinese",
    nativeName: "中文",
    pathPrefix: "/zh",
  },
};

export function isLocale(value: string): value is Locale {
  return LOCALES.includes(value as Locale);
}

export function splitLocaleFromPathname(pathname: string): {
  locale: Locale | null;
  pathname: string;
} {
  const normalized = pathname.startsWith("/") ? pathname : `/${pathname}`;
  const [, firstSegment = "", ...rest] = normalized.split("/");

  if (!isLocale(firstSegment)) {
    return { locale: null, pathname: normalized };
  }

  const unprefixed = `/${rest.join("/")}`.replace(/\/+$/, "") || "/";
  return { locale: firstSegment, pathname: unprefixed };
}

export function localizePathname(pathname: string, locale: Locale): string {
  const { pathname: unprefixed } = splitLocaleFromPathname(pathname);
  if (locale === DEFAULT_LOCALE) return unprefixed;
  if (unprefixed === "/") return localeMeta[locale].pathPrefix;
  return `${localeMeta[locale].pathPrefix}${unprefixed}`;
}

export function localizedUrl(
  pathname: string,
  locale: Locale,
  baseUrl: string,
) {
  return `${baseUrl}${localizePathname(pathname, locale)}`;
}

export function languageAlternates(pathname: string, baseUrl: string) {
  const { pathname: unprefixed } = splitLocaleFromPathname(pathname);
  return {
    en: localizedUrl(unprefixed, "en", baseUrl),
    fr: localizedUrl(unprefixed, "fr", baseUrl),
    es: localizedUrl(unprefixed, "es", baseUrl),
    hi: localizedUrl(unprefixed, "hi", baseUrl),
    "zh-Hans": localizedUrl(unprefixed, "zh", baseUrl),
    "x-default": localizedUrl(unprefixed, DEFAULT_LOCALE, baseUrl),
  };
}

export function hasLocalizedAlternates(pathname: string) {
  return isLocalizedPublicPath(pathname);
}

export function canonicalUrl(
  pathname: string,
  locale: Locale,
  baseUrl: string,
) {
  const { pathname: unprefixed } = splitLocaleFromPathname(pathname);
  return localizedUrl(unprefixed, locale, baseUrl);
}

export function localeFromPathname(pathname: string): Locale {
  return splitLocaleFromPathname(pathname).locale ?? DEFAULT_LOCALE;
}

export function shouldBypassLocale(pathname: string) {
  return (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname === "/internal" ||
    pathname.startsWith("/internal/") ||
    pathname.startsWith("/og/") ||
    pathname === "/og" ||
    pathname.includes(".") ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml"
  );
}
