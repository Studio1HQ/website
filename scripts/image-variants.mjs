#!/usr/bin/env node
/**
 * Makes the fixed-width image sizes that next/image asks for through
 * lib/image-loader.ts, so no image is resized on request (Vercel's Image
 * Optimization caps new images per month; past it they 402). The sizes are
 * plain files under public/_img, which Cloudflare caches in front of the site.
 *
 *   public/_img/<width>/<original path>.webp
 *
 * Runs after `next build` (package.json "build"), because two kinds of
 * images only exist then: images imported in code (.next/static/.../media,
 * named with a hash) and the blog covers app/blog-cover draws at build time.
 *
 * A width at or above the image's own is skipped for WebP sources (the
 * /_img fallback rewrite serves the original) and made at the image's own
 * size for PNG and JPEG ones, so those still arrive as WebP. Finished sizes
 * are kept in .next/cache/image-variants (Vercel keeps that folder between
 * builds), so only new or changed images are worked on. A failure skips that
 * image (its original is served) and never fails the build.
 *
 * Usage: node scripts/image-variants.mjs
 */

import { createHash } from "node:crypto";
import {
  access,
  copyFile,
  mkdir,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import sharp from "sharp";

/** Keep in step with IMAGE_WIDTHS in lib/image-loader.ts (a test checks). */
export const IMAGE_WIDTHS = [96, 256, 640, 1280, 1920];

const QUALITY = 75;
const IMAGE = /\.(?:webp|png|jpe?g)$/i;
/** public/ folders whose images never go through next/image. */
const SKIP_PUBLIC = ["_img", "brand", "email"];

const root = process.cwd();
const out = path.join(root, "public", "_img");
const cacheDir = path.join(root, ".next", "cache", "image-variants");

async function* walk(dir) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else if (entry.isFile()) yield full;
  }
}

const urlPath = (from, file) =>
  path.relative(from, file).split(path.sep).join("/");

/** Every image next/image may ask for, as { file, url }. */
export async function findSources(base = root) {
  const sources = [];
  const publicDir = path.join(base, "public");
  for await (const file of walk(publicDir)) {
    const rel = urlPath(publicDir, file);
    if (
      !IMAGE.test(rel) ||
      SKIP_PUBLIC.some((skip) => rel === skip || rel.startsWith(`${skip}/`))
    )
      continue;
    sources.push({ file, url: `/${rel}` });
  }
  // Images imported in code: /_next/static/.../media/<name>.<hash>.<ext>
  const staticDir = path.join(base, ".next", "static");
  for await (const file of walk(staticDir)) {
    const rel = urlPath(staticDir, file);
    if (IMAGE.test(rel) && rel.split("/").includes("media"))
      sources.push({ file, url: `/_next/static/${rel}` });
  }
  // Blog covers, drawn at build time by app/blog-cover/[slug] (PNG).
  const coverDir = path.join(base, ".next", "server", "app", "blog-cover");
  for await (const file of walk(coverDir)) {
    if (file.endsWith(".body") && path.dirname(file) === coverDir)
      sources.push({
        file,
        url: `/blog-cover/${path.basename(file, ".body")}`,
      });
  }
  return sources;
}

/** The widths to make for an image of this width, and whether each is a resize. */
export function plan(naturalWidth, isWebp) {
  return IMAGE_WIDTHS.flatMap((width) => {
    if (width < naturalWidth) return [{ width, resize: true }];
    // At or above its own size: WebP falls back to the original file;
    // PNG and JPEG are re-encoded once at their own size.
    return isWebp ? [] : [{ width, resize: false }];
  });
}

async function exists(file) {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
}

async function makeOne({ file, url }, stats) {
  const input = await readFile(file);
  const meta = await sharp(input).metadata();
  if (!meta.width || !["webp", "png", "jpeg"].includes(meta.format ?? ""))
    return;
  const hash = createHash("sha1").update(input).digest("hex").slice(0, 20);
  let natural = null; // the PNG/JPEG at its own size, made once
  for (const { width, resize } of plan(meta.width, meta.format === "webp")) {
    const target = path.join(out, String(width), `${url.slice(1)}.webp`);
    const cached = path.join(
      cacheDir,
      `${hash}-${resize ? width : "full"}-q${QUALITY}.webp`,
    );
    await mkdir(path.dirname(target), { recursive: true });
    if (await exists(cached)) {
      await copyFile(cached, target);
      stats.cached += 1;
      continue;
    }
    let buffer;
    if (resize) {
      buffer = await sharp(input)
        .rotate()
        .resize({ width })
        .webp({ quality: QUALITY })
        .toBuffer();
    } else {
      natural ??= await sharp(input)
        .rotate()
        .webp({ quality: QUALITY })
        .toBuffer();
      buffer = natural;
    }
    await writeFile(cached, buffer);
    await writeFile(target, buffer);
    stats.made += 1;
  }
}

export async function main() {
  const started = Date.now();
  await rm(out, { recursive: true, force: true });
  await mkdir(cacheDir, { recursive: true });
  const sources = await findSources();
  const stats = { made: 0, cached: 0, failed: [] };
  const queue = [...sources];
  const workers = Array.from(
    { length: Math.max(2, Math.min(8, os.availableParallelism?.() ?? 4)) },
    async () => {
      for (let next = queue.shift(); next; next = queue.shift()) {
        try {
          await makeOne(next, stats);
        } catch (error) {
          stats.failed.push(
            `${next.url}: ${error instanceof Error ? error.message : error}`,
          );
        }
      }
    },
  );
  await Promise.all(workers);
  const seconds = ((Date.now() - started) / 1000).toFixed(1);
  console.log(
    `[image-variants] ${sources.length} images → ${stats.made} sizes made, ${stats.cached} from cache, in ${seconds}s`,
  );
  for (const line of stats.failed)
    console.warn(`[image-variants] skipped (original is served): ${line}`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main().catch((error) => {
    // Never fail the deploy over images: every one still has its original.
    console.warn(
      "[image-variants] couldn't make image sizes; originals will be served.",
      error,
    );
  });
}
