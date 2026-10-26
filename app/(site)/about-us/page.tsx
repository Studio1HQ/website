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
import { Companies } from "@/components/about-us/companies";
import { motion, useReducedMotion } from "motion/react";
import { PaperPageHeader } from "@/components/paper/paper-page-header";
import { Accent } from "@/components/paper/paper-sections";
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
      <div className="rounded-[24px] bg-white/80 p-2 shadow-[inset_0_1px_0_#fff,0_40px_80px_-48px_rgba(20,20,20,0.5)] ring-1 ring-inset ring-[#141414]/10 sm:p-2.5">
        <div className="aspect-video w-full overflow-hidden rounded-[18px] bg-[#fbfaf7] shadow-[inset_0_3px_10px_rgba(20,20,20,0.10),inset_0_1px_2px_rgba(20,20,20,0.08)]">
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
      <PaperPageHeader className="pb-16 pt-32 md:pb-20 md:pt-40">
        <motion.div
          className="mx-auto flex max-w-[1300px] flex-col items-center px-4 text-center sm:px-6"
          initial={reduceMotion ? false : "hidden"}
          animate="visible"
          variants={sectionAnimation}
        >
          <div className="w-full max-w-[1100px]">
            <StudioIntroVideo />
          </div>
          {/* Two lines from md up; each line scales with the viewport so it never wraps. */}
          <h1 className="mt-14 text-[34px] font-medium leading-[1.1] tracking-[-0.05em] sm:text-[44px] md:text-[min(3.7vw,54px)] md:[&>span]:whitespace-nowrap">
            <span className="md:block">
              {t("titlePrefix")} <Accent>{t("titleHighlightOne")}</Accent>{" "}
              {t("titleMiddle")} <Accent>{t("titleHighlightTwo")}</Accent>
            </span>{" "}
            <span className="md:block">{t("titleSuffix")}</span>
          </h1>
          <p className="mt-6 max-w-[640px] text-[16px] leading-[1.6] text-[#141414]/[0.62] sm:text-[17px]">
            {t("descriptionLineOne")} {t("descriptionLineTwo")}
          </p>

          <div className="mt-10 flex max-w-xl flex-wrap items-center justify-center gap-2">
            {tags.map((tag, index) => (
              <motion.span
                key={tag.key}
                initial={reduceMotion ? false : { opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + 0.05 * index, duration: 0.4 }}
                className="inline-flex items-center gap-2 rounded-full bg-white/80 px-4 py-2 text-[13px] font-medium text-[#141414] shadow-[inset_0_1px_0_#fff] ring-1 ring-inset ring-[#141414]/10"
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
        </motion.div>
      </PaperPageHeader>

      <VisionMission />
      <Team />
      <Companies />
    </div>
  );
}
