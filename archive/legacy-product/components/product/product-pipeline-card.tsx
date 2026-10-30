"use client";

import { Database } from "@phosphor-icons/react";
import { motion } from "motion/react";
import { cardVariants } from "@/lib/animations";
import { useTranslations } from "next-intl";

const pipelineCardSurface =
  "s1-glass-card relative overflow-hidden rounded-[24px] p-6 sm:p-7";

export default function ProductPipelineCard() {
  const t = useTranslations("ProductPage.pipeline");

  return (
    <motion.article variants={cardVariants} className={pipelineCardSurface}>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 w-1/2 bg-[radial-gradient(ellipse_at_center,hsl(var(--primary)/0.16),transparent_65%)]"
      />

      <div className="relative z-[1] flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <div className="s1-glass-dark flex size-12 shrink-0 items-center justify-center rounded-2xl text-white">
            <Database className="size-6" weight="duotone" />
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-[12px] font-medium text-[var(--home-ink-soft)]">
              <span>{t("category")}</span>
              <span aria-hidden>·</span>
              <span className="inline-flex items-center rounded-full border border-[var(--home-line)] bg-white/80 px-2.5 py-0.5 text-[12px] font-medium text-[var(--home-ink)] shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_6px_14px_-8px_rgba(90,30,0,0.4)] backdrop-blur-md dark:bg-white/[0.08] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.14)]">
                {t("status")}
              </span>
            </div>

            <h2 className="mt-3 text-[24px] font-medium tracking-[-0.035em] text-[var(--home-ink)] sm:text-[28px]">
              {t("title")}
            </h2>
          </div>
        </div>
      </div>
    </motion.article>
  );
}
