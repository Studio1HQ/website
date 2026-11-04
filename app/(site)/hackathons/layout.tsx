import type { Metadata } from "next";
import { HACKATHON_ROBOTS } from "@/lib/hackathons";

/**
 * DRAFT: /hackathons is a hidden route while the program is being built.
 * It is noindexed here and left out of the sitemap, nav, footer, and
 * llms.txt. Remove the robots line and add it to those when it goes live.
 */
export const metadata: Metadata = {
  robots: HACKATHON_ROBOTS,
};

export default function HackathonsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
