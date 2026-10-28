"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import { ArrowRight, ArrowUpRight } from "@phosphor-icons/react";
import { motion, useReducedMotion } from "motion/react";
import { useTranslations } from "next-intl";
import { products, type Product } from "@/constants/products";
import { PRINT } from "@/lib/paper";
import { cn } from "@/lib/utils";

/*
 * Products as cards in the style of the landing page's case studies: a paper
 * sheet with the product's own clip or screenshot engraved into it, the
 * story told in three beats, and the key features as engraved tiles.
 */

const MUTED = "text-[#141414]/[0.62]";

/** The phrase in each description that gets the hand-drawn underline. */
const MARK: Record<string, string> = {
  Raah: "analytics and observability",
  AssetSnip: "without digging through DevTools",
};

function MarkedText({ text, mark }: { text: string; mark?: string }) {
  const reduceMotion = useReducedMotion();
  const at = mark ? text.indexOf(mark) : -1;
  if (!mark || at < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, at)}
      <span className="relative inline">
        {mark}
        <svg
          aria-hidden
          viewBox="0 0 200 12"
          preserveAspectRatio="none"
          className="pointer-events-none absolute -bottom-1.5 left-0 h-[0.45em] w-full overflow-visible"
        >
          <motion.path
            d="M2 8 C 40 3, 90 3, 120 6 S 175 10, 198 4"
            fill="none"
            stroke={PRINT}
            strokeWidth="3"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
            initial={reduceMotion ? false : { pathLength: 0 }}
            whileInView={{ pathLength: 1 }}
            viewport={{ once: true, amount: 0.8 }}
            transition={{ duration: 0.9, ease: [0.65, 0, 0.35, 1], delay: 0.3 }}
          />
        </svg>
      </span>
      {text.slice(at + mark.length)}
    </>
  );
}

/** One beat of the story: an arrow badge, a title, then content. */
function Beat({
  title,
  last = false,
  className,
  children,
}: {
  title: string;
  last?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("py-3.5", className)}>
      <p className="flex items-center gap-2.5 text-[14px] font-semibold tracking-[-0.01em] text-[#141414]">
        <span
          aria-hidden
          className="flex size-5 shrink-0 items-center justify-center rounded-full"
          style={
            last
              ? { background: PRINT, color: "#fff" }
              : { background: "rgba(20,20,20,0.06)", color: PRINT }
          }
        >
          <ArrowRight weight="bold" className="size-3" />
        </span>
        {title}
      </p>
      <div className="mt-2.5 pl-[30px]">{children}</div>
    </div>
  );
}

/** The product's clip or screenshot, engraved into the card. */
function Media({ product }: { product: Product }) {
  const reduceMotion = useReducedMotion();
  const media = product.media;
  return (
    <div className="rounded-[6px] bg-[#ece5da] p-1.5 shadow-[inset_0_3px_8px_rgba(20,20,20,0.12),inset_0_1px_2px_rgba(20,20,20,0.10)]">
      <div className="relative aspect-[16/10] overflow-hidden rounded-[4px] bg-[#0d0b0a]">
        {media.kind === "video" && !reduceMotion ? (
          <video
            className="h-full w-full object-cover object-top"
            src={media.src}
            poster={media.poster}
            autoPlay
            loop
            muted
            playsInline
            aria-label={media.alt}
          />
        ) : (
          <Image
            src={media.kind === "video" ? media.poster : media.src}
            alt={media.alt}
            fill
            sizes="(min-width: 768px) 600px, 100vw"
            className="object-cover object-top"
          />
        )}
        {/* Light catching the glass across the top */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(160deg,rgba(255,255,255,0.16)_0%,transparent_30%)]"
        />
      </div>
    </div>
  );
}

