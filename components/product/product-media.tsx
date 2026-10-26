"use client";

import Image from "next/image";
import { useReducedMotion } from "motion/react";
import type { ProductMedia as ProductMediaType } from "@/constants/products";
import { cn } from "@/lib/utils";

/** Recessed paper frame the screenshot or video sits in. */
const mediaFrameClassName = cn(
  "relative w-full min-w-0 overflow-hidden rounded-[6px] bg-[#fbfaf7] ring-1 ring-inset ring-[#141414]/[0.06]",
  "shadow-[inset_0_3px_10px_rgba(20,20,20,0.10),inset_0_1px_2px_rgba(20,20,20,0.08),inset_0_-1px_0_#fff,0_1px_0_rgba(255,255,255,0.95)]",
  "aspect-video sm:aspect-[16/9] lg:aspect-[16/10]",
);

type ProductMediaProps = {
  media: ProductMediaType;
  className?: string;
};

export default function ProductMedia({ media, className }: ProductMediaProps) {
  const prefersReducedMotion = useReducedMotion();
  const isGif = media.kind === "image" && media.src.endsWith(".gif");
  const showVideo = media.kind === "video" && !prefersReducedMotion;

  return (
    <div className={cn(mediaFrameClassName, className)}>
      {showVideo ? (
        <video
          className="h-full w-full object-contain object-center lg:object-cover lg:object-top"
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
          unoptimized={isGif}
          className="object-contain object-center lg:object-cover lg:object-top"
          sizes="(max-width: 1024px) 100vw, 50vw"
        />
      )}
    </div>
  );
}
