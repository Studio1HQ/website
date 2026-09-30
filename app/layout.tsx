import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { baseUrl } from "@/lib/site";
import Script from "next/script";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  applicationName: "Studio1",
  appleWebApp: {
    title: "Studio1",
  },
  icons: {
    icon: [{ url: "/icon.png", type: "image/png" }],
    apple: [{ url: "/icon.png", type: "image/png" }],
  },
  title: {
    default: "Technical Content & Developer Growth Agency for DevTools | Studio1",
    template: "%s | Studio1",
  },
  description:
    "Studio1 is a technical content and developer growth partner for SaaS and devtool teams. We produce tutorials, docs, videos, launches, and developer programs that drive adoption.",
  keywords: [
    "technical content",
    "developer relations",
    "DevRel",
    "developer marketing",
    "technical writing",
    "API documentation",
    "technical blog",
    "developer community",
    "technical content agency",
    "devrel agency",
    "developer tutorials",
    "developer documentation",
    "developer advocacy",
    "technical tutorial writing",
    "content marketing for devtools",
  ],
  authors: [{ name: "Studio1" }],
  openGraph: {
    title: "Technical Content & Developer Growth Agency for DevTools | Studio1",
    description:
      "Studio1 is a technical content and developer growth partner for SaaS and devtool teams. We produce tutorials, docs, videos, launches, and developer programs that drive adoption.",
    url: baseUrl,
    siteName: "Studio1",
    locale: "en",
    type: "website",
    images: [
      {
        url: `${baseUrl}/opengraph-image.png`,
        width: 1200,
        height: 630,
        alt: "Studio1 - Technical Content and Developer Growth Services",
      },
    ],
  },
  twitter: {
    title: "Technical Content & Developer Growth Agency for DevTools | Studio1",
    card: "summary_large_image",
    description:
      "Studio1 is a technical content and developer growth partner for SaaS and devtool teams. We produce tutorials, docs, videos, launches, and developer programs that drive adoption.",
    images: [`${baseUrl}/opengraph-image.png`],
    creator: "@Studio1HQ",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      <body
        className={cn(
          "antialiased font-secondary",
        )}
        suppressHydrationWarning
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              name: "Studio1",
              url: baseUrl,
              logo: `${baseUrl}/icon.png`,
              description:
                "Studio1 is a technical content and developer growth partner for SaaS and devtool teams. We produce tutorials, docs, videos, launches, and developer programs that drive adoption.",
              sameAs: [
                "https://twitter.com/Studio1HQ",
                "https://linkedin.com/company/studio1hq",
              ],
            }),
          }}
        />

        <Script
          src="https://t.raah.dev/script.js"
          data-pid="proj_w60eqpxi5ax0dw36"
          data-domain="studio1hq.com"
          strategy="afterInteractive"
        />
        <div
          data-raah-live=""
          data-pid="proj_w60eqpxi5ax0dw36"
          data-domain="studio1hq.com"
          data-theme="light"
          data-sticky="true"
          data-position="bottom-left"
        />
        <Script src="https://t.raah.dev/badge.js" strategy="afterInteractive" />
      </body>
    </html>
  );
}
