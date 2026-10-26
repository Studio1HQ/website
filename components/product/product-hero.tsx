"use client";

import { Cube } from "@phosphor-icons/react";
import { motion, useReducedMotion } from "motion/react";
import { containerVariants, headerVariants } from "@/lib/animations";
import {
  PaperEyebrow,
  PaperPageHeader,
} from "@/components/paper/paper-page-header";
import { Accent } from "@/components/paper/paper-sections";
import { useTranslations } from "next-intl";

export default function ProductHero() {
  const t = useTranslations("ProductPage.hero");
  const reduceMotion = useReducedMotion();

  return (
    <PaperPageHeader className="pb-10 pt-36 md:pb-14 md:pt-44">
      <motion.div
        className="mx-auto flex max-w-[1100px] flex-col items-center px-4 text-center sm:px-6"
        initial={reduceMotion ? false : "hidden"}
        animate="visible"
        variants={containerVariants}
      >
        <motion.div variants={headerVariants}>
          <PaperEyebrow icon={<Cube weight="duotone" className="size-4" />}>
            {t("badge")} Studio1
          </PaperEyebrow>
        </motion.div>

        <motion.h1
          variants={headerVariants}
          className="mt-7 text-[40px] font-medium leading-[1.04] tracking-[-0.055em] sm:text-[60px] lg:text-[76px]"
        >
          {t("titlePrefix")} <Accent>{t("titleHighlight")}</Accent>
        </motion.h1>

        <motion.p
          variants={headerVariants}
          className="mt-6 max-w-[640px] text-balance text-[16px] leading-[1.6] text-[#141414]/[0.62] sm:text-[17px]"
        >
          {t("description")}
        </motion.p>
      </motion.div>
    </PaperPageHeader>
  );
}
