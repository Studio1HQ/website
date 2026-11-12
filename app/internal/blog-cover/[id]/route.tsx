import { NextResponse, type NextRequest } from "next/server";
import { renderCover } from "@/app/blog-cover/cover";
import { isCoverArt } from "@/lib/blog-cover-art";
import { BLOG_COVER_SIZE } from "@/lib/blog-cover";
import { getPost } from "@/lib/internal/blog/data";
import { requireBlog } from "@/lib/internal/session";

export const runtime = "nodejs";

type Props = { params: Promise<{ id: string }> };

/**
 * A draft's generated cover, drawn the same way the live site draws it.
 *   ?art=<key>  try another illustration (the editor's picker)
 *   ?w=480      a small thumbnail instead of the full 1600x900
 */
export async function GET(request: NextRequest, { params }: Props) {
  const staff = await requireBlog("writer");
  const post = await getPost(staff, (await params).id);
  if (!post) return new NextResponse("Not found", { status: 404 });
  const art = request.nextUrl.searchParams.get("art");
  const small = request.nextUrl.searchParams.get("w") === "480";
  const size = small ? { width: 480, height: 270 } : BLOG_COVER_SIZE;
  const image = await renderCover(
    { title: post.title || "Untitled", tags: post.tags, coverArt: isCoverArt(art) ? art : post.cover_art },
    size,
  );
  image.headers.set("cache-control", "private, max-age=600");
  return image;
}
