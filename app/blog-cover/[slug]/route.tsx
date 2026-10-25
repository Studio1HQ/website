import { notFound } from "next/navigation";
import { coverStaticParams, getCoverPost, renderCover } from "../cover";

type Props = {
  params: Promise<{ slug: string }>;
};

export const runtime = "nodejs";
export const dynamic = "force-static";

export function generateStaticParams() {
  return coverStaticParams();
}

/** Paper cover for a post: its illustration on the orange print panel. */
export async function GET(_: Request, { params }: Props) {
  const { slug } = await params;
  const post = getCoverPost(slug);
  if (!post) notFound();
  return renderCover(post);
}
