"use client";

import { PillLink } from "@/components/home/ui";
import ProductMedia from "@/components/product/product-media";
import type { ProductMedia as ProductMediaType } from "@/constants/products";
import { motion } from "motion/react";
import { cardVariants } from "@/lib/animations";
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

const productCardSurface =
  "s1-glass-card s1-glass-raised relative overflow-hidden rounded-[24px] p-3 sm:p-4 lg:p-5";

export default function ProductCard({
  product,
  reverse = false,
}: {
  product: ProductCardData;
  reverse?: boolean;
}) {
  const t = useTranslations("ProductPage");

  return (
    <motion.article variants={cardVariants} className={productCardSurface}>
      <div
        className={cn(
          "grid min-w-0 gap-6 lg:grid-cols-2 lg:items-center lg:gap-10 xl:gap-12",
        )}
      >
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
          <div className="flex flex-wrap items-center gap-2 text-[12px] font-medium text-[var(--home-ink-soft)]">
            <span>{product.category}</span>
            <span aria-hidden>·</span>
            <span className="inline-flex items-center rounded-full border border-[var(--home-line)] bg-white/80 px-2.5 py-0.5 text-[12px] font-medium text-[var(--home-ink)] shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_6px_14px_-8px_rgba(90,30,0,0.4)] backdrop-blur-md dark:bg-white/[0.08] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.14)]">
              {product.statusLabel}
            </span>
          </div>

          <h2 className="mt-4 text-[28px] font-medium tracking-[-0.04em] text-[var(--home-ink)] lg:text-[36px]">
            {product.name}
          </h2>

          {product.tagline ? (
            <p className="mt-1 text-[16px] leading-snug text-primary">
              {product.tagline}
            </p>
          ) : null}

          <p className="mt-4 text-[15px] leading-[1.6] text-[var(--home-ink-soft)] sm:text-[16px]">
            {product.description}
          </p>

          {product.highlights.length > 0 ? (
            <ul className="mt-5 space-y-2 border-t border-[var(--home-line)] pt-5 text-[14px] leading-relaxed text-[var(--home-ink)]">
              {product.highlights.map((highlight) => (
                <li key={highlight} className="flex gap-2.5">
                  <span
                    aria-hidden
                    className="mt-[0.5em] size-1.5 shrink-0 rounded-full bg-primary"
                  />
                  <span>{highlight}</span>
                </li>
              ))}
            </ul>
          ) : null}

          <div className="mt-7">
            <PillLink href={product.url} tone="brand" external>
              {t("visitProduct", { name: product.name })}
            </PillLink>
          </div>
        </div>
      </div>
    </motion.article>
  );
}
