"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Image from "next/image";
import { ArrowUpRight, Check, Copy, LockSimple } from "@phosphor-icons/react";
import { useReducedMotion } from "motion/react";
import { useTranslations } from "next-intl";
import { Container } from "@/components/home/ui";
import {
  Accent,
  IndexBar,
  MUTED,
  PaperSection,
} from "@/components/paper/paper-sections";
import type { Product } from "@/constants/products";
import { INK, PRINT } from "@/lib/paper";
import { cn } from "@/lib/utils";

/*
 * One chapter per product: the index line, the product's own headline on a
 * white highlight block, its clip or screenshot inside a browser window, a
 * product-specific panel beside it and a row of features underneath.
 */

/** Orange status pill with a beating dot: the product is out in the world. */
export function StatusPill({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#f97316]/10 px-2.5 py-0.5 text-[11.5px] font-medium text-[#c2410c]">
      <span aria-hidden className="relative flex size-1.5">
        <span
          className="absolute inset-0 animate-ping rounded-full opacity-60 motion-reduce:hidden"
          style={{ background: PRINT }}
        />
        <span
          className="relative size-1.5 rounded-full"
          style={{ background: PRINT }}
        />
      </span>
      {label}
    </span>
  );
}

/** The product's app icon, on a small lifted tile. */
export function ProductLogo({
  product,
  className,
}: {
  product: Product;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "relative shrink-0 overflow-hidden rounded-[12px] shadow-[0_10px_20px_-12px_rgba(20,20,20,0.55)]",
        className,
      )}
    >
      <Image
        src={product.logo}
        alt=""
        fill
        unoptimized
        className="object-cover"
      />
    </span>
  );
}

/** Ink pill out to the product, with the orange arrow that turns on hover. */
export function VisitLink({ product }: { product: Product }) {
  const t = useTranslations("ProductPage");
  return (
    <a
      href={product.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group/cta inline-flex h-12 items-center gap-3 whitespace-nowrap rounded-full py-1.5 pl-6 pr-1.5 text-[15px] font-medium text-[#f4efe7] transition-transform duration-300 hover:-translate-y-0.5 motion-reduce:transform-none"
      style={{ background: INK }}
    >
      {t("visitProduct", { name: product.name })}
      <span
        className="flex size-9 items-center justify-center rounded-full text-white transition-transform duration-300 group-hover/cta:rotate-45"
        style={{ background: PRINT }}
      >
        <ArrowUpRight weight="bold" className="size-4" />
      </span>
    </a>
  );
}

/** Copies `text`, then reads "Copied" for a moment. */
export function CopyButton({
  text,
  tone = "night",
  className,
}: {
  text: string;
  tone?: "night" | "paper";
  className?: string;
}) {
  const t = useTranslations("ProductPage");
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      return;
    }
    setCopied(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 1600);
  };

  return (
    <button
      type="button"
      onClick={copy}
      className={cn(
        "inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-[12px] font-medium transition-colors",
        tone === "night"
          ? "bg-white/[0.08] text-[#f4efe7]/80 hover:bg-white/[0.14] hover:text-[#f4efe7]"
          : "bg-[#141414]/[0.06] text-[#141414]/70 hover:bg-[#141414]/10 hover:text-[#141414]",
        className,
      )}
    >
      {copied ? (
        <Check weight="bold" className="size-3.5" style={{ color: PRINT }} />
      ) : (
        <Copy className="size-3.5" />
      )}
      <span aria-live="polite">{copied ? t("copied") : t("copy")}</span>
    </button>
  );
}

/**
 * The product's clip or screenshot inside a browser window. On wide screens
 * the viewport stretches to match the panel beside it.
 */
