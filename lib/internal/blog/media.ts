import { randomBytes } from "crypto";
import { downloadFile, removeFiles, uploadFile } from "@/lib/supabase-server";
import { MEDIA_PREFIX, UUID, slugify } from "@/lib/internal/blog/shared";

/**
 * Images uploaded while drafting. Each one is converted to WebP (2400px wide
 * at most, like the blog's diagrams) and kept in the private blog-media
 * bucket under the post's id until the post is published, when it's copied
 * into public/blog/uploads/<slug>/ in the repo.
 */

export const MEDIA_BUCKET = "blog-media";
/** The same 10 MB the bucket allows (20261112140000_blog_and_roles.sql). */
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
/** Plenty for one post; stops one draft from filling the bucket. */
export const MAX_IMAGES_PER_POST = 80;
const MAX_WIDTH = 2400;

const FILE = /^[a-z0-9-]{1,80}\.webp$/;

/** "post-id/name.webp" when the path is one of ours, else null. */
export function mediaPath(postId: string, file: string) {
  return UUID.test(postId) && FILE.test(file) ? `${postId}/${file}` : null;
}

/** `inUse` are the file names the post's text and cover point at now. */
export async function saveImage(postId: string, file: File, inUse: readonly string[] = []) {
  if (!UUID.test(postId)) return { ok: false as const, message: "Unknown post." };
  if (file.size > MAX_UPLOAD_BYTES) return { ok: false as const, message: "Images can be 10 MB at most." };
  if (!(await makeRoom(postId, inUse))) {
    return { ok: false as const, message: `This post already has ${MAX_IMAGES_PER_POST} uploaded images, the most one post can hold.` };
  }
  let webp: Buffer;
  try {
    const input = Buffer.from(await file.arrayBuffer());
    // Loaded on upload only, so other blog actions don't load the image library.
    const { default: sharp } = await import("sharp");
    webp = await sharp(input, { animated: true, limitInputPixels: 80_000_000 })
      .rotate()
      .resize({ width: MAX_WIDTH, withoutEnlargement: true })
      .webp({ quality: 85 })
      .toBuffer();
  } catch {
    return { ok: false as const, message: "That file isn't an image we can use. Try a PNG, JPG, GIF or WebP." };
  }
  if (webp.length > MAX_UPLOAD_BYTES) {
    return { ok: false as const, message: "That image is still over 10 MB after converting it. Use a smaller or shorter one." };
  }
  const base = slugify(file.name.replace(/\.[a-z0-9]+$/i, "")).slice(0, 50) || "image";
  const name = `${base}-${randomBytes(3).toString("hex")}.webp`;
  const path = `${postId}/${name}`;
  const saved = await uploadFile(MEDIA_BUCKET, path, new Blob([new Uint8Array(webp)], { type: "image/webp" }), "image/webp");
  if (!saved.ok) {
    console.error(`[blog] image upload failed: ${saved.message}`);
    return {
      ok: false as const,
      message: saved.message.includes("Bucket not found")
        ? "Run the blog migration in Supabase first (it creates the image bucket)."
        : "The upload failed. Try again in a minute.",
    };
  }
  return { ok: true as const, url: `${MEDIA_PREFIX}${path}`, name };
}

export async function readImage(path: string) {
  return downloadFile(MEDIA_BUCKET, path);
}

export async function removeImages(paths: string[]) {
  await removeFiles(MEDIA_BUCKET, paths);
}

type StoredImage = { name: string; createdAt: number };

/**
 * True when the post has room for one more image. At the limit, images the
 * post stopped using over an hour ago are removed first (newer ones may
 * belong to an edit that hasn't saved yet).
 */
async function makeRoom(postId: string, inUse: readonly string[]) {
  const stored = await listImages(postId);
  if (!stored || stored.length < MAX_IMAGES_PER_POST) return true;
  const hourAgo = Date.now() - 60 * 60_000;
  const unused = stored.filter((file) => !inUse.includes(file.name) && file.createdAt < hourAgo);
  if (!unused.length) return false;
  await removeImages(unused.map((file) => `${postId}/${file.name}`));
  return true;
}

/**
 * The files stored for a post, or null when they can't be listed.
 * lib/supabase-server.ts has no "list" call, so this asks Storage directly
 * with the same server key.
 */
export async function listImages(postId: string): Promise<StoredImage[] | null> {
  const url = process.env.SUPABASE_URL?.replace(/\/+$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key || !UUID.test(postId)) return null;
  try {
    const response = await fetch(`${url}/storage/v1/object/list/${MEDIA_BUCKET}`, {
      method: "POST",
      headers: {
        apikey: key,
        // service_role keys are JWTs and also go in Authorization; sb_secret_ keys don't.
        ...(key.startsWith("eyJ") ? { authorization: `Bearer ${key}` } : {}),
        "content-type": "application/json",
      },
      body: JSON.stringify({ prefix: `${postId}/`, limit: 1000 }),
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) return null;
    const files = (await response.json()) as { name?: string; created_at?: string }[];
    return files
      .map((file) => ({ name: file.name ?? "", createdAt: Date.parse(file.created_at ?? "") || 0 }))
      .filter((file) => FILE.test(file.name));
  } catch {
    return null;
  }
}

/**
 * Removes every image stored for a post, used or not: when a draft is
 * deleted, and once a post is live and its images are in the repo. `known`
 * are names to remove even when the list can't be read.
 */
export async function removePostImages(postId: string, known: string[] = []) {
  const stored = ((await listImages(postId)) ?? []).map((file) => file.name);
  const files = [...new Set([...stored, ...known])];
  if (files.length) await removeImages(files.map((file) => `${postId}/${file}`));
}

/** Draft image URLs in a post's body or cover: "/internal/blog-media/<id>/<file>". */
export function draftImages(postId: string, ...texts: (string | null | undefined)[]) {
  const pattern = new RegExp(`${MEDIA_PREFIX.replace(/\//g, "\\/")}${postId}\\/([a-z0-9-]{1,80}\\.webp)`, "g");
  const files = new Set<string>();
  for (const text of texts) for (const match of (text ?? "").matchAll(pattern)) files.add(match[1]);
  return [...files];
}
