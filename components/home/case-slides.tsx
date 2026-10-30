"use client";

import { useRef, useState, type PointerEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "@phosphor-icons/react";
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "motion/react";
import { cn } from "@/lib/utils";
import { Container, Rise } from "./ui";

type Slide = {
  client: string;
  href: string;
  image: string;
  /** Screenshots become a soft, dimmed backdrop so their own text doesn't compete. */
  kind: "photo" | "screen";
  position?: string;
  tags: string[];
  summary: string;
};

/** Full-screen case study slides; each sticks and the next one stacks over it. */
const SLIDES: Slide[] = [
  {
    client: "Nebius",
    href: "/case-studies/nebius",
    image: "/case-studies/nebius/workshop-dublin-recap.webp",
    kind: "photo",
    position: "center 82%",
    tags: [
      "Workshops & Live Events",
      "Framework Integrations",
      "Launch Support",
    ],
    summary:
      "300+ deliverables, 29 framework integrations, an open-source library with 16K+ stars, and launch support across every major Token Factory moment.",
  },
  {
    client: "Jozu",
    href: "/case-studies/jozu",
    image: "/case-studies/jozu/kubecon-jozu-booth.webp",
    kind: "photo",
    tags: ["Developer Advocacy", "Event Representation", "Community Support"],
    summary:
      "Developer advocacy, KitOps community support, event representation, blogs, technical talks, and ecosystem collaboration for Jozu and its open-source ecosystem.",
  },
  {
    client: "Memori",
    href: "/case-studies/memori",
    image: "/case-studies/memori/memori-launch-reddit-redacted.png",
    kind: "screen",
    tags: ["Community-led Launches", "Demo Content", "Live Events"],
    summary:
      "Community-led launch support, hands-on demo agents, and developer feedback helped an early OSS project grow to 12,000+ GitHub stars.",
  },
  {
    client: "Bright Data",
    href: "/case-studies/brightdata",
    image: "/case-studies/brightdata/brightdata-homepage.webp",
    kind: "screen",
    tags: [
      "SEO Content Strategy",
      "Technical Tutorials & Comparisons",
      "Documentation Architecture",
    ],
    summary:
      "50+ live posts, first-place Google results on category comparisons, docs architecture for AI engineers, and SEO review across blog and partner content.",
  },
  {
    client: "Corsair",
    href: "/case-studies/corsair",
    image: "/case-studies/corsair/corsair-homepage.webp",
    kind: "screen",
    tags: [
      "Onboarding Audit & Fixes",
      "Example Projects",
      "Community Events & Hackathons",
    ],
    summary:
      "Onboarding audits, example projects, community events, and posts that grew an early open-source repo from about 300 to 2,000 GitHub stars.",
  },
];

/**
 * Glass "Read case study" chip that trails the cursor over a slide
 * (fine pointers only). Hidden while hovering another link on the slide.
 */
function useCursorChip() {
  const reduceMotion = useReducedMotion();
  const [visible, setVisible] = useState(false);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 380, damping: 32, mass: 0.5 });
  const sy = useSpring(y, { stiffness: 380, damping: 32, mass: 0.5 });

  const onPointerMove = (event: PointerEvent<HTMLElement>) => {
    if (event.pointerType !== "mouse") return;
    const rect = event.currentTarget.getBoundingClientRect();
    const px = event.clientX - rect.left;
    const py = event.clientY - rect.top;
    if (!visible) {
      sx.jump(px);
      sy.jump(py);
    }
    x.set(px);
    y.set(py);
    const overOwnLink = (event.target as HTMLElement).closest(
      "[data-slide-link]",
    );
    setVisible(!overOwnLink);
  };

  return {
    handlers: { onPointerMove, onPointerLeave: () => setVisible(false) },
    chip: (
      <AnimatePresence>
        {visible ? (
          <motion.span
            aria-hidden
            className="s1-glass-btn-light pointer-events-none absolute left-0 top-0 z-30 hidden items-center gap-2 whitespace-nowrap rounded-full py-2 pl-4 pr-2 text-[12px] font-medium uppercase tracking-[0.08em] text-white lg:inline-flex"
            style={{ x: sx, y: sy, translateX: "-50%", translateY: "-50%" }}
            initial={{ opacity: 0, scale: reduceMotion ? 1 : 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: reduceMotion ? 1 : 0.6 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          >
            Read case study
            <span className="flex size-7 items-center justify-center rounded-full bg-white text-[#140e0a]">
              <ArrowUpRight weight="bold" className="size-3.5" />
            </span>
          </motion.span>
        ) : null}
      </AnimatePresence>
    ),
  };
}

function SlideCounter({
  index,
  total,
  className,
}: {
  index: number;
  total: string;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "text-[15px] font-medium tabular-nums text-white/55",
        className,
      )}
    >
      <span className="text-[44px] font-medium leading-none tracking-[-0.04em] text-white md:text-[56px]">
        {String(index + 1).padStart(2, "0")}
      </span>
      <span className="ml-1.5">/ {total}</span>
    </p>
  );
}

