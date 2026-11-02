"use client";

import type { ReactNode } from "react";
import { ArrowDown, Cube, Sparkle } from "@phosphor-icons/react";
import { motion, useReducedMotion } from "motion/react";
import { useTranslations } from "next-intl";
import { EASE } from "@/components/home/ui";
import {
  PaperEyebrow,
  PaperPageHeader,
} from "@/components/paper/paper-page-header";
import { Cursor } from "@/components/paper/paper-hero";
import { CELL, Selected } from "@/components/paper/paper-sections";
import { ProductLogo, StatusPill } from "@/components/product/product-chapter";
import { products, type Product } from "@/constants/products";
import { INK, PRINT } from "@/lib/paper";
import { cn } from "@/lib/utils";

/*
 * The products page opens like a shared design file: the headline sits on
 * the sheet with the products' cursors drifting around it, and the products
 * wait below in a dock, each tile a jump link to its chapter.
 */

const shipped = products.filter((product) => product.status !== "upcoming");
/** Products still on the workbench (not in the list until they ship). */
const IN_THE_WORKS = 1;

const rise = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE } },
};

/** A collaborator's pointer with a name tag, drifting on a slow loop. */
function Collaborator({
  name,
  color,
  className,
  path,
  duration,
}: {
  name: string;
  color: string;
  className: string;
  path: { x: number[]; y: number[] };
  duration: number;
}) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.div
      aria-hidden
      className={cn("pointer-events-none absolute hidden lg:block", className)}
      initial={reduceMotion ? false : { opacity: 0, scale: 0.6 }}
      animate={
        reduceMotion
          ? undefined
          : { opacity: 1, scale: 1, x: path.x, y: path.y }
      }
      transition={{
        opacity: { duration: 0.4, delay: 0.6 },
        scale: { duration: 0.4, delay: 0.6 },
        x: { duration, repeat: Infinity, ease: "easeInOut" },
        y: { duration, repeat: Infinity, ease: "easeInOut" },
      }}
    >
      <Cursor color={color} className="size-6" />
      <span
        className="ml-4 -mt-1 inline-block whitespace-nowrap rounded-[4px] px-2 py-1 text-[12px] font-medium leading-none text-white shadow-[0_6px_14px_-8px_rgba(20,20,20,0.6)]"
        style={{ background: color }}
      >
        {name}
      </span>
    </motion.div>
  );
}

/** The word in the headline, stamped onto the sheet in print orange. */
function Stamp({ children }: { children: ReactNode }) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.span
      className="relative mx-[0.08em] inline-block px-[0.16em] text-white"
      style={{ background: PRINT }}
      initial={reduceMotion ? false : { scale: 1.35, rotate: -8, opacity: 0 }}
      animate={{ scale: 1, rotate: -2, opacity: 1 }}
      transition={{ type: "spring", stiffness: 320, damping: 18, delay: 0.55 }}
    >
      {children}
      {/* Selection handles, as if it was just placed in a design file */}
      {[
        "-left-[5px] -top-[5px]",
        "-right-[5px] -top-[5px]",
        "-bottom-[5px] -left-[5px]",
        "-bottom-[5px] -right-[5px]",
      ].map((corner) => (
        <span
          key={corner}
          aria-hidden
          className={cn(
            "absolute size-[9px] border-[1.5px] bg-[#f4efe7]",
            corner,
          )}
          style={{ borderColor: INK }}
        />
      ))}
      {/* Layer tag, drawn by CSS so it stays out of the heading's text */}
      <span
        aria-hidden
        className="absolute -bottom-[26px] -right-[5px] px-1.5 py-[3px] text-[11px] font-medium leading-none tracking-normal text-white after:content-['v1.0']"
        style={{ background: INK }}
      />
    </motion.span>
  );
}

/** One product in the dock: icon, name, status and a line, jumping down. */
function DockTile({ product, index }: { product: Product; index: number }) {
  const t = useTranslations("ProductPage.dock");
  return (
    <motion.a
      variants={rise}
      href={`#${product.slug}`}
      aria-label={t("jumpTo", { name: product.name })}
      className={cn("group relative flex items-center gap-4 p-4", CELL)}
    >
      <span className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100">
        <Selected
          label={`${String(index + 1).padStart(2, "0")} · ${product.name}`}
        />
      </span>
      <ProductLogo product={product} className="size-14 rounded-[14px]" />
      <span className="min-w-0 flex-1 text-left">
        <span className="flex flex-wrap items-center gap-2">
          <span className="text-[16px] font-semibold tracking-[-0.02em]">
            {product.name}
          </span>
          <StatusPill label={product.statusLabel} />
        </span>
        <span className="mt-1 block text-[13px] leading-snug text-[#141414]/60">
          {product.tagline}
        </span>
      </span>
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#141414]/[0.06] transition-colors duration-300 group-hover:bg-[#f97316] group-hover:text-white">
        <ArrowDown weight="bold" className="size-3.5" />
      </span>
    </motion.a>
  );
}

