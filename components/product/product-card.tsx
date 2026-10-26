"use client";

import { ArrowUpRight } from "@phosphor-icons/react";
import ProductMedia from "@/components/product/product-media";
import type { ProductMedia as ProductMediaType } from "@/constants/products";
import { motion } from "motion/react";
import { cardVariants } from "@/lib/animations";
import { INK, PRINT } from "@/lib/paper";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

export type ProductCardData = {
  name: string;
  tagline: string;
  description: string;
  highlights: string[];
  url: string;
  category: string;
  statusLabel: string;
  media: ProductMediaType;
};

/** Paper card: white sheet, hairline ring, an orange hairline on top. */
const productCardSurface =
  "group relative isolate overflow-hidden rounded-[24px] bg-white/80 p-3 shadow-[inset_0_1px_0_#fff,0_24px_50px_-36px_rgba(20,20,20,0.45)] ring-1 ring-inset ring-[#141414]/[0.08] transition-shadow duration-500 hover:shadow-[inset_0_1px_0_#fff,0_30px_60px_-34px_rgba(249,115,22,0.45)] sm:p-4 lg:p-5";

export default function ProductCard({
  product,
  index = 0,
  reverse = false,
}: {
  product: ProductCardData;
  index?: number;
  reverse?: boolean;
}) {
  const t = useTranslations("ProductPage");

  return (
    <motion.article variants={cardVariants} className={productCardSurface}>
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-8 top-0 h-px"
        style={{
          background: `linear-gradient(90deg, transparent, ${PRINT}, transparent)`,
        }}
      />
      <div className="grid min-w-0 gap-6 lg:grid-cols-2 lg:items-center lg:gap-10 xl:gap-12">
        <ProductMedia
          media={product.media}
          className={cn(
            "order-1 w-full",
            reverse ? "lg:order-2" : "lg:order-1",
          )}
        />

        <div
          className={cn(
            "order-2 flex min-w-0 flex-col p-3 sm:p-4 lg:p-6",
            reverse ? "lg:order-1" : "lg:order-2",
          )}
        >
          <div className="flex items-center gap-3">
            <div className="flex min-w-0 flex-wrap items-center gap-2 text-[12px] font-medium text-[#141414]/[0.62]">
              <span>{product.category}</span>
              <span aria-hidden className="text-[#141414]/30">
                ·
              </span>
              <span
                className="inline-flex items-center gap-1.5 px-1.5 py-[3px] text-[11px] font-medium leading-none text-white"
                style={{ background: PRINT }}
              >
                <span aria-hidden className="size-1.5 rounded-full bg-white" />
                {product.statusLabel}
              </span>
            </div>
            <span aria-hidden className="h-px flex-1 bg-[#141414]/[0.12]" />
            <span
              aria-hidden
              className="text-[28px] font-medium leading-none tracking-[-0.05em] tabular-nums text-[#141414]/20 md:text-[34px]"
            >
              {String(index + 1).padStart(2, "0")}
            </span>
          </div>

          <h2 className="mt-5 text-[28px] font-medium tracking-[-0.045em] text-[#141414] lg:text-[40px]">
            {product.name}
          </h2>

          {product.tagline ? (
            <p className="mt-1 text-[16px] font-medium leading-snug tracking-[-0.01em] text-[#c2410c]">
              {product.tagline}
            </p>
          ) : null}

          <p className="mt-4 text-[15px] leading-[1.6] text-[#141414]/[0.62] sm:text-[16px]">
            {product.description}
          </p>

          {product.highlights.length > 0 ? (
            <ul className="mt-5 space-y-2.5 border-t border-[#141414]/[0.12] pt-5 text-[14px] leading-relaxed text-[#141414]">
              {product.highlights.map((highlight) => (
                <li key={highlight} className="flex gap-2.5">
                  <span
                    aria-hidden
                    className="mt-[0.55em] size-1.5 shrink-0 rounded-full"
                    style={{ background: PRINT }}
                  />
                  <span>{highlight}</span>
                </li>
              ))}
            </ul>
          ) : null}

          <div className="mt-7">
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
          </div>
        </div>
      </div>
    </motion.article>
  );
}
