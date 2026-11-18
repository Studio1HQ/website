#!/usr/bin/env node
/**
 * Makes the fixed-width image sizes that next/image asks for through
 * lib/image-loader.ts, so no image is resized on request (Vercel's Image
 * Optimization caps new images per month; past it they 402). The sizes are
 * plain files under public/_img, which Cloudflare caches in front of the site.
 *
 *   public images         public/_img/<width>/<path in public>.webp
 *   images imported       public/_img/<width>/_media/<file name>.webp
 *   in code (from public/)
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
import {
  IMAGE_FOLDERS,
  IMAGE_WIDTHS,
  MEDIA_DIR,
} from "../lib/image-config.mjs";

const QUALITY = 75;
const IMAGE = /\.(?:webp|png|jpe?g)$/i;
/** Where code may import images from public/. */
const CODE_DIRS = ["app", "components", "constants", "data", "lib", "content"];
const CODE = /\.(?:[cm]?[jt]sx?|mdx)$/;
/** `from "@/public/x.webp"`, `from "../public/x.webp"` and the like. */
const PUBLIC_IMPORT =
  /from\s+["'](?:@\/|(?:\.\.?\/)+)public\/([^"']+\.(?:webp|png|jpe?g))["']/gi;

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
 * /_img/<width>/_media/<name>.<ext>.webp, so file names must be unique.
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
        const seen = byName.get(name);
        if (seen && seen.rel !== rel)
          throw new Error(
            `two imported images are both named ${name}: ${seen.rel} and ${rel}`,
          );
        byName.set(name, {
          rel,
          file: path.join(base, "public", ...rel.split("/")),
          name: `${MEDIA_DIR}/${name}`,
        });
      }
    }
  }
  return [...byName.values()].map(({ file, name }) => ({ file, name }));
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

async function makeOne({ file, name }, stats) {
  const input = await readFile(file);
  const targets = IMAGE_WIDTHS.map((width) =>
    path.join(out, String(width), `${name}.webp`),
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
  const hash = createHash("sha1").update(input).digest("hex").slice(0, 20);
  for (const [index, { width, resize }] of plan(meta.width ?? 0).entries()) {
    const target = targets[index];
    const cached = path.join(
      cacheDir,
      `${hash}-${resize ? width : "full"}-q${QUALITY}.webp`,
    );
    if (await exists(cached)) {
      await copyFile(cached, target);
      stats.cached += 1;
      continue;
    }
    const buffer = resize
      ? await sharp(input)
          .rotate()
          .resize({ width })
          .webp({ quality: QUALITY })
          .toBuffer()
      : meta.format === "webp"
        ? input
        : await sharp(input).rotate().webp({ quality: QUALITY }).toBuffer();
    await writeFile(cached, buffer);
    await writeFile(target, buffer);
    stats.made += 1;
  }
}

export async function main() {
  const started = Date.now();
  await rm(out, { recursive: true, force: true });
  await mkdir(cacheDir, { recursive: true });
  const sources = [...(await publicImages()), ...(await importedImages())];
  const stats = { made: 0, cached: 0, failed: [] };
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
    `[image-variants] ${sources.length} images → ${stats.made} sizes made, ${stats.cached} from cache, in ${seconds}s`,
  );
  for (const line of stats.failed)
    console.warn(`[image-variants] couldn't read, original used: ${line}`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main().catch((error) => {
    console.error("[image-variants] failed:", error);
    process.exit(1);
  });
}
