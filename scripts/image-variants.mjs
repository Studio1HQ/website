#!/usr/bin/env node
/**
 * Makes the fixed-width image sizes that next/image asks for through
 * lib/image-loader.ts, so no image is resized on request (Vercel's Image
 * Optimization caps new images per month; past it they 402). The sizes are
 * plain files under public/_img, which Cloudflare caches in front of the site.
 *
 *   public images         public/_img/<width>/<path in public, as .webp>
 *   images imported       public/_img/<width>/_media/<name>.webp
 *   in code (from public/)
 *   SVGs (not resized)    public/_img/as-is/<path in public>
 *                         public/_img/as-is/_media/<name>.svg
 *
 * The extension is swapped, not added (logos/x.png → logos/x.webp), so two
 * images that differ only by extension would clash; the script stops if so.
 *
 * Runs before `next build` (package.json "build"): on Vercel, Next packages
 * the deploy inside `next build`, so files written after it are left out.
 * Every width exists for every image (a width above the image's own is the
 * image at its own size), so a page never asks for a file that isn't there.
 * Finished sizes are kept in .next/cache/image-variants (Vercel restores that
 * folder before each build), so only new or changed images are worked on. If
 * an image can't be read, its original bytes stand in for every size.
 *
 * Usage: node scripts/image-variants.mjs
 */

import { createHash, randomUUID } from "node:crypto";
import {
  access,
  copyFile,
  mkdir,
  readFile,
  readdir,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import sharp from "sharp";
import {
  AS_IS_DIR,
  AS_IS_IMAGE,
  IMAGE_FOLDERS,
  IMAGE_WIDTHS,
  MEDIA_DIR,
  SIZED_IMAGE,
  webpName,
} from "../lib/image-config.mjs";

const QUALITY = 75;
/** Part of every cache file name: bump it to drop sizes an older version made. */
const CACHE_VERSION = "v2";
const IMAGE = /\.(?:webp|png|jpe?g|avif|svg)$/i;
/** Where code may import images from public/. */
const CODE_DIRS = ["app", "components", "constants", "data", "lib", "content"];
const CODE = /\.(?:[cm]?[jt]sx?|mdx)$/;
/** `from "@/public/x.webp"`, `from "../public/x.webp"` and the like. */
const PUBLIC_IMPORT =
  /from\s+["'](?:@\/|(?:\.\.?\/)+)public\/([^"']+\.(?:webp|png|jpe?g|avif|svg))["']/gi;

const root = process.cwd();
const publicDir = path.join(root, "public");
const out = path.join(publicDir, "_img");
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
    if (entry.isDirectory()) {
      if (entry.name !== "node_modules" && !entry.name.startsWith("."))
        yield* walk(full);
    } else if (entry.isFile()) yield full;
  }
}

const toUrl = (from, file) =>
  path.relative(from, file).split(path.sep).join("/");

/** Images in public/ that pages may ask for: { file, name } (name = the path under /_img/<width>/). */
export async function publicImages(base = root) {
  const list = [];
  for (const folder of IMAGE_FOLDERS) {
    for await (const file of walk(path.join(base, "public", folder))) {
      if (IMAGE.test(file))
        list.push({ file, name: toUrl(path.join(base, "public"), file) });
    }
  }
  return list;
}

/**
 * Images imported in code from public/. Next serves those as
 * /_next/static/media/<name>.<hash>.<ext>; the loader points them at
 * /_img/<width>/_media/<name>.webp, so names (without extension) must be unique.
 */
export async function importedImages(base = root) {
  const byName = new Map();
  for (const dir of CODE_DIRS) {
    for await (const file of walk(path.join(base, dir))) {
      if (!CODE.test(file)) continue;
      const text = await readFile(file, "utf8");
      for (const match of text.matchAll(PUBLIC_IMPORT)) {
        const rel = match[1];
        const name = path.posix.basename(rel);
        const seen = byName.get(webpName(name));
        if (seen && seen.rel !== rel)
          throw new Error(
            `two imported images would both be _media/${webpName(name)}: ${seen.rel} and ${rel}`,
          );
        byName.set(webpName(name), {
          rel,
          file: path.join(base, "public", ...rel.split("/")),
          name: `${MEDIA_DIR}/${name}`,
        });
      }
    }
  }
  return [...byName.values()].map(({ file, name }) => ({ file, name }));
}

/**
 * The sized file each image becomes. Stops the build if two images would
 * become the same file (x.png and x.webp in one folder).
 */
export function sizedFiles(sources) {
  const byTarget = new Map();
  for (const { file, name } of sources) {
    const target = webpName(name);
    const seen = byTarget.get(target);
    if (seen && seen !== file)
      throw new Error(
        `${toUrl(root, seen)} and ${toUrl(root, file)} would both be /_img/<width>/${target}; rename one`,
      );
    byTarget.set(target, file);
  }
  return [...byTarget].map(([target, file]) => ({ file, target }));
}

