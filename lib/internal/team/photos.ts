import { revalidateTag, unstable_cache } from "next/cache";
import { selectRows } from "@/lib/supabase-server";
import { photoUrl } from "@/lib/internal/team/shared";

/**
 * Everyone's profile photo by email, for avatars that only know an address
 * (a client's owner, a blog reviewer, a community task's owner). The
 * dashboard layout reads it once and hands it down (components/internal/
 * team-photos.tsx). Kept for five minutes; a photo change clears it.
 */

const PHOTOS_TAG = "team-photos";

const keptPhotos = unstable_cache(
  async (): Promise<Record<string, string>> => {
    const result = await selectRows<{ email: string; photo_path: string | null }>(
      "team_people",
      new URLSearchParams({ select: "email,photo_path", photo_path: "not.is.null" }),
    );
    // Throw rather than keep an empty map: a failed read shouldn't hide
    // every photo for five minutes.
    if (!result.ok) throw new Error(result.message);
    const photos: Record<string, string> = {};
    for (const row of result.rows) {
      const url = photoUrl(row);
      if (url) photos[row.email.toLowerCase()] = url;
    }
    return photos;
  },
  ["team-photos"],
  { revalidate: 300, tags: [PHOTOS_TAG] },
);

/** Email → photo URL; empty when the team list can't be read. */
export async function teamPhotos(): Promise<Record<string, string>> {
  try {
    return await keptPhotos();
  } catch (error) {
    console.error(`[team] reading photos failed: ${error instanceof Error ? error.message : error}`);
    return {};
  }
}

/** Call after a photo is set or removed, so avatars pick it up on the next page. */
export function photosChanged() {
  try {
    revalidateTag(PHOTOS_TAG, { expire: 0 });
  } catch {
    // Outside a request (a test, a script): nothing is kept there anyway.
  }
}
