"use client";

import React, { useState, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { homeTestimonials } from "@/data/home";
import { AnimatePresence, motion } from "motion/react";

const testimonials = homeTestimonials;

const Testimonial6: React.FC = () => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % testimonials.length);
    }, 5000);

    return () => clearInterval(timer);
  }, []);

  const currentTestimonial = testimonials[currentIndex];

  return (
    <section className="py-10 sm:py-28" id="testimonials">
      <div className="px-2.5 sm:px-10">
        <div className="mb-8 flex-col px-1 lg:mb-12">
          <h2 className="text-3xl text-center font-semibold lg:text-5xl sm:mb-12 mb-4">
            Why{" "}
            <span className="font-bold text-transparent bg-clip-text bg-gradient-to-b from-orange-400 via-orange-500 to-orange-600">
              Clients Love{" "}
            </span>
            Us?
          </h2>
          <Carousel className="w-full">
            <div className="flex items-center space-x-2 justify-center">
              {/* <CarouselPrevious 
                className="static translate-y-0" 
                onClick={() => setCurrentIndex((prevIndex) => (prevIndex - 1 + testimonials.length) % testimonials.length)}
              /> */}
              <CarouselContent>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentIndex}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.5 }}
                    className="w-full"
                  >
                    <CarouselItem>
                      <div className="flex flex-col items-center justify-center text-center h-[400px] sm:h-[400px] px-4 sm:px-8">
                        <div className="max-w-4xl mx-auto">
                          <div data-lenis-prevent className="mb-8 text-md sm:text-xl lg:text-3xl font-medium overflow-y-auto max-h-[300px] sm:max-h-[250px] scrollbar-hide">
                            {currentTestimonial.content
                              .split("\n")
                              .map((line, lineIndex) => (
                                <p key={lineIndex} className="mb-2">
                                  {currentTestimonial.highlights
                                    .reduce(
                                      (acc, highlight) => {
                                        const parts = acc.flatMap((part) =>
                                          part.split(
                                            new RegExp(`(${highlight})`, "gi"),
                                          ),
                                        );
                                        return parts;
                                      },
                                      [line],
                                    )
                                    .map((part, partIndex) => {
                                      const isHighlighted =
                                        currentTestimonial.highlights.some(
                                          (highlight) =>
                                            part
                                              .toLowerCase()
                                              .includes(
                                                highlight.toLowerCase(),
                                              ),
                                        );
                                      return (
                                        <span
                                          key={`${lineIndex}-${partIndex}`}
                                          className={
                                            isHighlighted
                                              ? "text-orange-500 font-semibold"
                                              : ""
                                          }
                                        >
                                          {part}
                                        </span>
                                      );
                                    })}
                                </p>
                              ))}
                          </div>
                          <div className="flex items-center justify-center gap-2 md:gap-4">
                            <Avatar className="w-12 h-12 md:w-16 md:h-16">
                              <AvatarImage
                                src={currentTestimonial.avatar}
                                alt={`${currentTestimonial.name}'s avatar`}
                              />
                              <AvatarFallback>
                                {currentTestimonial.name
                                  .split(" ")
                                  .map((n) => n[0])
                                  .join("")}
                              </AvatarFallback>
                            </Avatar>
                            <div className="text-left">
                              <p className="text-sm font-semibold md:text-xl text-orange-400">
                                {currentTestimonial.name}
                              </p>
                              <p className="text-sm text-muted-foreground md:text-base">
                                {currentTestimonial.role}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CarouselItem>
                  </motion.div>
                </AnimatePresence>
              </CarouselContent>
              {/* <CarouselNext 
                className="static translate-y-0" 
                onClick={() => setCurrentIndex((prevIndex) => (prevIndex + 1) % testimonials.length)}
              /> */}
            </div>
          </Carousel>
        </div>
      </div>
    </section>
  );
};

export default Testimonial6;
