import { bannerByKey } from "@/lib/internal/email-banners";
import { renderEmailBanner } from "../../card";

export const runtime = "nodejs";

/**
 * The paper header image for one email template: /og/email/jobs-offer?v=1.
 * Only known templates draw; the image is cached for a year.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ key: string }> },
) {
  const banner = bannerByKey((await params).key);
  if (!banner) return new Response("Not found", { status: 404 });
  return renderEmailBanner(banner);
}
