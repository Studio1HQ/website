import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

const DEFAULT_SCOPE = "public_repo";
const STATE_COOKIE = "studio1_cms_oauth_state";

function getSiteUrl(request: NextRequest) {
  return (process.env.CMS_SITE_URL ?? request.nextUrl.origin).replace(/\/$/, "");
}

function getMissingEnv() {
  return ["GITHUB_CLIENT_ID", "GITHUB_CLIENT_SECRET"].filter((key) => !process.env[key]);
}

export function GET(request: NextRequest) {
  const missingEnv = getMissingEnv();

  if (missingEnv.length > 0) {
    return NextResponse.json(
      {
        error: "CMS GitHub OAuth is not configured.",
        missingEnv,
      },
      { status: 500 },
    );
  }

  const siteUrl = getSiteUrl(request);
  const state = randomUUID();
  const redirectUri = `${siteUrl}/api/cms/callback`;
  const authorizeUrl = new URL("https://github.com/login/oauth/authorize");

  authorizeUrl.searchParams.set("client_id", process.env.GITHUB_CLIENT_ID!);
  authorizeUrl.searchParams.set("redirect_uri", redirectUri);
  authorizeUrl.searchParams.set("scope", process.env.GITHUB_OAUTH_SCOPE ?? DEFAULT_SCOPE);
  authorizeUrl.searchParams.set("state", state);

  const response = NextResponse.redirect(authorizeUrl);
  response.cookies.set(STATE_COOKIE, state, {
    httpOnly: true,
    maxAge: 60 * 10,
    path: "/api/cms",
    sameSite: "lax",
    secure: siteUrl.startsWith("https://"),
  });

  return response;
}
