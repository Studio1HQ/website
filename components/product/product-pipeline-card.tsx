"use client";

import { Database } from "@phosphor-icons/react";
import { motion } from "motion/react";
import { cardVariants } from "@/lib/animations";
import { PRINT } from "@/lib/paper";
import { useTranslations } from "next-intl";

/** An empty slot engraved into the sheet: the next product, not yet printed. */
const pipelineCardSurface =
  "relative overflow-hidden rounded-[6px] bg-[#fbfaf7] p-6 shadow-[inset_0_3px_10px_rgba(20,20,20,0.10),inset_0_1px_2px_rgba(20,20,20,0.08),inset_0_-1px_0_#fff,0_1px_0_rgba(255,255,255,0.95)] sm:p-7";

export default function ProductPipelineCard() {
  const t = useTranslations("ProductPage.pipeline");

  return (
    <motion.article variants={cardVariants} className={pipelineCardSurface}>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 w-1/2 bg-[radial-gradient(ellipse_at_center,rgba(249,115,22,0.12),transparent_65%)]"
      />

      <div className="relative z-[1] flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-[6px] border-[1.5px] border-dashed border-[#141414]/25 bg-white/70">
            <Database
              className="size-6"
              weight="duotone"
              style={{ color: PRINT }}
            />
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-[12px] font-medium text-[#141414]/[0.62]">
              <span>{t("category")}</span>
              <span aria-hidden className="text-[#141414]/30">
                ·
              </span>
              <span className="inline-flex items-center px-1.5 py-[3px] text-[11px] font-medium leading-none text-[#141414] ring-1 ring-inset ring-[#141414]/30">
                {t("status")}
              </span>
            </div>

            <h2 className="mt-3 text-[24px] font-medium tracking-[-0.04em] text-[#141414]/[0.62] sm:text-[28px]">
              {t("title")}
            </h2>
          </div>
        </div>
      </div>
    </motion.article>
  );
}
