"use client";
import React from "react";
import { ArrowRight } from "lucide-react";
import { clientWorkCards } from "@/data/client-work";
import { Version1 } from "./blog-thubmnail-version/version-1";
import { Button } from "@/components/ui/button";
import { motion } from "motion/react";
import Link from "next/link";
import { containerVariants, fadeInUp, headerVariants } from "@/lib/animations";

// Keep the service examples in sync with the canonical collection used by /work.
const cards = clientWorkCards.slice(0, 6);

export default function BlogSection() {
  return (
    <motion.div
      id="blog-examples"
      className="relative overflow-hidden sm:px-20 px-2.5 py-10 sm:py-20"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.2 }}
      variants={containerVariants}
    >
      <motion.div className="text-center my-10" variants={headerVariants}>
        <p className="mx-auto text-foreground/80 text-sm md:text-base"></p>
        <div className="text-center mb-16">
          <h2 className="text-4xl font-normal mb-4 md:text-5xl">
            Our{" "}
            <span className="serif-accent font-accent font-normal text-transparent bg-clip-text bg-gradient-to-br from-primary via-primary1 to-primary">
              Blogs
            </span>
          </h2>
          <p className="text-muted-foreground ">
            Everything you need to build and maintain a successful{" "}
            <br className="hidden md:block" /> developer relations program.
          </p>
        </div>
      </motion.div>
      <div className="min-h-0 md:min-h-[600px] max-w-7xl mx-auto p-4 flex flex-col justify-center rounded-md space-y-4">
        <motion.div
          className="relative flex flex-wrap justify-center gap-6"
          variants={fadeInUp}
        >
          {cards.map((item, index) => {
            switch (item.version) {
              case 1:
                return (
                  <div
                    key={index}
                    className={`w-full sm:w-[calc(50%-0.75rem)] lg:w-[calc(33.333%-1rem)] ${index >= 4 ? "hidden md:block" : ""}`}
                  >
                    <Version1
                      title={item.title}
                      description={item.description}
                      hrefLink={item.link}
                      tags={item.tags}
                    />
                  </div>
                );
              default:
                return null;
            }
          })}
        </motion.div>
      </div>
      <motion.div variants={fadeInUp}>
        <Button
          asChild
          variant="gradient"
          size="cta"
          className="flex w-fit mx-auto justify-center"
        >
          <Link href="/work">
            View Client Work <ArrowRight className="ml-2" size={24} />
          </Link>
        </Button>
      </motion.div>
    </motion.div>
  );
}
