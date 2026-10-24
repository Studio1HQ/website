"use client";

import { Cube } from "@phosphor-icons/react";
import { motion } from "motion/react";
import { containerVariants, headerVariants } from "@/lib/animations";
import { NightEyebrow, NightHeader } from "@/components/shared/night-header";
import { useTranslations } from "next-intl";

export default function ProductHero() {
  const t = useTranslations("ProductPage.hero");

  return (
    <NightHeader className="pb-28 pt-40 md:pb-36 md:pt-48">
      <motion.div
        className="mx-auto flex max-w-[1100px] flex-col items-center px-4 text-center sm:px-6"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        <motion.div variants={headerVariants}>
          <NightEyebrow icon={<Cube weight="duotone" className="size-4 text-[#fdba74]" />}>
            {t("badge")} Studio1
          </NightEyebrow>
        </motion.div>

        <motion.h1
          variants={headerVariants}
          className="mt-7 text-[40px] font-medium leading-[1.04] tracking-[-0.05em] sm:text-[60px] lg:text-[76px]"
        >
          {t("titlePrefix")} <span className="s1-accent-text">{t("titleHighlight")}</span>
        </motion.h1>

        <motion.p
          variants={headerVariants}
          className="mt-6 max-w-[640px] text-balance text-[16px] leading-[1.6] text-white/60 sm:text-[18px]"
        >
          {t("description")}
        </motion.p>
      </motion.div>
    </NightHeader>
  );
}
