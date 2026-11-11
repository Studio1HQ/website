import { notFound } from "next/navigation";
import { coverStaticParams, getCoverPost, renderCover } from "@/app/blog-cover/cover";
import { OG_SIZE } from "@/lib/og";

type Props = {
  params: Promise<{ slug: string }>;
};

export const runtime = "nodejs";
export const dynamic = "force-static";

export function generateStaticParams() {
  return coverStaticParams();
}

/** A post's share card: its banner art at 1200x630, built with the post. */
export async function GET(_: Request, { params }: Props) {
  const { slug } = await params;
  const post = getCoverPost(slug);
  if (!post) notFound();
  return renderCover(post, OG_SIZE);
}
