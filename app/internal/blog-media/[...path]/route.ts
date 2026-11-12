import { NextResponse, type NextRequest } from "next/server";
import { UUID, getPost } from "@/lib/internal/blog/data";
import { mediaPath, readImage, saveImage } from "@/lib/internal/blog/media";
import { requireBlog } from "@/lib/internal/session";

type Props = { params: Promise<{ path: string[] }> };

/**
 * Draft images, only for people who can see the post.
 *   GET  /internal/blog-media/<post-id>/<file>.webp   the image
 *   POST /internal/blog-media/<post-id>               upload (form field "file")
 */
export async function GET(_: NextRequest, { params }: Props) {
  const staff = await requireBlog("writer");
  const [postId, file, extra] = (await params).path;
  const path = postId && file && !extra ? mediaPath(postId, file) : null;
  if (!path || !(await getPost(staff, postId))) return new NextResponse("Not found", { status: 404 });
  const image = await readImage(path);
  if (!image.ok) return new NextResponse("Not found", { status: image.notFound ? 404 : 502 });
  return new NextResponse(image.body, {
    headers: {
      "content-type": "image/webp",
      // Names never change (each upload gets a new one).
      "cache-control": "private, max-age=86400, immutable",
      "x-content-type-options": "nosniff",
    },
  });
}

export async function POST(request: NextRequest, { params }: Props) {
  const staff = await requireBlog("writer");
  const [postId, extra] = (await params).path;
  if (!postId || extra || !UUID.test(postId) || !(await getPost(staff, postId))) {
    return NextResponse.json({ error: "Unknown post." }, { status: 404 });
  }
  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "No image was sent." }, { status: 400 });
  const saved = await saveImage(postId, file);
  return saved.ok
    ? NextResponse.json({ url: saved.url })
    : NextResponse.json({ error: saved.message }, { status: 400 });
}
