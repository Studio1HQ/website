import "server-only";
import { lookup as dnsLookup } from "node:dns";
import http from "node:http";
import https from "node:https";
import type { LookupFunction } from "node:net";
import type { Readable } from "node:stream";
import { createBrotliDecompress, createGunzip, createInflate } from "node:zlib";
import { unstable_cache } from "next/cache";
import {
  imageType,
  isPrivateAddress,
  isPublicHost,
  pickIcons,
} from "@/lib/internal/clients/logo-pick";

/*
 * A client's logo: the icon its website declares, fetched once and kept for
 * a month (logos rarely change). Served by
 * app/internal/(dashboard)/clients/[slug]/logo/route.ts.
 */

/** How long a found logo is kept on the server and in the browser. */
export const LOGO_KEEP_SECONDS = 60 * 60 * 24 * 30;

const MAX_PAGE_BYTES = 512 * 1024;
const MAX_LOGO_BYTES = 256 * 1024;
const TIMEOUT_MS = 5000;
const MAX_REDIRECTS = 4;

const HEADERS = {
  // Some sites turn away requests without a browser-like agent.
  "user-agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36",
  "accept-language": "en",
};

type Got = { status: number; location: string | null; bytes: Uint8Array | null };

/**
 * DNS lookup for the logo requests that refuses private addresses. The
 * socket connects to the address checked here, so a name can't pass the
 * check and then point somewhere else (DNS rebinding).
 */
const publicLookup: LookupFunction = (hostname, options, callback) => {
  dnsLookup(hostname, { ...options, all: true }, (error, addresses) => {
    const list = addresses ?? [];
    const blocked =
      !error && (!list.length || list.some((item) => isPrivateAddress(item.address)))
        ? Object.assign(new Error(`${hostname} resolves to a private address`), { code: "EBLOCKED" })
        : null;
    if (error || blocked) return callback(error ?? blocked, "");
    if (options.all) callback(null, list);
    else callback(null, list[0].address, list[0].family);
  });
};

/**
 * One GET, without following redirects. The body (decompressed) is read
 * only for a 2xx answer: null once it passes `max` bytes, or with `cut` its
 * first `max` bytes (a page's icons are in its head, near the top).
 */
function getOnce(url: URL, accept: string, max: number, cut: boolean): Promise<Got> {
  return new Promise((resolve, reject) => {
    const client = url.protocol === "https:" ? https : http;
    const request = client.get(
      url,
      {
        headers: { ...HEADERS, accept, "accept-encoding": "gzip, deflate, br" },
        lookup: publicLookup,
        agent: false,
        signal: AbortSignal.timeout(TIMEOUT_MS),
      },
      (response) => {
        const status = response.statusCode ?? 0;
        let settled = false;
        const finish = (bytes: Uint8Array | null, location: string | null = null) => {
          if (settled) return;
          settled = true;
          resolve({ status, location, bytes });
          response.destroy();
        };
        response.on("error", (error) => {
          if (!settled) {
            settled = true;
            reject(error);
          }
        });
        if (status < 200 || status >= 300) {
          const location = response.headers.location;
          finish(null, typeof location === "string" ? location : null);
          return;
        }

        const encoding = String(response.headers["content-encoding"] ?? "identity").trim().toLowerCase();
        let body: Readable = response;
        if (encoding === "gzip" || encoding === "x-gzip") body = response.pipe(createGunzip());
        else if (encoding === "deflate") body = response.pipe(createInflate());
        else if (encoding === "br") body = response.pipe(createBrotliDecompress());
        else if (encoding !== "identity" && encoding !== "") return finish(null);
        if (body !== response) {
          body.on("error", (error) => {
            if (!settled) {
              settled = true;
              reject(error);
            }
            response.destroy();
          });
        }

        const chunks: Buffer[] = [];
        let total = 0;
        body.on("data", (chunk: Buffer) => {
          if (settled) return;
          total += chunk.length;
          if (total <= max) {
            chunks.push(chunk);
            return;
          }
          if (cut) chunks.push(chunk.subarray(0, chunk.length - (total - max)));
          finish(cut ? new Uint8Array(Buffer.concat(chunks)) : null);
          if (body !== response) body.destroy();
        });
        body.on("end", () => finish(new Uint8Array(Buffer.concat(chunks))));
      },
    );
    request.on("error", reject);
  });
}

