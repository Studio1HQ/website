/*
 * Finding a client's logo from its website: which icon the home page
 * declares, and what kind of image a downloaded file is. Pure functions
 * (no fetching), shared by the logo route and its tests; the fetching and
 * caching live in logo.ts.
 */

/** The site's hostname, without www., or null when there's no usable link. */
export function siteHost(website: string | null | undefined): string | null {
  if (!website) return null;
  try {
    const url = new URL(website);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return url.hostname.replace(/^www\./, "") || null;
  } catch {
    return null;
  }
}

/**
 * A hostname that's fine to fetch from the server: a public name, not an IP
 * address, localhost or a private-network name. Only client managers set
 * websites, but the server shouldn't fetch inside its own network either way.
 */
export function isPublicHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/\.$/, "");
  if (!host.includes(".")) return false;
  if (host.startsWith("[") || host.includes(":")) return false;
  if (/^\d+(\.\d+){3}$/.test(host)) return false;
  return !/(^|\.)(localhost|local|internal|lan|home|intranet|corp)$/.test(host);
}

function privateV4(address: string): boolean {
  const parts = address.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255))
    return true;
  const [a, b] = parts;
  return (
    a === 0 || // this network
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) || // carrier-grade NAT
    (a === 169 && b === 254) || // link-local, cloud metadata
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 192 && b === 0 && parts[2] === 0) ||
    (a === 198 && (b === 18 || b === 19)) || // benchmarking
    a >= 224 // multicast and reserved
  );
}

/**
 * An address the server mustn't connect to: loopback, private, link-local,
 * carrier-grade NAT, multicast or reserved, IPv4 or IPv6 (IPv4-mapped and
 * NAT64 forms included). Anything that doesn't parse counts as private.
 */
export function isPrivateAddress(address: string): boolean {
  const ip = address.trim().toLowerCase().replace(/^\[|\]$/g, "").replace(/%.*$/, "");
  if (/^\d+(\.\d+){3}$/.test(ip)) return privateV4(ip);
  if (!ip.includes(":")) return true;
  // An IPv4 address carried inside IPv6 (::ffff:1.2.3.4, 64:ff9b::1.2.3.4).
  const dotted = ip.match(/:(\d+(?:\.\d+){3})$/);
  if (dotted) return privateV4(dotted[1]);
  if (ip === "::" || ip === "::1") return true;
  if (/^::ffff:/.test(ip) || /^64:ff9b:/.test(ip)) return true; // hex-written IPv4 inside: refuse
  const first = parseInt(ip.split(":")[0] || "0", 16);
  return (
    (first & 0xfe00) === 0xfc00 || // unique local fc00::/7
    (first & 0xffc0) === 0xfe80 || // link-local fe80::/10
    (first & 0xff00) === 0xff00 || // multicast
    first === 0 || // ::/16 and other reserved forms
    ip.startsWith("2001:db8:") // documentation
  );
}

type Attributes = Record<string, string>;

function attributesOf(tag: string): Attributes {
  const found: Attributes = {};
  const pattern = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/g;
  for (const match of tag.matchAll(pattern)) {
    found[match[1].toLowerCase()] = match[2] ?? match[3] ?? match[4] ?? "";
  }
  return found;
}

function decodeEntities(value: string) {
  return value
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#x2f;/gi, "/");
}

/** The largest side named in a sizes attribute ("32x32 192x192"), 0 if none. */
function largestSize(sizes: string | undefined): number {
  let largest = 0;
  for (const match of (sizes ?? "").matchAll(/(\d+)\s*x\s*(\d+)/gi)) {
    largest = Math.max(largest, Number(match[1]), Number(match[2]));
  }
  return largest;
}

/**
 * The icons a page declares, best first, as absolute http(s) URLs.
 *
 * The logo shows at 20–28px (twice that on sharp screens), so: an SVG icon
 * first (sharp at any size, often the plain brand mark), then a PNG icon of
 * 64px or more, then the Apple touch icon (180px, but with its own
 * background), then smaller or unsized icons, largest first. Mask icons
 * (one-colour Safari pins) are skipped.
 */
export function pickIcons(html: string, pageUrl: string): string[] {
  const head = html.slice(0, Math.max(html.search(/<\/head>/i), 0) || html.length);
  let base = pageUrl;
  const baseTag = head.match(/<base\b[^>]*>/i);
  if (baseTag) {
    const href = attributesOf(baseTag[0]).href;
    if (href) {
      try {
        base = new URL(decodeEntities(href), pageUrl).toString();
      } catch {
        // keep the page URL
      }
    }
  }

  const found: { url: string; score: number; order: number }[] = [];
  for (const tag of head.match(/<link\b[^>]*>/gi) ?? []) {
    const attrs = attributesOf(tag);
    const rel = (attrs.rel ?? "").toLowerCase().split(/\s+/);
    const touch = rel.includes("apple-touch-icon") || rel.includes("apple-touch-icon-precomposed");
    if (!touch && !rel.includes("icon")) continue;
    const href = attrs.href?.trim();
    if (!href || /^data:/i.test(href)) continue;
    let url: URL;
    try {
      url = new URL(decodeEntities(href), base);
    } catch {
      continue;
    }
    if (url.protocol !== "https:" && url.protocol !== "http:") continue;

    const type = (attrs.type ?? "").toLowerCase();
    const svg = type.includes("svg") || /\.svg$/i.test(url.pathname);
    const size = largestSize(attrs.sizes);
    const score = svg
      ? 400
      : touch
        ? 200 + Math.min(size || 180, 512) / 1000
        : size >= 64
          ? 300 + Math.min(size, 512) / 1000
          : 100 + size / 1000;
    found.push({ url: url.toString(), score, order: found.length });
  }

  const seen = new Set<string>();
  return found
    .sort((a, b) => b.score - a.score || a.order - b.order)
    .map((item) => item.url)
    .filter((url) => !seen.has(url) && seen.add(url));
}

/**
 * The image type of downloaded bytes, read from the bytes themselves (sites
 * often answer /favicon.ico with their HTML page, or name no type). Null
 * when it isn't an image the logo can show.
 */
export function imageType(bytes: Uint8Array): string | null {
  const starts = (...values: number[]) => values.every((value, index) => bytes[index] === value);
  if (bytes.length < 4) return null;
  if (starts(0x89, 0x50, 0x4e, 0x47)) return "image/png";
  if (starts(0xff, 0xd8, 0xff)) return "image/jpeg";
  if (starts(0x47, 0x49, 0x46, 0x38)) return "image/gif";
  if (starts(0x00, 0x00, 0x01, 0x00)) return "image/x-icon";
  if (
    bytes.length >= 12 &&
    starts(0x52, 0x49, 0x46, 0x46) &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
  )
    return "image/webp";
  const text = new TextDecoder().decode(bytes.slice(0, 1024)).trimStart().toLowerCase();
  if (/^(?:﻿)?(?:<\?xml[^>]*>\s*)?(?:<!--[\s\S]*?-->\s*)*(?:<!doctype svg[^>]*>\s*)?<svg[\s>]/.test(text))
    return "image/svg+xml";
  return null;
}