/** For each width: resize below the image's own width, the image at its own size from there up. */
export function plan(naturalWidth) {
  return IMAGE_WIDTHS.map((width) => ({ width, resize: width < naturalWidth }));
}

async function exists(file) {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
}

/** An SVG: one copy, unchanged, under /_img/as-is. */
async function copyAsIs({ file, target: name }, stats) {
  const target = path.join(out, AS_IS_DIR, name);
  await mkdir(path.dirname(target), { recursive: true });
  await copyFile(file, target);
  stats.copied += 1;
}

async function makeOne({ file, target: name }, stats) {
  if (AS_IS_IMAGE.test(name)) return copyAsIs({ file, target: name }, stats);
  if (!SIZED_IMAGE.test(name)) return;
  const input = await readFile(file);
  const targets = IMAGE_WIDTHS.map((width) =>
    path.join(out, String(width), name),
  );
  await Promise.all(
    targets.map((target) => mkdir(path.dirname(target), { recursive: true })),
  );
  let meta;
  try {
    meta = await sharp(input).metadata();
  } catch (error) {
    // Unreadable: the original stands in for every size, so nothing 404s.
    await Promise.all(targets.map((target) => writeFile(target, input)));
    stats.failed.push(
      `${name}: ${error instanceof Error ? error.message : error}`,
    );
    return;
  }
  if ((meta.pages ?? 1) > 1) {
    // Animated: resizing would keep only the first frame, so the original
    // stands in for every size.
    await Promise.all(targets.map((target) => writeFile(target, input)));
    stats.animated.push(name);
    return;
  }
  const hash = createHash("sha1").update(input).digest("hex").slice(0, 20);
  // The width as shown (a photo's EXIF orientation can swap width and height).
  const shownWidth = meta.autoOrient?.width ?? meta.width ?? 0;
  for (const [index, { width, resize }] of plan(shownWidth).entries()) {
    const target = targets[index];
    const cached = path.join(
      cacheDir,
      `${CACHE_VERSION}-${hash}-${resize ? width : "full"}-q${QUALITY}.webp`,
    );
    if (await exists(cached)) {
      await copyFile(cached, target);
      stats.cached += 1;
      continue;
    }
    const buffer = resize
      ? await sharp(input)
          .rotate()
          .resize({ width, withoutEnlargement: true })
          .webp({ quality: QUALITY })
          .toBuffer()
      : meta.format === "webp"
        ? input
        : await sharp(input).rotate().webp({ quality: QUALITY }).toBuffer();
    // Into the cache via a temporary file, so a build stopped midway can't
    // leave a half-written size there for the next build to reuse. Its name is
    // unique: one file can be both a public and an imported image, so two
    // workers may make the same size at once.
    const temporary = `${cached}.${randomUUID()}.tmp`;
    try {
      await writeFile(temporary, buffer);
      await rename(temporary, cached);
    } catch (error) {
      await rm(temporary, { force: true });
      throw error;
    }
    await writeFile(target, buffer);
    stats.made += 1;
  }
}

export async function main() {
  const started = Date.now();
  await rm(out, { recursive: true, force: true });
  await mkdir(cacheDir, { recursive: true });
  // Sizes from an older version of this script (or half-written ones) go.
  for (const entry of await readdir(cacheDir))
    if (!entry.startsWith(`${CACHE_VERSION}-`) || entry.endsWith(".tmp"))
      await rm(path.join(cacheDir, entry), { force: true });
  const sources = sizedFiles([
    ...(await publicImages()),
    ...(await importedImages()),
  ]);
  const stats = { made: 0, cached: 0, copied: 0, failed: [], animated: [] };
  const queue = [...sources];
  const workers = Array.from(
    { length: Math.max(2, Math.min(8, os.availableParallelism?.() ?? 4)) },
    async () => {
      for (let next = queue.shift(); next; next = queue.shift())
        await makeOne(next, stats);
    },
  );
  await Promise.all(workers);
  const seconds = ((Date.now() - started) / 1000).toFixed(1);
  console.log(
    `[image-variants] ${sources.length} images → ${stats.made} sizes made, ${stats.cached} from cache, ${stats.copied} SVGs copied, in ${seconds}s`,
  );
  for (const line of stats.failed)
    console.warn(`[image-variants] couldn't read, original used: ${line}`);
  for (const name of stats.animated)
    console.log(`[image-variants] animated, original used: ${name}`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main().catch((error) => {
    console.error("[image-variants] failed:", error);
    process.exit(1);
  });
}