/**
 * GET a public http(s) URL, following redirects by hand so each hop's name
 * and address are checked (isPublicHost, publicLookup). Null on any failure.
 */
async function fetchPublic(
  start: string,
  accept: string,
  max: number,
  cut = false,
  deadline = Infinity,
): Promise<{ url: string; bytes: Uint8Array } | null> {
  let url = start;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    if (Date.now() > deadline) return null;
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      return null;
    }
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;
    if (parsed.username || parsed.password) return null;
    if (!isPublicHost(parsed.hostname)) return null;
    let got: Got;
    try {
      got = await getOnce(parsed, accept, max, cut);
    } catch {
      return null;
    }
    if (got.status >= 300 && got.status < 400) {
      if (!got.location) return null;
      try {
        url = new URL(got.location, parsed).toString();
      } catch {
        return null;
      }
      continue;
    }
    return got.bytes ? { url: parsed.toString(), bytes: got.bytes } : null;
  }
  return null;
}

/** How long the search for a site's own icon may take in all. */
const LOGO_SEARCH_MS = 12_000;

export type Logo = { type: string; bytes: Uint8Array };

async function fetchImage(url: string, deadline = Infinity): Promise<Logo | null> {
  const got = await fetchPublic(url, "image/avif,image/webp,image/svg+xml,image/*;q=0.8,*/*;q=0.5", MAX_LOGO_BYTES, false, deadline);
  if (!got || !got.bytes.byteLength) return null;
  const type = imageType(got.bytes);
  return type ? { type, bytes: got.bytes } : null;
}

/**
 * Looks for the site's logo: the icons its home page declares (best first),
 * then /favicon.ico, then Google's favicon service (which has icons for
 * sites that turn away servers). Null when none of them gives an image.
 */
export async function findLogo(website: string): Promise<Logo | null> {
  let home: URL;
  try {
    home = new URL(website);
  } catch {
    return null;
  }
  if (!isPublicHost(home.hostname)) return null;
  home = new URL("/", home);

  // One budget for the whole search, so a slow or dead site can't hold a
  // request for minutes. The last resort (Google) always gets its go.
  const deadline = Date.now() + LOGO_SEARCH_MS;
  const tried = new Set<string>();
  const page = await fetchPublic(home.toString(), "text/html,application/xhtml+xml", MAX_PAGE_BYTES, true, deadline);
  if (page) {
    const html = new TextDecoder().decode(page.bytes);
    for (const icon of pickIcons(html, page.url).slice(0, 4)) {
      tried.add(icon);
      const logo = await fetchImage(icon, deadline);
      if (logo) return logo;
    }
  }

  const origin = page ? new URL(page.url).origin : home.origin;
  const fallback = new URL("/favicon.ico", origin).toString();
  if (!tried.has(fallback)) {
    const logo = await fetchImage(fallback, deadline);
    if (logo) return logo;
  }

  const google = new URL("https://www.google.com/s2/favicons");
  google.searchParams.set("domain", home.hostname);
  google.searchParams.set("sz", "128");
  return fetchImage(google.toString());
}

/**
 * The logo kept across requests for a month, by website. A site with no
 * logo isn't kept (the lookup throws), so a site that was down gets another
 * go; the route asks browsers not to retry a miss for a day.
 */
const keptLogo = unstable_cache(
  async (website: string) => {
    const logo = await findLogo(website);
    if (!logo) throw new Error("No logo");
    return { type: logo.type, data: Buffer.from(logo.bytes).toString("base64") };
  },
  ["client-logo-v1"],
  { revalidate: LOGO_KEEP_SECONDS, tags: ["client-logo"] },
);

export async function clientLogo(website: string): Promise<Logo | null> {
  try {
    const kept = await keptLogo(website);
    return { type: kept.type, bytes: new Uint8Array(Buffer.from(kept.data, "base64")) };
  } catch {
    return null;
  }
}
