"use client";

import Image, { type StaticImageData } from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getCompanyByName,
  getDomainFromUrl,
  type CompanyInfo,
} from "@/lib/company-lookup";
import { elevatedCardShadow } from "@/lib/shadows";

export type TrustedByLogoItem = {
  name: string;
  image: StaticImageData | string;
  isWhite?: boolean;
  showNameBeside?: boolean;
  className?: string;
  alt?: string;
  href?: string;
  description?: string;
  designation?: string;
};

type CompanyMarqueeItemProps = {
  item: TrustedByLogoItem;
  imageSizes?: string;
};

function resolveCompany(item: TrustedByLogoItem): CompanyInfo | undefined {
  if (item.href) {
    return {
      id: -1,
      name: item.name,
      designation: item.designation ?? "",
      image: item.image,
      href: item.href,
      description: item.description ?? "",
    } as CompanyInfo;
  }

  return getCompanyByName(item.name);
}

function usePrefersHover() {
  const [prefersHover, setPrefersHover] = useState(true);

  useEffect(() => {
    const media = window.matchMedia("(hover: hover) and (pointer: fine)");
    const update = () => setPrefersHover(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  return prefersHover;
}

function CompanyPreviewCard({
  company,
  logo,
  logoClassName,
}: {
  company: CompanyInfo;
  logo: StaticImageData | string;
  logoClassName?: string;
}) {
  const domain = getDomainFromUrl(company.href);

  return (
    <div
      className={cn(
        "w-[min(92vw,22rem)] overflow-hidden rounded-[6px] border border-border/80 bg-card/95 text-card-foreground",
        elevatedCardShadow,
      )}
    >
      <div className="flex items-center gap-2 border-b border-border/60 bg-muted/40 px-3 py-2">
        <span className="size-2.5 rounded-full bg-red-400/90" aria-hidden />
        <span className="size-2.5 rounded-full bg-amber-400/90" aria-hidden />
        <span className="size-2.5 rounded-full bg-emerald-400/90" aria-hidden />
        <span className="ml-1 truncate text-xs text-muted-foreground">
          {domain}
        </span>
      </div>

      <div className="relative flex h-36 items-center justify-center overflow-hidden bg-gradient-to-br from-primary/10 via-background to-primary1/10 p-6">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, hsl(var(--primary) / 0.18), transparent 45%), radial-gradient(circle at 80% 80%, hsl(var(--primary1) / 0.16), transparent 40%)",
          }}
        />
        <Image
          src={logo}
          alt=""
          width={160}
          height={64}
          className={cn(
            "relative z-10 h-auto max-h-16 w-auto max-w-[min(70vw,12rem)] object-contain",
            logoClassName,
          )}
        />
      </div>

      <div className="space-y-2.5 p-4">
        <div>
          <p className="text-base font-semibold tracking-tight">
            {company.name}
          </p>
          {company.designation ? (
            <p className="text-sm text-muted-foreground">
              {company.designation}
            </p>
          ) : null}
        </div>
        {company.description ? (
          <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
            {company.description}
          </p>
        ) : null}
        <Link
          href={company.href}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary transition-colors hover:text-primary/80"
        >
          Visit website
          <ArrowUpRight className="size-3.5" aria-hidden />
        </Link>
      </div>
    </div>
  );
}

