import type { Metadata } from "next";
import PaperHero from "@/components/paper/paper-hero";
import {
  PaperCreation,
  PaperCta,
  PaperLogos,
  PaperPositioning,
  PaperProcess,
  PaperReach,
  PaperReasons,
  PaperServices,
  PaperTestimonials,
  PaperWork,
} from "@/components/paper/paper-sections";

/** Alternate "paper" design of the landing page, for review only. */
export const metadata: Metadata = {
  title: "Studio1 (paper design preview)",
  robots: { index: false, follow: false },
};

export default function PaperLanding() {
  return (
    <div className="overflow-x-clip">
      <PaperHero />
      <PaperLogos />
      <PaperPositioning />
      <PaperCreation />
      <PaperServices />
      <PaperWork />
      <PaperReasons />
      <PaperTestimonials />
      <PaperProcess />
      <PaperReach />
      <PaperCta />
    </div>
  );
}
