import { notFound } from "next/navigation";
import sharp from "sharp";
import { coverStaticParams, getCoverPost, renderCover } from "../../cover";

type Props = {
  params: Promise<{ slug: string }>;
};

export const runtime = "nodejs";
export const dynamic = "force-static";

export function generateStaticParams() {
  return coverStaticParams();
}

/**
 * The post's cover as WebP, drawn at build time, for pages (lib/image-loader.ts):
 * about a tenth of the PNG's size. The PNG (../route.tsx) stays for share cards.
 */
export async function GET(_: Request, { params }: Props) {
  const { slug } = await params;
  const post = getCoverPost(slug);
  if (!post) notFound();
  const png = Buffer.from(await (await renderCover(post)).arrayBuffer());
  const webp = await sharp(png).webp({ quality: 75 }).toBuffer();
  return new Response(new Uint8Array(webp), {
    headers: { "Content-Type": "image/webp" },
  });
}
