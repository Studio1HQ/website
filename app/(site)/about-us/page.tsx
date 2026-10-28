"use client";
import { VisionMission } from "@/components/about-us/vision-mission";
import {
  Code,
  UsersThree,
  Wrench,
  FileText,
  Link as LinkIcon,
} from "@phosphor-icons/react";
import { Team } from "@/components/about-us/team";
import { SelectedWork } from "@/components/about-us/selected-work";
import { StudioBento } from "@/components/about-us/studio-bento";
import Logo from "@/components/ui/svgs/logo";
import { Companies } from "@/components/about-us/companies";
import { motion, useReducedMotion } from "motion/react";
import { PaperPageHeader } from "@/components/paper/paper-page-header";
import { HeroArrows } from "@/components/about-us/hero-arrows";
import { Accent, PaperCta } from "@/components/paper/paper-sections";
import { PAPER_SCOPE, PRINT } from "@/lib/paper";
import { useTranslations } from "next-intl";

const tags = [
  {
    key: "developerCentric",
    icon: Code,
  },
  {
    key: "technicalExpertise",
    icon: Wrench,
  },
  {
    key: "communityDriven",
    icon: UsersThree,
  },
  {
    key: "contentFocused",
    icon: FileText,
  },
  {
    key: "endToEnd",
    icon: LinkIcon,
  },
];

// Animation variants that can be reused across components
const sectionAnimation = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.35,
      ease: "easeOut" as const,
    },
  },
};

/** The intro video, mounted on a white card like a print pinned to the sheet. */
function StudioIntroVideo() {
  return (
    <section className="mx-auto w-full max-w-[65rem]">
      <div className="rounded-[6px] bg-white/80 p-2 shadow-[inset_0_1px_0_#fff,0_40px_80px_-48px_rgba(20,20,20,0.5)] ring-1 ring-inset ring-[#141414]/10 sm:p-2.5">
        <div className="aspect-video w-full overflow-hidden rounded-[6px] bg-[#fbfaf7] shadow-[inset_0_3px_10px_rgba(20,20,20,0.10),inset_0_1px_2px_rgba(20,20,20,0.08)]">
          <iframe
            className="h-full w-full"
            src="https://www.youtube-nocookie.com/embed/86fFNr5Dyqk?rel=0"
            title="How Studio1 started"
            loading="lazy"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
          />
        </div>
      </div>
    </section>
  );
}

export default function AboutUs() {
  const t = useTranslations("AboutPage");
  const reduceMotion = useReducedMotion();

  return (
    <div className="overflow-x-clip" style={PAPER_SCOPE}>
      <PaperPageHeader className="pb-10 pt-28 md:pb-12 md:pt-36">
        <HeroArrows />
        <motion.div
          className="mx-auto flex max-w-[1300px] flex-col items-center px-4 text-center sm:px-6"
          initial={reduceMotion ? false : "hidden"}
          animate="visible"
          variants={sectionAnimation}
        >
          {/* Big centred statement first, like a studio intro */}
          <h1 className="max-w-[980px] text-balance text-[36px] leading-[1.08] tracking-[-0.05em] sm:text-[48px] md:text-[60px]">
            <span className="block font-medium">
              {t("titlePrefix")}{" "}
              <span className="relative inline-block whitespace-nowrap">
                {t("titleHighlightOne")}
                {/* Hand-drawn underline that draws in on load */}
                <svg
                  aria-hidden
                  viewBox="0 0 300 20"
                  preserveAspectRatio="none"
                  className="pointer-events-none absolute -bottom-[0.12em] left-0 h-[0.28em] w-full overflow-visible"
                >
                  <motion.path
                    d="M4 13 C 60 6, 140 4, 296 9 M 30 17 C 110 12, 200 12, 270 15"
                    fill="none"
                    stroke="#f97316"
                    strokeWidth="4"
                    strokeLinecap="round"
                    vectorEffect="non-scaling-stroke"
                    initial={reduceMotion ? false : { pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{
                      duration: 1.1,
                      ease: [0.65, 0, 0.35, 1],
                      delay: 0.5,
                    }}
                  />
                </svg>
              </span>
            </span>
            <span className="block font-normal text-[#141414]/80">
              {t("titleMiddle")} {t("titleHighlightTwo")}{" "}
              <span
                aria-hidden
                className="mx-1 inline-flex h-[0.82em] w-[1.5em] translate-y-[0.08em] items-center justify-center rounded-full border-[1.5px] border-[#141414]/70 align-baseline"
              >
                <Logo className="size-[0.5em]" />
              </span>{" "}
              {t("titleSuffix")}
            </span>
          </h1>
          <p className="mt-6 max-w-[620px] text-[16px] leading-[1.6] text-[#141414]/[0.62] sm:text-[17px]">
            {t("descriptionLineOne")} {t("descriptionLineTwo")}
          </p>
          <div className="mt-8 flex max-w-5xl flex-wrap items-center justify-center gap-2">
            {tags.map((tag, index) => (
              <motion.span
                key={tag.key}
                initial={reduceMotion ? false : { opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + 0.05 * index, duration: 0.4 }}
                className="inline-flex items-center gap-2 rounded-full bg-[#f8f6f2] px-4 py-2 text-[13px] font-medium text-[#141414] shadow-[inset_0_2px_6px_rgba(20,20,20,0.09),inset_0_1px_2px_rgba(20,20,20,0.07)]"
              >
                <tag.icon
                  weight="duotone"
                  className="size-4 shrink-0"
                  style={{ color: PRINT }}
                />
                {t(`tags.${tag.key}`)}
              </motion.span>
            ))}
          </div>
          <div className="mt-12 w-full max-w-[1100px]">
            <StudioIntroVideo />
          </div>
        </motion.div>
      </PaperPageHeader>

      <StudioBento />
      <VisionMission />
      <Team />
      <SelectedWork />
      <Companies />
      <PaperCta index={5} />
    </div>
  );
}
