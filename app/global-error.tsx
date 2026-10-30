"use client";

import Link from "next/link";
import localFont from "next/font/local";
import Logo from "@/components/ui/svgs/logo";
import { Container } from "@/components/home/ui";
import { PaperErrorView } from "@/components/paper/paper-error-pages";
import "./globals.css";

// global-error replaces the root layout, so it loads the brand font itself.
const studio1Sans = localFont({
  src: [
    { path: "./fonts/Studio1Sans-Regular.woff2", weight: "400", style: "normal" },
    { path: "./fonts/Studio1Sans-Medium.woff2", weight: "500", style: "normal" },
  ],
  variable: "--font-studio1-sans",
  display: "swap",
  fallback: ["Inter", "Arial", "sans-serif"],
});

/** Last-resort error page (the root layout itself failed): no i18n, no chrome. */
export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <html lang="en" className={studio1Sans.variable}>
      <body className="antialiased font-secondary">
        <title>Something went wrong | Studio1</title>
        <header className="absolute inset-x-0 top-0 z-10">
          <Container className="py-6">
            <Link href="/" className="inline-flex items-center gap-3 text-[#141414]">
              <Logo className="size-7" />
              <span className="text-[20px] font-medium tracking-[-0.04em]">
                Studio1
              </span>
            </Link>
          </Container>
        </header>
        <PaperErrorView
          error={error}
          retry={unstable_retry}
          copy={{
            status: "Error",
            titlePrefix: "Something went",
            titleHighlight: "wrong",
            description:
              "An unexpected error stopped this page from rendering. Try again, or head back home.",
            retryCta: "Try again",
            homeCta: "Back to home",
            reference: "Ref",
          }}
        />
      </body>
    </html>
  );
}
