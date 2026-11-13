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
/**
 * What a dashboard page may load and run. Scripts need this request's nonce
 * (Next adds it to its own), so markup that slips into a page, say from a
 * post body or an applicant's answer, can't run as code. Nothing outside the
 * site may put the dashboard in a frame.
 */
/**
 * The one inline script without a nonce: next-themes' theme picker, added by
 * the root layout (which can't read the nonce without making every public
 * page dynamic). Allowed by its hash; if the theme props or next-themes
 * change, the browser console names the new hash to put here.
 */
const THEME_SCRIPT = "'sha256-a/T6WihUdllNvOaPlAwIT5TdeEcYmobkkshLrN/KCkc='";

function dashboardPolicy(nonce: string) {
  const dev = process.env.NODE_ENV === "development";
  let files = "";
  try {
    // Résumés and receipts open from Supabase Storage's signed links.
    files = process.env.SUPABASE_URL ? new URL(process.env.SUPABASE_URL).origin : "";
  } catch {
    files = "";
  }
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' ${THEME_SCRIPT} 'strict-dynamic'${dev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    `connect-src 'self'${dev ? " ws: wss:" : ""}`,
    `frame-src 'self' blob: data: ${files} https://www.youtube.com https://www.youtube-nocookie.com`.replace(/\s+/g, " "),
    "media-src 'self' blob: data: https:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; ");
}

async function internalGate(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const open =
    pathname === "/internal/login" || pathname.startsWith("/internal/auth/");
  const nonce = btoa(crypto.randomUUID());
  const policy = dashboardPolicy(nonce);
  let response: NextResponse;
  if (
    open ||
    devBypassEmail(request.headers.get("host")) ||
    (await readSession(request.cookies.get(SESSION_COOKIE)?.value))
  ) {
    // Next reads the policy from the request to put the nonce on its scripts.
    const headers = new Headers(request.headers);
    headers.set("x-nonce", nonce);
    headers.set("Content-Security-Policy", policy);
    response = NextResponse.next({ request: { headers } });
  } else {
    const url = request.nextUrl.clone();
    url.pathname = "/internal/login";
    url.search = "";
    if (pathname !== "/internal") url.searchParams.set("next", pathname + search);
    response = NextResponse.redirect(url);
  }
  response.headers.set("Content-Security-Policy", policy);
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
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
