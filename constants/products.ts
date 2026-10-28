import {
  ChartBar,
  Globe,
  Palette,
  Code,
  Eye,
  WifiHigh,
  Timer,
  Path,
  Browser,
  Swatches,
  Export,
} from "@phosphor-icons/react/dist/ssr";
import type { Icon } from "@phosphor-icons/react";

export type ProductStatus = "launched" | "live" | "upcoming";

export type ProductMedia =
  | {
      kind: "image";
      src: string;
      alt: string;
    }
  | {
      kind: "video";
      src: string;
      poster: string;
      alt: string;
    };

export type Product = {
  name: string;
  tagline: string;
  description: string;
  longDescription: string;
  highlights: string[];
  features: { label: string; detail: string; icon: Icon }[];
  url: string;
  category: string;
  status: ProductStatus;
  statusLabel: string;
  media: ProductMedia;
  /** The product's own app icon. */
  logo: string;
};

export const products: Product[] = [
  {
    name: "Raah",
    tagline: "Web analytics and network observability for real users",
    description:
      "One lightweight script for analytics and observability. Track traffic, journey paths, Web Vitals, API timing, errors, and ISP impact, enriched at the edge with network context.",
    longDescription:
      "Most analytics tools stop at pageviews. Most observability tools ignore the frontend. Raah bridges that gap. One script tag gives you user analytics, journey paths, Core Web Vitals, endpoint latency, browser errors, ISP diagnostics, and third-party script impact in a single dashboard. Built for developers and SaaS teams who need to understand real-user experience without stitching three tools together.",
    highlights: [
      "Pageviews, sessions, and full user journey paths",
      "Core Web Vitals, API latency, and browser errors from real users",
      "ISP and carrier diagnostics by city, country, and connection",
      "One script tag, no SDK or build steps, live in minutes",
    ],
    features: [
      {
        label: "User analytics & journeys",
        detail:
          "Pageviews, sessions, referrers, UTMs, geography, devices, and full journey paths from landing to conversion",
        icon: Path,
      },
      {
        label: "Real-user observability",
        detail:
          "Endpoint latency, error rates, DNS/TCP/TLS/TTFB timing, and browser-side failures from actual users",
        icon: WifiHigh,
      },
      {
        label: "ISP & network diagnostics",
        detail:
          "See which carriers and ISPs are hurting real users, broken down by city, country, and connection quality",
        icon: Globe,
      },
      {
        label: "Core Web Vitals",
        detail:
          "LCP, INP, and CLS from real users, segmented by page, geography, and device",
        icon: Timer,
      },
      {
        label: "One-line installation",
        detail:
          "Paste one script tag. No SDK sprawl, no build steps, no config files. Live in under a minute",
        icon: ChartBar,
      },
    ],
    url: "https://raah.dev",
    logo: "/products/raah-logo.svg",
    category: "Analytics & Observability",
    status: "launched",
    statusLabel: "Launched",
    media: {
      kind: "video",
      src: "https://cdn.raah.dev/videos/raah-hero.mp4",
      poster: "/products/raah-poster.avif",
      alt: "Raah dashboard showing analytics, Web Vitals, and network observability",
    },
  },
  {
    name: "AssetSnip",
    tagline: "Website asset extraction for design research and handoff",
    description:
      "Chrome extension that captures colors, fonts, SVGs, videos, gradients, Lottie, and UI details from any live website, without digging through DevTools.",
    longDescription:
      "Designers and developers waste hours inspecting websites through DevTools to capture design references. AssetSnip replaces that workflow. Browse any website, and AssetSnip automatically extracts colors, typography, SVGs, images, videos, gradients, Lottie animations, and UI sections. Save everything to a reusable library and export CSS, HTML, or Tailwind-ready code for direct handoff to your codebase.",
    highlights: [
      "Extract colors, fonts, SVGs, videos, gradients, and Lottie from any site",
      "Works on live websites via Chrome, with no source code or Figma files needed",
      "Save captured assets to a reusable design inspiration library",
      "Export CSS, HTML, or Tailwind-ready code for direct handoff",
    ],
    features: [
      {
        label: "Extract from any website",
        detail:
          "Colors, fonts, SVGs, images, videos, gradients, Lottie files, and UI sections captured automatically",
        icon: Eye,
      },
      {
        label: "Reusable design library",
        detail:
          "Save captured assets into organized collections for inspiration boards, mood boards, and design systems",
        icon: Swatches,
      },
      {
        label: "Browser extension",
        detail:
          "Chrome extension that works on any live website without needing access to source code or Figma files",
        icon: Browser,
      },
      {
        label: "Color & font identification",
        detail:
          "Capture full color palettes, gradients, and typography stacks with exact values ready for use",
        icon: Palette,
      },
      {
        label: "Export-ready code",
        detail:
          "Export captured design values as CSS, HTML, or Tailwind utility classes directly into your project",
        icon: Export,
      },
    ],
    url: "https://assetsnip.com",
    logo: "/products/assetsnip-logo.svg",
    category: "Design Tooling",
    status: "live",
    statusLabel: "Live",
    media: {
      kind: "image",
      src: "/products/assetsnip.webp",
      alt: "AssetSnip Chrome extension extracting colors, fonts, and SVGs from a website",
    },
  },
];
