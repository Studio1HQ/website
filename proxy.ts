import { NextResponse, type NextRequest } from "next/server";
import {
  DEFAULT_LOCALE,
  isLocalizedPublicPath,
  localeMeta,
  localizePathname,
  shouldBypassLocale,
  splitLocaleFromPathname,
} from "@/lib/i18n";
import { SESSION_COOKIE, devBypassEmail, readSession } from "@/lib/internal/token";

const legacyRedirects: Record<string, string> = {
  "/blog-as-service": "/technical-content-marketing",
  "/docs-as-service": "/developer-documentation-dx-audit",
  "/content-creation": "/developer-video-production",
  "/devrel-as-service": "/developer-relations-growth-campaigns",
  "/audit-services": "/developer-documentation-dx-audit",
  "/video-production": "/developer-video-production",
  "/product-launch": "/developer-relations-growth-campaigns",
  "/organic-campaign": "/developer-relations-growth-campaigns",
  "/influencer-management": "/developer-relations-growth-campaigns",
};

/**
 * The internal dashboard: only signed-in Studio1 staff get past the login
 * page. Pages and data reads check the session again (lib/internal/session.ts);
 * this turns everyone else away early and keeps the pages out of search.
 */
async function internalGate(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const open =
    pathname === "/internal/login" || pathname.startsWith("/internal/auth/");
  let response: NextResponse;
  if (
    open ||
    devBypassEmail(request.headers.get("host")) ||
    (await readSession(request.cookies.get(SESSION_COOKIE)?.value))
  ) {
    response = NextResponse.next();
  } else {
    const url = request.nextUrl.clone();
    url.pathname = "/internal/login";
    url.search = "";
    if (pathname !== "/internal") url.searchParams.set("next", pathname + search);
    response = NextResponse.redirect(url);
  }
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  response.headers.set("Referrer-Policy", "no-referrer");
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export async function proxy(request: NextRequest) {
  const { nextUrl } = request;
  const { pathname } = nextUrl;

  if (pathname === "/internal" || pathname.startsWith("/internal/")) {
    return internalGate(request);
  }

  if (shouldBypassLocale(pathname)) {
    return NextResponse.next();
  }

  const { locale, pathname: unprefixedPathname } =
    splitLocaleFromPathname(pathname);
  const activeLocale = locale ?? DEFAULT_LOCALE;
  const redirectTarget = legacyRedirects[unprefixedPathname];

  if (redirectTarget) {
    const url = nextUrl.clone();
    url.pathname = localizePathname(redirectTarget, activeLocale);
    return NextResponse.redirect(url, 308);
  }

  // Only a few pages are translated. Send other locale-prefixed URLs (old
  // links like /fr/careers) to the English page instead of a 404.
  if (locale && !isLocalizedPublicPath(unprefixedPathname)) {
    const url = nextUrl.clone();
    url.pathname = unprefixedPathname;
    return NextResponse.redirect(url, 308);
  }

  // The root <html lang> is "en" in the server HTML and is corrected in the
  // browser. Crawlers that don't run JavaScript (Bing, most AI crawlers) read
  // the page language from this header instead.
  if (locale) {
    const response = NextResponse.next();
    response.headers.set("Content-Language", localeMeta[locale].htmlLang);
    response.cookies.set("studio1-locale", locale, {
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });
    return response;
  }

  const response = NextResponse.next();
  response.headers.set("Content-Language", localeMeta[DEFAULT_LOCALE].htmlLang);
  return response;
}

export const config = {
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};
