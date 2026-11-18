import { NextResponse, type NextRequest } from "next/server";
import {
  DEFAULT_LOCALE,
  isLocalizedPublicPath,
  localeMeta,
  localizePathname,
  shouldBypassLocale,
  splitLocaleFromPathname,
} from "@/lib/i18n";
import { AI_AGENTS, AI_ROBOTS_TOKENS } from "@/lib/ai-agents";
import {
  LOCAL_DASHBOARD_HOST,
  dashboardUrl,
  fromInternalPath,
  isDashboardHost,
  toInternalPath,
} from "@/lib/internal/host";
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

/**
 * A client's, an outreach organisation's or a newsletter's logo
 * (app/internal/(dashboard)/clients/[slug]/logo, outreach/[id]/logo,
 * influencers/channels/[id]/logo): another site's icon, so it gets a
 * policy that runs and loads nothing, and keeps the route's own
 * month-long Cache-Control instead of no-store.
 */
const LOGO_PATH =
  /^\/internal\/(?:clients\/[a-z0-9-]+|outreach\/[0-9a-f-]{36}|influencers\/channels\/[0-9a-f-]{36})\/logo$/;

/** A path whose last part looks like a file name ("x.webp", "a@b.com"). */
const FILE_LIKE = /\.[^/]*$/;
/**
 * Dashboard routes whose addresses can look like files: profile photos are
 * keyed by email, draft images end in .webp. They keep their own caching.
 */
const DASHBOARD_FILE_ROUTES = new Set(["team-file", "blog-media"]);
/** The public site's files a dashboard page loads (fonts, icons, pictures). */
const STATIC_FILE = /\.(?:png|jpe?g|webp|avif|gif|svg|ico|woff2?|ttf|otf|css|js|mjs|map|webmanifest)$/i;
/** Public routes a dashboard page loads: the email header images in previews. */
const PUBLIC_ROUTES = new Set(["og"]);

/** The dashboard host's robots.txt: AI crawlers stay out, search engines may read the noindex. */
const DASHBOARD_ROBOTS = [
  ...[...AI_AGENTS, ...AI_ROBOTS_TOKENS].map((agent) => `User-agent: ${agent}\nDisallow: /\n`),
  "User-agent: *\nAllow: /\n",
].join("\n");

const NOINDEX = "noindex, nofollow";
const LOGO_POLICY = "default-src 'none'; style-src 'unsafe-inline'; sandbox";

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
    // Big PDF receipts go from the browser straight to Storage.
    `connect-src 'self'${files ? ` ${files}` : ""}${dev ? " ws: wss:" : ""}`,
    `frame-src 'self' blob: data: ${files} https://www.youtube.com https://www.youtube-nocookie.com`.replace(/\s+/g, " "),
    "media-src 'self' blob: data: https:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; ");
}

/**
 * A dashboard page on the dashboard host: "/tasks" is served by
 * app/internal/(dashboard)/tasks. Only signed-in staff get past the login
 * page; pages and data reads check the session again (lib/internal/session.ts).
 */
async function internalGate(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const route = toInternalPath(pathname);
  const open = route === "/internal/login" || route.startsWith("/internal/auth/");
  const nonce = btoa(crypto.randomUUID());
  const logo = LOGO_PATH.test(route);
  // Logos, photos and draft images keep the caching their routes set.
  const file = logo || DASHBOARD_FILE_ROUTES.has(pathname.split("/")[1]);
  const policy = logo ? LOGO_POLICY : dashboardPolicy(nonce);
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
    const url = request.nextUrl.clone();
    url.pathname = route;
    response = NextResponse.rewrite(url, { request: { headers } });
  } else {
    const url = dashboardHostUrl(request);
    url.pathname = "/login";
    url.search = "";
    if (pathname !== "/") url.searchParams.set("next", pathname + search);
    response = NextResponse.redirect(url);
  }
  response.headers.set("Content-Security-Policy", policy);
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Robots-Tag", NOINDEX);
  response.headers.set("Referrer-Policy", "no-referrer");
  if (!file || response.status >= 300) response.headers.set("Cache-Control", "private, no-store");
  return response;
}

/** Everything on dashboard.studio1hq.com (and dashboard.localhost). */
function dashboardHost(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const first = pathname.split("/")[1];

  if (first === "api" || first === "_next" || first.startsWith("__nextjs")) return NextResponse.next();

  if (pathname === "/robots.txt") {
    return new NextResponse(DASHBOARD_ROBOTS, {
      headers: { "Content-Type": "text/plain; charset=utf-8", "X-Robots-Tag": NOINDEX },
    });
  }

  if (first === "internal") {
    // Draft images saved in post bodies keep their /internal/blog-media/…
    // address; the route checks the session itself.
    if (FILE_LIKE.test(pathname)) return NextResponse.next();
    // An old link (or one still in a stored notification): its new address.
    const url = dashboardHostUrl(request);
    url.pathname = fromInternalPath(pathname);
    url.search = search;
    return noindex(NextResponse.redirect(url, 307));
  }

  if (PUBLIC_ROUTES.has(first)) return noindex(NextResponse.next());

  if (FILE_LIKE.test(pathname) && !DASHBOARD_FILE_ROUTES.has(first)) {
    // The public site's own files: fonts, icons and pictures load; pages
    // and text files (sitemap.xml, llms.txt) belong to www only.
    return STATIC_FILE.test(pathname)
      ? noindex(NextResponse.next())
      : noindex(new NextResponse("Not found", { status: 404 }));
  }

  return internalGate(request);
}

/**
 * This request's URL on the host the browser asked for. `next dev` names
 * its own address (localhost) in nextUrl, which would send a redirect from
 * dashboard.localhost back to the public site.
 */
function dashboardHostUrl(request: NextRequest) {
  const url = request.nextUrl.clone();
  const host = request.headers.get("host");
  if (host && isDashboardHost(host)) {
    const [name, port] = host.split(":");
    url.hostname = name;
    url.port = port ?? "";
  }
  return url;
}

/**
 * The main site's /internal/… (an old link, a bookmark): the same page on
 * the dashboard host. `next dev` on localhost sends it to dashboard.localhost.
 * 307, not 308, while the move is new: browsers keep a 308 for good, so a
 * rollback couldn't take it back.
 */
function toDashboard(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const local = /^(?:localhost|127\.0\.0\.1|\[::1\])(?::(\d+))?$/.exec(request.headers.get("host") ?? "");
  const url = local
    ? new URL(`http://${LOCAL_DASHBOARD_HOST}${local[1] ? `:${local[1]}` : ""}`)
    : new URL(dashboardUrl);
  url.pathname = fromInternalPath(pathname);
  url.search = search;
  return noindex(NextResponse.redirect(url, 307));
}

function noindex(response: NextResponse) {
  response.headers.set("X-Robots-Tag", NOINDEX);
  return response;
}

export async function proxy(request: NextRequest) {
  const { nextUrl } = request;
  const { pathname } = nextUrl;

  if (isDashboardHost(request.headers.get("host"))) return dashboardHost(request);

  if (pathname === "/internal" || pathname.startsWith("/internal/")) {
    return toDashboard(request);
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
  matcher: [
    "/((?!api|_next|.*\\..*).*)",
    // The dashboard host, file-like paths included (profile photos are keyed
    // by email, and its robots.txt is its own). Keep in step with
    // DASHBOARD_HOST_PATTERN in lib/internal/host.ts.
    {
      source: "/((?!_next/).*)",
      has: [{ type: "host", value: "dashboard\\.(?:studio1hq\\.com|localhost)" }],
    },
  ],
};
