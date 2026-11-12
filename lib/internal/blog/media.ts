import { randomBytes } from "crypto";
import { downloadFile, removeFiles, uploadFile } from "@/lib/supabase-server";
import { MEDIA_PREFIX, slugify } from "@/lib/internal/blog/shared";

/**
 * Images uploaded while drafting. Each one is converted to WebP (2400px wide
 * at most, like the blog's diagrams) and kept in the private blog-media
 * bucket under the post's id until the post is published, when it's copied
 * into public/blog/uploads/<slug>/ in the repo.
 */

export const MEDIA_BUCKET = "blog-media";
export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;
const MAX_WIDTH = 2400;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const FILE = /^[a-z0-9-]{1,80}\.webp$/;

/** "post-id/name.webp" when the path is one of ours, else null. */
export function mediaPath(postId: string, file: string) {
  return UUID.test(postId) && FILE.test(file) ? `${postId}/${file}` : null;
}

export async function saveImage(postId: string, file: File) {
  if (!UUID.test(postId)) return { ok: false as const, message: "Unknown post." };
  if (file.size > MAX_UPLOAD_BYTES) return { ok: false as const, message: "Images can be 15 MB at most." };
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

/** Draft image URLs in a post's body or cover: "/internal/blog-media/<id>/<file>". */
export function draftImages(postId: string, ...texts: (string | null | undefined)[]) {
  const pattern = new RegExp(`${MEDIA_PREFIX.replace(/\//g, "\\/")}${postId}\\/([a-z0-9-]{1,80}\\.webp)`, "g");
  const files = new Set<string>();
  for (const text of texts) for (const match of (text ?? "").matchAll(pattern)) files.add(match[1]);
  return [...files];
}
