import { downloadFile, removeFiles, uploadFile } from "@/lib/supabase-server";

/**
 * Files for the team pages, in the private `team-files` bucket: profile
 * photos (photos/), emailed invoices (invoices/) and expense receipts
 * (receipts/). They're only ever served through /internal/team-file, which
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

export async function readTeamFile(path: string) {
  return downloadFile(TEAM_BUCKET, path);
}

export async function deleteTeamFiles(paths: (string | null | undefined)[]) {
  const list = paths.filter((path): path is string => Boolean(path));
  if (list.length) await removeFiles(TEAM_BUCKET, list);
}