export function CompanyMarqueeItem({
  item,
  imageSizes = "160px",
}: CompanyMarqueeItemProps) {
  const company = resolveCompany(item);
  const tooltipId = useId();
  const itemRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [mounted, setMounted] = useState(false);
  const prefersHover = usePrefersHover();

  useEffect(() => {
    setMounted(true);
  }, []);

  const updatePosition = useCallback(() => {
    const node = itemRef.current;
    if (!node) return;

    const rect = node.getBoundingClientRect();
    setPosition({
      top: rect.top,
      left: rect.left + rect.width / 2,
    });
  }, []);

  const openPreview = useCallback(() => {
    if (!company) return;
    updatePosition();
    setIsOpen(true);
  }, [company, updatePosition]);

  const closePreview = useCallback(() => {
    setIsOpen(false);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const handleReposition = () => updatePosition();
    window.addEventListener("scroll", handleReposition, true);
    window.addEventListener("resize", handleReposition);

    return () => {
      window.removeEventListener("scroll", handleReposition, true);
      window.removeEventListener("resize", handleReposition);
    };
  }, [isOpen, updatePosition]);

  useEffect(() => {
    if (!isOpen || prefersHover) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (
        itemRef.current?.contains(target) ||
        previewRef.current?.contains(target)
      ) {
        return;
      }
      closePreview();
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [closePreview, isOpen, prefersHover]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closePreview();
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [closePreview, isOpen]);

  const imageClassName = cn(
    item.isWhite
      ? "grayscale invert dark:invert-0"
      : "invert-0 grayscale dark:invert",
    "opacity-80 object-contain",
    item.showNameBeside && item.className,
    !item.showNameBeside && [
      "opacity-70 mx-10 w-auto object-contain",
      item.alt === "Eachlabs" && "h-14 aspect-square",
      item.alt === "Memori" && "h-20 w-auto aspect-square",
      item.alt === "LiteLLM" &&
        "h-20 sm:h-24 md:h-24 w-auto max-w-[min(100vw-2rem,400px)] sm:max-w-[440px]",
      item.alt === "InsForge" &&
        "h-8 sm:h-10 md:h-11 w-auto max-w-[200px] sm:max-w-[260px] md:max-w-[280px] object-contain",
      item.alt !== "Eachlabs" &&
        item.alt !== "Memori" &&
        item.alt !== "LiteLLM" &&
        item.alt !== "InsForge" &&
        "h-24 w-fit aspect-square",
      item.className,
    ],
  );

  const previewLogoClassName = cn(
    item.isWhite ? "dark:brightness-200" : undefined,
    item.className,
  );

  const handlePointerEnter = () => {
    if (prefersHover) openPreview();
  };

  const handlePointerLeave = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!prefersHover) return;

    const related = event.relatedTarget as Node | null;
    if (previewRef.current?.contains(related)) return;
    closePreview();
  };

  const handlePreviewPointerLeave = (
    event: React.PointerEvent<HTMLDivElement>,
  ) => {
    if (!prefersHover) return;

    const related = event.relatedTarget as Node | null;
    if (itemRef.current?.contains(related)) return;
    closePreview();
  };

  const handleClick = () => {
    if (prefersHover || !company) return;
    setIsOpen((open) => !open);
    if (!isOpen) updatePosition();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (isOpen) closePreview();
      else openPreview();
    }
  };

  return (
    <>
      <div
        ref={itemRef}
        data-active={isOpen ? "" : undefined}
        className={cn(
          "marquee-item relative flex items-center justify-center outline-none",
          item.showNameBeside && "gap-3 mx-8",
          company && "cursor-pointer",
        )}
        role={company ? "button" : undefined}
        tabIndex={company ? 0 : undefined}
        aria-expanded={company ? isOpen : undefined}
        aria-describedby={isOpen ? tooltipId : undefined}
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
        onFocus={openPreview}
        onBlur={(event) => {
          const related = event.relatedTarget as Node | null;
          if (previewRef.current?.contains(related)) return;
          closePreview();
        }}
        onKeyDown={handleKeyDown}
        onClick={handleClick}
      >
        {item.showNameBeside ? (
          <>
            <Image
              src={item.image}
              className={imageClassName}
              alt=""
              width={56}
              height={56}
              sizes={imageSizes}
            />
            <span className="whitespace-nowrap text-base font-medium tracking-tight opacity-90 sm:text-lg">
              {item.name}
            </span>
          </>
        ) : (
          <Image
            src={item.image}
            className={imageClassName}
            alt={item.name}
            width={1000}
            height={1000}
            sizes={imageSizes}
            style={{ width: "auto" }}
          />
        )}
      </div>

      {mounted && company
        ? createPortal(
            <AnimatePresence>
              {isOpen ? (
                <motion.div
                  ref={previewRef}
                  id={tooltipId}
                  role="tooltip"
                  initial={{ opacity: 0, y: 8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.96 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                  className="pointer-events-auto fixed z-[80] -translate-x-1/2 -translate-y-[calc(100%+0.75rem)] after:absolute after:inset-x-0 after:top-full after:h-3 after:content-['']"
                  style={{ top: position.top, left: position.left }}
                  onPointerEnter={prefersHover ? openPreview : undefined}
                  onPointerLeave={handlePreviewPointerLeave}
                >
                  <CompanyPreviewCard
                    company={company}
                    logo={item.image}
                    logoClassName={previewLogoClassName}
                  />
                </motion.div>
              ) : null}
            </AnimatePresence>,
            document.body,
          )
        : null}
    </>
  );
}
