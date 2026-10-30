"use client";

import { Container, Eyebrow, Rise } from "@/components/home/ui";
import {
  IconClick,
  IconPhoto,
  IconSearch,
  IconDeviceMobile,
} from "@tabler/icons-react";

const layers = [
  {
    icon: IconPhoto,
    title: "Clear preview packaging",
    body: "Readable titles, thumbnails, and descriptions that set the right expectation before a developer presses play.",
  },
  {
    icon: IconSearch,
    title: "Search-friendly context",
    body: "Titles, descriptions, tags, and chapters written around the topic, product, and developer problem being explained.",
  },
  {
    icon: IconClick,
    title: "A strong technical opening",
    body: "Cold opens and demo beats that get to the technical point quickly instead of starting with a long brand intro.",
  },
  {
    icon: IconDeviceMobile,
    title: "Shorts from the same idea",
    body: "Short clips and vertical cuts that reuse the strongest explanation without pretending every topic needs a full campaign.",
  },
];

export default function Packaging() {
  return (
    <section className="relative py-24 md:py-32">
      <Container>
        <div className="grid gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:gap-20">
          <Rise className="lg:sticky lg:top-28 lg:self-start">
            <Eyebrow>The packaging layer</Eyebrow>
            <h2 className="mt-5 max-w-md text-[34px] font-medium leading-[1.06] tracking-[-0.045em] text-[var(--home-ink)] sm:text-[48px]">
              Make the technical idea clear before <span className="s1-accent-text">play</span>
            </h2>
            <p className="mt-6 max-w-md text-[16px] leading-[1.6] text-[var(--home-ink-soft)]">
              We support the practical details around a video: title, thumbnail,
              description, chapters, clips, and upload-ready assets when needed.
            </p>
          </Rise>

          <div className="grid gap-4">
            {layers.map((layer, index) => (
              <Rise key={layer.title} delay={index * 0.06}>
                <div className="s1-glass-card grid gap-5 rounded-[24px] p-6 sm:grid-cols-[auto_1fr] sm:gap-6 md:p-8">
                  <span className="s1-glass-dark flex size-12 items-center justify-center rounded-2xl text-white">
                    <layer.icon className="size-6" stroke={1.6} aria-hidden="true" />
                  </span>
                  <div>
                    <h3 className="text-[20px] font-medium tracking-[-0.025em] text-[var(--home-ink)] md:text-[22px]">
                      {layer.title}
                    </h3>
                    <p className="mt-2.5 max-w-xl text-[15px] leading-[1.6] text-[var(--home-ink-soft)]">
                      {layer.body}
                    </p>
                  </div>
                </div>
              </Rise>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}
