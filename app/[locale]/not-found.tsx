import type { Metadata } from "next";
import { PaperNotFound } from "@/components/paper/paper-error-pages";

/**
 * A missing page inside a translated page (notFound() from a route under
 * /fr, /es, /hi or /zh). The [locale] layout already draws the
 * navbar and footer, so this renders only the page itself; the root
 * not-found brings its own chrome for URLs that match no route at all.
 */
export const metadata: Metadata = {
  title: { absolute: "Page not found | Studio1" },
};

export default function SiteNotFound() {
  return <PaperNotFound />;
}