export function BrowserFrame({ product }: { product: Product }) {
  const reduceMotion = useReducedMotion();
  const media = product.media;
  return (
    <div className="flex min-w-0 flex-col rounded-[8px] bg-white/80 p-1.5 shadow-[inset_0_1px_0_#fff,0_40px_80px_-48px_rgba(20,20,20,0.5)] ring-1 ring-inset ring-[#141414]/10">
      <div className="flex h-9 items-center gap-3 px-2.5">
        <span aria-hidden className="flex gap-1.5">
          {["#ff5f57", "#febc2e", "#28c840"].map((dot) => (
            <span
              key={dot}
              className="size-2.5 rounded-full opacity-80"
              style={{ background: dot }}
            />
          ))}
        </span>
        <span className="mx-auto flex h-6 min-w-0 max-w-[280px] flex-1 items-center justify-center gap-1.5 rounded-full bg-[#141414]/[0.05] px-3 text-[12px] text-[#141414]/55">
          <LockSimple aria-hidden weight="bold" className="size-3 shrink-0" />
          <span className="truncate">{product.domain}</span>
        </span>
        <span aria-hidden className="w-[46px]" />
      </div>
      <div
        className={cn(
          "relative overflow-hidden rounded-[5px] bg-[#0d0b0a] lg:aspect-auto lg:min-h-[400px] lg:flex-1",
          media.kind === "video" ? "aspect-video" : "aspect-[16/10]",
        )}
      >
        {media.kind === "video" && !reduceMotion ? (
          <video
            className="absolute inset-0 h-full w-full object-cover object-top"
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
            sizes="(min-width: 1024px) 760px, 100vw"
            className="object-cover object-top"
          />
        )}
        {/* Light catching the glass across the top */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(160deg,rgba(255,255,255,0.14)_0%,transparent_32%)]"
        />
      </div>
    </div>
  );
}

/** A feature as a white tile: icon in an engraved well, label, one line. */
export function FeatureTile({
  feature,
  children,
}: {
  feature: Product["features"][number];
  /** Optional visual, set in an engraved well above the text. */
  children?: ReactNode;
}) {
  const FeatureIcon = feature.icon;
  return (
    <article className="flex min-w-0 flex-col rounded-[6px] bg-white/80 p-4 ring-1 ring-inset ring-[#141414]/10 sm:p-5">
      <div className="flex items-center gap-2.5">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-[6px] bg-[#f6f1e9] shadow-[inset_0_2px_5px_rgba(20,20,20,0.10),inset_0_1px_1px_rgba(20,20,20,0.08)]">
          <FeatureIcon
            aria-hidden
            weight="duotone"
            className="size-4"
            style={{ color: PRINT }}
          />
        </span>
        <h3 className="text-[15px] font-medium tracking-[-0.02em]">
          {feature.label}
        </h3>
      </div>
      {children ? (
        <div className="mt-4 flex-1 rounded-[6px] bg-[#fbfaf7] p-4 shadow-[inset_0_3px_10px_rgba(20,20,20,0.10),inset_0_1px_2px_rgba(20,20,20,0.08)]">
          {children}
        </div>
      ) : null}
      <p className={cn("mt-4 text-[13.5px] leading-[1.55]", MUTED)}>
        {feature.detail}
      </p>
    </article>
  );
}

export default function ProductChapter({
  product,
  index,
  reverse = false,
  aside,
  children,
}: {
  product: Product;
  index: number;
  /** Put the browser window on the right. */
  reverse?: boolean;
  /** Product-specific panel beside the browser window. */
  aside: ReactNode;
  /** Row underneath, usually the features. */
  children?: ReactNode;
}) {
  return (
    <PaperSection id={product.slug} tone="paper" className="scroll-mt-24">
      <Container>
        <IndexBar
          index={index}
          name={product.name}
          aside={`${product.category} · ${product.statusLabel}`}
        />

        <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)] lg:items-end lg:gap-16">
          <div>
            <div className="flex items-center gap-3">
              <ProductLogo product={product} className="size-11" />
              <span className="text-[17px] font-semibold tracking-[-0.02em]">
                {product.name}
              </span>
              <StatusPill label={product.statusLabel} />
            </div>
            <h2 className="mt-6 max-w-[780px] text-[32px] font-medium leading-[1.14] tracking-[-0.045em] sm:text-[42px] lg:text-[50px]">
              <span className="bg-[var(--p-card)] px-[0.14em] [box-decoration-break:clone] [-webkit-box-decoration-break:clone]">
                {product.headline.lead}{" "}
                <Accent>{product.headline.accent}</Accent>
              </span>
            </h2>
          </div>
          <div className="flex flex-col items-start gap-6 lg:pb-2">
            <p
              className={cn("max-w-[460px] text-[16px] leading-[1.65]", MUTED)}
            >
              {product.description}
            </p>
            <VisitLink product={product} />
          </div>
        </div>

        <div
          className={cn(
            "mt-10 grid gap-2 lg:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]",
            reverse &&
              "lg:grid-cols-[minmax(0,1fr)_minmax(0,1.45fr)] lg:[&>*:first-child]:order-2",
          )}
        >
          <BrowserFrame product={product} />
          {aside}
        </div>

        {children ? <div className="mt-2">{children}</div> : null}
      </Container>
    </PaperSection>
  );
}
