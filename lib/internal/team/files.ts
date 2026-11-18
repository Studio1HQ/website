import { downloadFile, removeFiles, signedUploadUrl, uploadFile } from "@/lib/supabase-server";
import { authSecret, sha256 } from "@/lib/internal/token";

/**
 * Files for the team pages, in the private `team-files` bucket: profile
 * photos (photos/), emailed invoices (invoices/) and expense receipts
 * (receipts/). They're only ever served through /team-file, which
 * checks who's asking. Server only.
 */

export const TEAM_BUCKET = "team-files";
export const MAX_FILE_BYTES = 10 * 1024 * 1024;

export type TeamFolder = "photos" | "invoices" | "receipts";

const EXTENSIONS: Record<string, string> = {
  "application/pdf": "pdf",
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

/** What the bytes really are (PDF, PNG, JPEG or WebP), whatever the name says. */
export function sniffType(bytes: Uint8Array): keyof typeof EXTENSIONS | null {
  const starts = (...values: number[]) => values.every((value, index) => bytes[index] === value);
  if (starts(0x25, 0x50, 0x44, 0x46)) return "application/pdf";
  if (starts(0x89, 0x50, 0x4e, 0x47)) return "image/png";
  if (starts(0xff, 0xd8, 0xff)) return "image/jpeg";
  if (starts(0x52, 0x49, 0x46, 0x46) && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) {
    return "image/webp";
  }
  // Some scanners and invoice tools put a byte-order mark, blank lines or a
  // few stray bytes ahead of "%PDF". Readers accept the header anywhere in
  // the first 1024 bytes, so this does too.
  const head = Math.min(bytes.length - 4, 1024);
  for (let at = 1; at <= head; at += 1) {
    if (bytes[at] === 0x25 && bytes[at + 1] === 0x50 && bytes[at + 2] === 0x44 && bytes[at + 3] === 0x46) {
      return "application/pdf";
    }
  }
  return null;
}

/** A tidy file name for downloads: "Invoice Nov 2026.pdf" stays readable. */
export function cleanFileName(name: string, type: string) {
  const extension = EXTENSIONS[type] ?? "bin";
  const base = name
    .replace(/\.[a-z0-9]{1,5}$/i, "")
    .replace(/[^\p{L}\p{N} ._-]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
  return `${base || "file"}.${extension}`;
}

export type SavedFile = { ok: true; path: string; name: string; type: string } | { ok: false; message: string };

/**
 * Saves a PDF or image under folder/<id>/. Checks the size and the real file
 * type; anything else is refused.
 */
export async function saveTeamFile(
  folder: TeamFolder,
  id: string,
  body: Uint8Array | ArrayBuffer,
  name: string,
): Promise<SavedFile> {
  const bytes = body instanceof Uint8Array ? body : new Uint8Array(body);
  if (bytes.byteLength === 0) return { ok: false, message: "The file is empty." };
  if (bytes.byteLength > MAX_FILE_BYTES) return { ok: false, message: "Files can be 10 MB at most." };
  const type = sniffType(bytes);
  if (!type) return { ok: false, message: "Only PDFs and images (PNG, JPEG, WebP) can be added." };
  const fileName = cleanFileName(name, type);
  const key = `${folder}/${id}/${crypto.randomUUID().slice(0, 8)}.${EXTENSIONS[type]}`;
  const saved = await uploadFile(TEAM_BUCKET, key, new Blob([bytes as BlobPart], { type }), type);
  if (!saved.ok) {
    console.error(`[team] saving ${key} failed: ${saved.message}`);
    return {
      ok: false,
      message: /bucket not found/i.test(saved.message)
        ? "Run the team migration in Supabase first (it adds the team-files bucket)."
        : "Couldn't save the file. Try again in a minute.",
    };
  }
  return { ok: true, path: key, name: fileName, type };
}

/*
 * Big receipts. A server action's request stops at 4 MB (next.config.ts),
 * and a scanned PDF is often bigger, so those go from the browser straight
 * to the bucket: the dashboard hands out a one-off upload link, then checks
 * the file itself before the claim is saved.
 */

/**
 * Where a person's directly uploaded receipt for claim `id` lives. The name
 * is derived from who they are, so nobody can point a claim at a file that
 * isn't theirs. Null when there's no signing secret.
 */
async function uploadedReceiptPath(email: string, id: string) {
  const secret = authSecret();
  if (!secret) return null;
  const tag = (await sha256(`receipt:${secret}:${email}:${id}`)).replace(/[^a-zA-Z0-9]/g, "").slice(0, 16);
  return `receipts/${id}/${tag}.pdf`;
}

/** A new claim id and the link to PUT its PDF receipt to. */
export async function startReceiptUpload(
  email: string,
): Promise<{ ok: true; id: string; url: string } | { ok: false; message: string }> {
  const id = crypto.randomUUID();
  const path = await uploadedReceiptPath(email, id);
  const signed = path ? await signedUploadUrl(TEAM_BUCKET, path) : null;
  if (!signed?.ok) {
    if (signed) console.error(`[team] upload link for ${path} failed: ${signed.message}`);
    return { ok: false, message: "Couldn't start the upload. Try again in a minute." };
  }
  return { ok: true, id, url: signed.url };
}

/**
 * The receipt someone uploaded for claim `id`, once it's checked: it has to
 * be there and really be a PDF. Anything else is deleted and refused.
 */
export async function uploadedReceipt(email: string, id: string, name: string): Promise<SavedFile> {
  const path = await uploadedReceiptPath(email, id);
  if (!path) return { ok: false, message: "Couldn't save the file. Try again in a minute." };
  const file = await downloadFile(TEAM_BUCKET, path);
  if (!file.ok) return { ok: false, message: "The receipt didn't upload. Try again." };
  const bytes = new Uint8Array(file.body);
  if (bytes.byteLength > MAX_FILE_BYTES || sniffType(bytes) !== "application/pdf") {
    await deleteTeamFiles([path]);
    return { ok: false, message: "That file isn't a PDF. Add a PDF or a photo of the receipt." };
  }
  return { ok: true, path, name: cleanFileName(name, "application/pdf"), type: "application/pdf" };
}

export async function readTeamFile(path: string) {
  return downloadFile(TEAM_BUCKET, path);
}

export async function deleteTeamFiles(paths: (string | null | undefined)[]) {
  const list = paths.filter((path): path is string => Boolean(path));
  if (list.length) await removeFiles(TEAM_BUCKET, list);
}