/** The empty slot at the end of the dock: the next product, still unprinted. */
function NextTile() {
  const t = useTranslations("ProductPage.dock");
  return (
    <motion.a
      variants={rise}
      href="#next"
      aria-label={t("jumpTo", { name: t("nextName") })}
      className="group relative flex items-center gap-4 rounded-[6px] border-[1.5px] border-dashed border-[#141414]/20 bg-white/30 p-4 transition-colors duration-300 hover:border-[#f97316]/60 hover:bg-white/50"
    >
      <span className="flex size-14 shrink-0 items-center justify-center rounded-[14px] border-[1.5px] border-dashed border-[#141414]/25">
        <Sparkle
          weight="duotone"
          className="size-6 transition-transform duration-500 group-hover:rotate-90"
          style={{ color: PRINT }}
        />
      </span>
      <span className="min-w-0 flex-1 text-left">
        <span className="block text-[16px] font-semibold tracking-[-0.02em] text-[#141414]/70">
          {t("nextName")}
        </span>
        <span className="mt-1 block text-[13px] leading-snug text-[#141414]/50">
          {t("nextTagline")}
        </span>
      </span>
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full border border-dashed border-[#141414]/25 transition-colors duration-300 group-hover:border-[#f97316] group-hover:text-[#c2410c]">
        <ArrowDown weight="bold" className="size-3.5" />
      </span>
    </motion.a>
  );
}

export default function ProductHero() {
  const t = useTranslations("ProductPage.hero");
  const reduceMotion = useReducedMotion();

  return (
    <PaperPageHeader className="pb-16 pt-32 md:pb-20 md:pt-40">
      <motion.div
        className="relative mx-auto flex max-w-[1240px] flex-col items-center px-4 text-center sm:px-6"
        initial={reduceMotion ? false : "hidden"}
        animate="visible"
        variants={{ visible: { transition: { staggerChildren: 0.08 } } }}
      >
        <Collaborator
          name="Raah"
          color="#0E63D1"
          className="left-[4%] top-[34%]"
          path={{ x: [0, 22, 8, 0], y: [0, -14, 10, 0] }}
          duration={11}
        />
        <Collaborator
          name="AssetSnip"
          color={INK}
          className="right-[5%] top-[50%]"
          path={{ x: [0, -18, -4, 0], y: [0, 12, -10, 0] }}
          duration={13}
        />
        <Collaborator
          name="Studio1"
          color={PRINT}
          className="right-[16%] top-[2%]"
          path={{ x: [0, 12, -10, 0], y: [0, 8, 4, 0] }}
          duration={9}
        />

        <motion.div variants={rise}>
          <PaperEyebrow icon={<Cube weight="duotone" className="size-4" />}>
            {t("eyebrow")}
            <span aria-hidden className="text-[#141414]/30">
              ·
            </span>
            <span className="text-[#141414]/60">
              {t("count", { shipped: shipped.length, building: IN_THE_WORKS })}
            </span>
          </PaperEyebrow>
        </motion.div>

        <motion.h1
          variants={rise}
          className="mt-8 text-[40px] font-medium leading-[1.08] tracking-[-0.055em] sm:text-[60px] lg:text-[76px] xl:text-[84px]"
        >
          <span className="block">
            <span className="bg-white px-[0.12em] [box-decoration-break:clone] [-webkit-box-decoration-break:clone]">
              {t("titleLineOne")}
            </span>
          </span>
          <span className="mt-[0.12em] block">
            {t.rich("titleLineTwo", {
              mark: (chunks) => <Stamp>{chunks}</Stamp>,
            })}
          </span>
        </motion.h1>

        <motion.p
          variants={rise}
          className="mt-10 max-w-[660px] text-balance text-[16px] leading-[1.65] text-[#141414]/[0.62] sm:text-[17px]"
        >
          {t("description")}
        </motion.p>

        <motion.div
          variants={{ visible: { transition: { staggerChildren: 0.08 } } }}
          className="mt-14 grid w-full max-w-[1100px] gap-2 md:grid-cols-3"
        >
          {shipped.map((product, index) => (
            <DockTile key={product.slug} product={product} index={index} />
          ))}
          <NextTile />
        </motion.div>
      </motion.div>
    </PaperPageHeader>
  );
}
