import type { Metadata } from "next";
import { PaperNotFound } from "@/components/paper/paper-error-pages";

/**
 * A missing page inside the site (notFound() from a route, e.g. a bad blog
 * slug or the hidden /hackathons). The (site) layout already draws the
 * navbar and footer, so this renders only the page itself; the root
 * not-found brings its own chrome for URLs that match no route at all.
 */
export const metadata: Metadata = {
  title: { absolute: "Page not found | Studio1" },
};

export default function SiteNotFound() {
  return <PaperNotFound />;
}
