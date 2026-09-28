import { ImageResponse } from "next/og";
import { notFound } from "next/navigation";
import { getPostBySlug } from "@/lib/blog";
import { baseUrl } from "@/lib/site";

type Props = {
  params: Promise<{ slug: string }>;
};

export const runtime = "nodejs";
const imageSize = {
  width: 1200,
  height: 630,
};

export async function GET(_: Request, { params }: Props) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) notFound();

  const accent = "#fe5a36";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: `radial-gradient(circle at 18% 20%, ${accent}55, transparent 34%), radial-gradient(circle at 78% 18%, rgba(255,255,255,0.08), transparent 28%), linear-gradient(135deg, #120806 0%, #020202 54%, #1a0904 100%)`,
          color: "#f8fafc",
          padding: 64,
          fontFamily: "Inter, Arial, sans-serif",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            opacity: 0.16,
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.16) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.16) 1px, transparent 1px)",
            backgroundSize: "56px 56px",
          }}
        />

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`${baseUrl}/icon.png`}
              alt="Studio1 logo"
              width={76}
              height={76}
              style={{
                borderRadius: 18,
                boxShadow: "0 0 54px rgba(254,90,54,0.38)",
              }}
            />
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <div
                style={{
                  fontSize: 24,
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "rgba(255,255,255,0.84)",
                }}
              >
                Studio1 Blog
              </div>
              <div style={{ color: "rgba(255,255,255,0.56)", fontSize: 22 }}>
                Technical blogs, content, and developer growth
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          <div
            style={{
              maxWidth: 980,
              fontSize: 68,
              lineHeight: 1.02,
              fontWeight: 780,
              letterSpacing: "-0.02em",
            }}
          >
            {post.title}
          </div>
          <div
            style={{
              maxWidth: 900,
              color: "rgba(255,255,255,0.62)",
              fontSize: 28,
              lineHeight: 1.32,
            }}
          >
            {post.description}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              height: 8,
              flex: 1,
              borderRadius: 999,
              background: accent,
            }}
          />
          <div
            style={{
              color: "rgba(255,255,255,0.55)",
              fontSize: 22,
              fontWeight: 600,
            }}
          >
            studio1hq.com/blog
          </div>
        </div>
      </div>
    ),
    imageSize,
  );
}
