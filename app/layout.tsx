import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { baseUrl } from "@/lib/site";
import {
  HOME_DESCRIPTION,
  HOME_SOCIAL_DESCRIPTION,
  HOME_TITLE,
  defaultOgImages,
  organizationJsonLd,
} from "@/lib/seo";
import { cn } from "@/lib/utils";
import localFont from "next/font/local";

const studio1Sans = localFont({
  src: [
    { path: "./fonts/Studio1Sans-Regular.woff2", weight: "400", style: "normal" },
    { path: "./fonts/Studio1Sans-Medium.woff2", weight: "500", style: "normal" },
  ],
  variable: "--font-studio1-sans",
  display: "swap",
  fallback: ["Inter", "Arial", "sans-serif"],
});

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
    default: `${HOME_TITLE} | Studio1`,
    template: "%s | Studio1",
  },
  description: HOME_DESCRIPTION,
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
    "GitHub growth agency",
    "open source marketing agency",
    "developer tutorials",
    "developer documentation",
    "developer advocacy",
    "technical tutorial writing",
    "content marketing for devtools",
  ],
  authors: [{ name: "Studio1" }],
  // Pages set their own share card; this is the fallback (404s, admin).
  openGraph: {
    title: `${HOME_TITLE} | Studio1`,
    description: HOME_SOCIAL_DESCRIPTION,
    url: baseUrl,
    siteName: "Studio1",
    locale: "en",
    type: "website",
    images: defaultOgImages,
  },
  twitter: {
    title: `${HOME_TITLE} | Studio1`,
    card: "summary_large_image",
    description: HOME_SOCIAL_DESCRIPTION,
    images: defaultOgImages.map(({ url, alt }) => ({ url, alt })),
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
      className={studio1Sans.variable}
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
          // No theme switch on the site: always follow the system theme and
          // ignore any choice saved by the old switch under the default key.
          storageKey="s1-theme-system"
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(organizationJsonLd()),
          }}
        />
      </body>
    </html>
  );
}
