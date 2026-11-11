"use client";
import React from "react";
import { motion } from "motion/react";
import Link from "next/link";
import { springTransition } from "@/lib/animations";
import type { HoveredLinkProps } from "@/types";

export const Menu = ({
  setActive,
  children,
}: {
  setActive: (item: string | null) => void;
  children: React.ReactNode;
}) => {
  return (
    <nav className="relative rounded-md py-2.5 border border-transparent dark:bg-black dark:border-white/[0.2] bg-white shadow-input flex justify-center sm:space-x-8 space-x-4 px-6 sm:px-8">
      {children}
    </nav>
  );
};


export const MenuItem = ({
  setActive,
  active,
  item,
  children,
}: {
  setActive: (item: string | null) => void;
  active: string | null;
  item: string;
  children?: React.ReactNode;
}) => {
  return (
    <div
      onClick={active == item ? () => setActive(null) : () => setActive(item)}
      className="relative"
    >
      <motion.p
        transition={{ duration: 0.3 }}
        className="cursor-pointer text-black hover:opacity-[0.9] dark:text-white"
      >
        {item}
        {active == item ? (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="lucide lucide-chevron-down w-4 h-4 inline-block ml-2 max-sm:ml-1"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="lucide lucide-chevron-left w-4 h-4 inline-block ml-2"
          >
            <path d="m15 18-6-6 6-6" />
          </svg>
        )}
      </motion.p>
      {active !== null && (
        <motion.div
          initial={{ opacity: 0, scale: 0.85, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={springTransition}
        >
          {active === item && (
            <div className="absolute top-[calc(100%_+_1.2rem)] left-1/2 transform -translate-x-1/2 pt-2">
              <motion.div
                transition={springTransition}
                layoutId="active" // layoutId ensures smooth animation
                className="bg-white dark:bg-black rounded-md overflow-hidden border border-black/[0.2] dark:border-white/[0.2] shadow-xl"
              >
                <motion.div
                  layout // layout ensures smooth animation
                  className="w-max h-full p-4 text-3xl"
                >
                  {children}
                </motion.div>
              </motion.div>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
};

export const HoveredLink = ({ children, href, className }: HoveredLinkProps) => {
  return (
    <Link
      href={href}
      className={className || "text-neutral-700 dark:text-neutral-200 hover:text-black"}
    >
      {children}
    </Link>
  );
};