function Slide({
  slide,
  index,
  total,
  isLast,
}: {
  slide: Slide;
  index: number;
  total: string;
  isLast: boolean;
}) {
  const { handlers, chip } = useCursorChip();
  const reduceMotion = useReducedMotion();
  const ref = useRef<HTMLElement>(null);
  // Last slide only: it darkens softly as the page scrolls on past it.
  const { scrollYProgress: leaving } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const dim = useTransform(leaving, [0, 1], [0, 0.65]);

  return (
    <article
      ref={ref}
      {...handlers}
      className="sticky top-0 h-[calc(100svh/var(--s1-zoom,1))] min-h-[600px] overflow-hidden text-white lg:cursor-none"
    >
      {slide.kind === "photo" ? (
        <>
          <Image
            src={slide.image}
            alt={`${slide.client} case study`}
            fill
            sizes="100vw"
            className="object-cover"
            style={
              slide.position ? { objectPosition: slide.position } : undefined
            }
            priority={index === 0}
          />
          <div
            aria-hidden
            className="absolute inset-0 bg-black/65 sm:bg-black/50"
          />
          <div
            aria-hidden
            className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/30 to-transparent"
          />
        </>
      ) : (
        <>
          {/* Screenshots: shown crisp in a floating frame, never blurred */}
          <div
            aria-hidden
            className="absolute inset-0 bg-[radial-gradient(ellipse_70%_80%_at_75%_45%,#3a1709_0%,#140b08_55%,#070506_100%)]"
          />
          <div
            aria-hidden
            className="absolute inset-0 opacity-40 [background-image:linear-gradient(to_right,rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.05)_1px,transparent_1px)] [background-size:64px_64px] [mask-image:radial-gradient(ellipse_60%_60%_at_75%_45%,black,transparent)]"
          />
          {/* Glass bezel, posed so it leans out of the screen (static, no motion) */}
          <div className="absolute inset-x-4 top-[12%] aspect-[16/10] opacity-30 [perspective:1800px] sm:inset-x-8 lg:inset-x-auto lg:right-[3%] lg:top-1/2 lg:w-[58%] lg:-translate-y-1/2 lg:opacity-100">
            <div className="relative h-full w-full rounded-[6px] bg-[linear-gradient(150deg,rgba(255,255,255,0.22),rgba(255,255,255,0.05)_45%,rgba(255,255,255,0.12))] p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.45),inset_0_0_0_1px_rgba(255,255,255,0.14),0_60px_140px_-40px_rgba(0,0,0,0.95),0_30px_60px_-30px_rgba(249,115,22,0.35)] backdrop-blur-xl [transform:rotateY(-14deg)_rotateX(5deg)_rotateZ(-1deg)] [transform-origin:right_center]">
              <div className="relative h-full overflow-hidden rounded-[6px] bg-[#0d0b0a] ring-1 ring-black/40">
                <Image
                  src={slide.image}
                  alt={`${slide.client} case study`}
                  fill
                  sizes="(min-width:1024px) 52vw, 100vw"
                  className="object-cover object-top"
                />
                {/* Light catching the glass across the top */}
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0 bg-[linear-gradient(160deg,rgba(255,255,255,0.14)_0%,transparent_32%)]"
                />
              </div>
            </div>
          </div>
          {/* keeps the copy readable where the frame sits behind it on phones */}
          <div
            aria-hidden
            className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent lg:hidden"
          />
        </>
      )}

      {/* Whole slide opens the case study */}
      <Link
        href={slide.href}
        aria-label={`Read the ${slide.client} case study`}
        className="absolute inset-0 z-[1] lg:cursor-none"
      />
      {chip}

      <Container className="pointer-events-none relative z-[2] flex h-full flex-col justify-between py-24 md:py-28">
        {/* Counter sits on the left, beside the section label */}
        <div className="flex items-center gap-5">
          <SlideCounter index={index} total={total} />
          <span aria-hidden className="h-10 w-px bg-white/20" />
          <p className="font-editorial text-[18px] text-white/70 md:text-[22px]">
            Campaigns we did
          </p>
        </div>

        <Rise className="max-w-[460px]">
          <h3 className="text-[40px] font-medium leading-none tracking-[-0.045em] md:text-[56px]">
            {slide.client}
          </h3>
          <ul role="list" className="mt-5 flex flex-wrap gap-2">
            {slide.tags.map((tag) => (
              <li
                key={tag}
                className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[12px] font-medium backdrop-blur-sm sm:text-[13px]"
              >
                {tag}
              </li>
            ))}
          </ul>
          <p className="mt-4 text-[16px] leading-[1.6] text-white/70">
            {slide.summary}
          </p>
          <Link
            href={slide.href}
            data-slide-link
            className="pointer-events-auto group mt-8 inline-flex lg:hidden h-11 items-center gap-2 rounded-full border border-white/30 bg-white/10 px-5 text-[13px] font-medium uppercase tracking-[0.06em] backdrop-blur transition-colors hover:bg-white hover:text-black"
          >
            Read case study
            <ArrowUpRight
              weight="bold"
              className="size-4 transition-transform duration-300 group-hover:rotate-45"
            />
          </Link>
        </Rise>

        <div className="flex items-end justify-between">
          <Link
            href="/case-studies"
            data-slide-link
            className="pointer-events-auto text-[13px] font-medium uppercase tracking-[0.06em] text-white/70 underline-offset-4 hover:text-white hover:underline"
          >
            View all case studies
          </Link>
        </div>
      </Container>

      {isLast && !reduceMotion ? (
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-[3] bg-black"
          style={{ opacity: dim }}
        />
      ) : null}
    </article>
  );
}

export default function CaseSlides() {
  const total = String(SLIDES.length).padStart(2, "0");

  return (
    <section id="results" className="relative bg-[var(--home-cream)]">
      {/* The dark slides rise over the cream as one rounded sheet */}
      <div className="relative overflow-clip rounded-t-[28px] bg-[#07050a] shadow-[0_-30px_80px_-40px_rgba(60,20,0,0.45)] sm:rounded-t-[44px]">
        {SLIDES.map((slide, index) => (
          <Slide
            key={slide.client}
            slide={slide}
            index={index}
            total={total}
            isLast={index === SLIDES.length - 1}
          />
        ))}
      </div>
    </section>
  );
}