function ProductCase({ product, index }: { product: Product; index: number }) {
  const t = useTranslations("ProductPage");
  const reduceMotion = useReducedMotion();
  // The problem is told by the opening of the long description.
  const problem = product.longDescription
    .split(/(?<=\.)\s+/)
    .slice(0, 2)
    .join(" ");
  const payoff = product.highlights[product.highlights.length - 1];

  return (
    <motion.article
      className="group relative isolate flex min-w-0 flex-col rounded-[6px] bg-white/80 p-6 shadow-[inset_0_1px_0_#fff,0_24px_50px_-36px_rgba(20,20,20,0.45)] ring-1 ring-inset ring-[#141414]/[0.08] transition-shadow duration-500 hover:shadow-[inset_0_1px_0_#fff,0_30px_60px_-34px_rgba(249,115,22,0.45)] md:p-9"
      initial={reduceMotion ? false : { opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{
        duration: 0.8,
        ease: [0.16, 1, 0.3, 1],
        delay: index * 0.1,
      }}
    >
      {/* Orange hairline along the top edge */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-8 top-0 h-px"
        style={{
          background: `linear-gradient(90deg, transparent, ${PRINT}, transparent)`,
        }}
      />

      {/* Product, status and number */}
      <div className="flex items-center gap-3">
        <span className="relative size-10 shrink-0 overflow-hidden rounded-[10px] shadow-[0_6px_14px_-8px_rgba(20,20,20,0.45)]">
          <Image
            src={product.logo}
            alt=""
            fill
            unoptimized
            className="object-cover"
          />
        </span>
        <span className="text-[15px] font-semibold tracking-[-0.01em]">
          {product.name}
        </span>
        <span className="rounded-full bg-[#f97316]/10 px-2.5 py-0.5 text-[11.5px] font-medium text-[#c2410c]">
          {product.statusLabel}
        </span>
        <span aria-hidden className="h-px flex-1 bg-[#141414]/12" />
        <span className="text-[28px] font-medium leading-none tabular-nums tracking-[-0.05em] text-[#141414]/30 md:text-[34px]">
          {String(index + 1).padStart(2, "0")}
        </span>
      </div>

      <div className="mt-6">
        <Media product={product} />
      </div>

      <h2 className="mt-7 text-[24px] font-medium leading-[1.2] tracking-[-0.035em] md:text-[28px]">
        {product.tagline}
      </h2>
      <p className={cn("mt-3 text-[15px] leading-[1.6]", MUTED)}>
        <MarkedText text={product.description} mark={MARK[product.name]} />
      </p>

      <Beat title="The problem" className="mt-6">
        <p className={cn("text-[14.5px] leading-[1.65]", MUTED)}>{problem}</p>
      </Beat>

      <Beat title="What it does">
        <ul role="list" className="flex flex-wrap gap-2">
          {product.features.map((feature) => (
            <li
              key={feature.label}
              className="inline-flex items-center gap-2 rounded-[6px] bg-[#141414]/[0.045] px-2.5 py-1 text-[12.5px] font-medium text-[#141414]/80"
            >
              <span
                aria-hidden
                className="size-1.5 rounded-full"
                style={{ background: PRINT }}
              />
              {feature.label}
            </li>
          ))}
        </ul>
      </Beat>

      <Beat title="What you get" last>
        <p className="text-[15px] font-medium leading-[1.6] text-[#141414]">
          {payoff}.
        </p>
      </Beat>

      {/* Key features, engraved into the card */}
      <dl className="mt-5 grid grid-cols-1 gap-2.5 min-[480px]:grid-cols-3">
        {product.features.slice(0, 3).map((feature, position) => {
          const FeatureIcon = feature.icon;
          return (
            <div
              key={feature.label}
              className="min-w-0 rounded-[6px] bg-[#ece5da] p-3.5 shadow-[inset_0_3px_8px_rgba(20,20,20,0.12),inset_0_1px_2px_rgba(20,20,20,0.10)]"
            >
              <FeatureIcon
                aria-hidden
                weight="duotone"
                className="size-4"
                style={{ color: PRINT }}
              />
              <dt
                className="mt-2.5 text-[14px] font-medium leading-snug tracking-[-0.02em]"
                style={position === 0 ? { color: PRINT } : undefined}
              >
                {feature.label}
              </dt>
              <dd
                className={cn(
                  "mt-1.5 line-clamp-3 text-[11.5px] leading-snug",
                  MUTED,
                )}
              >
                {feature.detail}
              </dd>
            </div>
          );
        })}
      </dl>

      {/* Footer */}
      <div className="mt-auto flex items-center justify-between gap-4 border-t border-[#141414]/[0.08] pt-5 [margin-top:max(1.5rem,auto)]">
        <p className="min-w-0 flex-1 truncate text-[12px] text-[#141414]/40">
          {product.category} · {product.statusLabel}
        </p>
        <a
          href={product.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex shrink-0 items-center gap-2 text-[14px] font-medium transition-colors hover:text-[#f97316]"
        >
          {t("visitProduct", { name: product.name })}
          <span
            className="flex size-7 items-center justify-center rounded-full text-white transition-transform duration-300 group-hover:rotate-45"
            style={{ background: PRINT }}
          >
            <ArrowUpRight weight="bold" className="size-3.5" />
          </span>
        </a>
      </div>
    </motion.article>
  );
}

export default function ProductShowcase() {
  const shipped = products.filter((product) => product.status !== "upcoming");
  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
      {shipped.map((product, index) => (
        <ProductCase key={product.name} product={product} index={index} />
      ))}
    </div>
  );
}
