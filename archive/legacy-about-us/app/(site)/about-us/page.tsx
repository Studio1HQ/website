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
import { motion } from "motion/react";
import { NightHeader } from "@/components/shared/night-header";
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

function StudioIntroVideo() {
  return (
    <section className="mx-auto w-full max-w-[65rem]">
      <div className="overflow-hidden rounded-[24px] bg-black shadow-[0_40px_100px_-40px_rgba(0,0,0,0.6)] ring-1 ring-black/10 dark:ring-white/10">
        <div className="aspect-video w-full">
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

  return (
    <div className="overflow-x-clip bg-[var(--home-cream)] text-[var(--home-ink)]">
      <NightHeader className="pb-24 pt-32 md:pb-32 md:pt-36">
        <motion.div
          className="mx-auto flex max-w-[1300px] flex-col items-center px-4 text-center sm:px-6"
          initial="hidden"
          animate="visible"
          variants={sectionAnimation}
        >
          <div className="w-full max-w-[1100px]">
            <StudioIntroVideo />
          </div>
          {/* Two lines from md up; each line scales with the viewport so it never wraps. */}
          <h1 className="mt-14 text-[34px] font-medium leading-[1.1] tracking-[-0.045em] sm:text-[44px] md:text-[min(3.7vw,54px)] md:[&>span]:whitespace-nowrap">
            <span className="md:block">
              {t("titlePrefix")}{" "}
              <span className="s1-accent-text">{t("titleHighlightOne")}</span>{" "}
              {t("titleMiddle")}{" "}
              <span className="s1-accent-text">{t("titleHighlightTwo")}</span>
            </span>{" "}
            <span className="md:block">{t("titleSuffix")}</span>
          </h1>
          <p className="mt-6 max-w-[640px] text-[16px] leading-[1.6] text-white/60 sm:text-[18px]">
            {t("descriptionLineOne")} {t("descriptionLineTwo")}
          </p>

          <div className="mt-10 flex max-w-xl flex-wrap items-center justify-center gap-2.5">
            {tags.map((tag, index) => (
              <motion.span
                key={tag.key}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + 0.05 * index, duration: 0.4 }}
                className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-[linear-gradient(160deg,rgba(255,255,255,0.16),rgba(255,255,255,0.04))] px-4 py-2 text-[13px] font-medium text-white/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_10px_24px_-14px_rgba(0,0,0,0.8)] backdrop-blur-xl"
              >
                <tag.icon weight="duotone" className="size-4 shrink-0 text-[#fdba74]" />
                {t(`tags.${tag.key}`)}
              </motion.span>
            ))}
          </div>
        </motion.div>
      </NightHeader>

      <div className="mx-auto w-full max-w-[1300px] px-4 sm:px-6 lg:px-8">
        <VisionMission />
        <Team />
        <Companies />
      </div>
    </div>
  );
}
