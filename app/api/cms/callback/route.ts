import { NextRequest, NextResponse } from "next/server";

const STATE_COOKIE = "studio1_cms_oauth_state";

type GitHubTokenResponse = {
  access_token?: string;
  error?: string;
  error_description?: string;
};

function getSiteUrl(request: NextRequest) {
  return (process.env.CMS_SITE_URL ?? request.nextUrl.origin).replace(/\/$/, "");
}

function htmlResponse(body: string, status = 200) {
  return new NextResponse(`<!doctype html>${body}`, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "text/html; charset=utf-8",
    },
  });
}

function errorPage(message: string, status = 400) {
  return htmlResponse(
    `<html><body><p>${message}</p><p>You can close this window and try logging in again.</p></body></html>`,
    status,
  );
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const storedState = request.cookies.get(STATE_COOKIE)?.value;

  if (!code) {
    return errorPage("GitHub did not return an authorization code.");
  }

  if (!state || !storedState || state !== storedState) {
    return errorPage("GitHub OAuth state check failed.");
  }

  if (!process.env.GITHUB_CLIENT_ID || !process.env.GITHUB_CLIENT_SECRET) {
    return errorPage("CMS GitHub OAuth is not configured on the server.", 500);
  }

  const siteUrl = getSiteUrl(request);
  const redirectUri = `${siteUrl}/api/cms/callback`;
  const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      client_id: process.env.GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: redirectUri,
      state,
    }),
  });

  const tokenData = (await tokenResponse.json()) as GitHubTokenResponse;

  if (!tokenResponse.ok || !tokenData.access_token) {
    return errorPage(tokenData.error_description ?? tokenData.error ?? "GitHub token exchange failed.", 502);
  }

  const authPayload = JSON.stringify({
    token: tokenData.access_token,
    provider: "github",
  }).replace(/</g, "\\u003c");

  const response = htmlResponse(`
    <html>
      <body>
        <p>Authentication complete. You can close this window.</p>
        <script>
          (function () {
            var authMessage = "authorization:github:success:" + ${JSON.stringify(authPayload)};

            function sendToken() {
              if (!window.opener) return;
              window.opener.postMessage(authMessage, "*");
            }

            window.addEventListener("message", function () {
              sendToken();
              window.setTimeout(function () {
                window.close();
              }, 250);
            });

            if (window.opener) {
              window.opener.postMessage("authorizing:github", "*");
              window.setTimeout(sendToken, 500);
              window.setTimeout(function () {
                window.close();
              }, 1500);
            }
          })();
        </script>
      </body>
    </html>
  `);

  response.cookies.delete(STATE_COOKIE);

  return response;
}
