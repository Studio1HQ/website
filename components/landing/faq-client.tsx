"use client";

import { motion } from "motion/react";
import { Plus } from "@phosphor-icons/react";
import { containerVariants, headerVariants, fadeInUp } from "@/lib/animations";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Eyebrow, PillLink } from "@/components/home/ui";
import { cn } from "@/lib/utils";

interface FAQItem {
  question: string;
  answer: string;
}

interface FAQClientProps {
  items: FAQItem[];
  subtitle?: string;
}

export default function FAQClient({ items, subtitle }: FAQClientProps) {
  return (
    <motion.section
      id="faq"
      className="relative px-4 py-24 md:py-32"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.1 }}
      variants={containerVariants}
    >
      <div className="mx-auto grid w-full max-w-7xl gap-12 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.35fr)] lg:gap-20 xl:gap-28">
        <motion.aside
          className="flex flex-col gap-5 lg:sticky lg:top-28 lg:self-start"
          variants={headerVariants}
        >
          <Eyebrow>FAQ</Eyebrow>
          <h2 className="text-[34px] font-medium leading-[1.06] tracking-[-0.045em] text-[var(--home-ink)] sm:text-[48px]">
            Frequently Asked <span className="s1-accent-text">Questions</span>
          </h2>
          <p className="max-w-md text-[16px] leading-[1.6] text-[var(--home-ink-soft)]">
            {subtitle ??
              "Everything you need to know about working with Studio1."}
          </p>
          <div className="mt-2 flex flex-col items-start">
            <p className="-mt-2 text-[14px] text-[var(--home-ink-soft)]">
              Still deciding? We&apos;re happy to walk through fit and scope.
            </p>
            <PillLink href="https://cal.com/studio1/collab" tone="brand" external className="mt-6">
              Book a call
            </PillLink>
          </div>
        </motion.aside>

        <motion.div className="s1-glass-card min-w-0 rounded-[24px] px-5 py-2 sm:px-8" variants={fadeInUp}>
          <Accordion type="single" collapsible className="w-full">
            {items.map((item, index) => {
              const number = String(index + 1).padStart(2, "0");

              return (
                <AccordionItem
                  key={item.question}
                  value={`faq-${index}`}
                  className="border-b border-[var(--home-line)] last:border-b-0"
                >
                  <AccordionTrigger
                    className={cn(
                      "group gap-4 py-6 text-left hover:no-underline sm:gap-6 sm:py-7",
                      "[&>svg]:hidden",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                    )}
                  >
                    <span className="font-numeric w-8 shrink-0 pt-0.5 text-sm font-medium tabular-nums text-[var(--home-ink-soft)] transition-colors group-data-[state=open]:text-primary sm:w-10">
                      {number}
                    </span>
                    <span className="min-w-0 flex-1 pr-2 text-[16px] font-medium leading-snug tracking-[-0.02em] text-[var(--home-ink)] sm:text-[18px]">
                      {item.question}
                    </span>
                    <span
                      aria-hidden
                      className={cn(
                        "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full border border-[var(--home-line)] text-[var(--home-ink-soft)]",
                        "transition-colors duration-200",
                        "group-hover:border-primary/40 group-hover:text-primary",
                        "group-data-[state=open]:border-primary/50 group-data-[state=open]:bg-primary/10 group-data-[state=open]:text-primary",
                      )}
                    >
                      <Plus
                        weight="bold"
                        className="size-3.5 transition-transform duration-200 group-data-[state=open]:rotate-45"
                      />
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="pb-6 pl-12 pr-14 text-[15px] leading-relaxed text-[var(--home-ink-soft)] sm:pl-16 sm:pr-16 sm:text-base">
                    {item.answer}
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </motion.div>
      </div>
    </motion.section>
  );
}
