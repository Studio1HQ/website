import {
  CurrencyDollar,
  CursorClick,
  FileSvg,
  FolderOpen,
  Funnel,
  Gauge,
  GlobeHemisphereWest,
  Robot,
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

export type ProductFeature = {
  /** Stable id, so a product's chapter can pair a feature with its own visual. */
  key: string;
  label: string;
  detail: string;
  icon: Icon;
};

export type Product = {
  slug: "raah" | "assetsnip";
  name: string;
  /** One line for the hero's product dock. */
  tagline: string;
  /** Chapter headline: the plain lead, then the part printed in orange. */
  headline: { lead: string; accent: string };
  description: string;
  features: ProductFeature[];
  url: string;
  /** Shown in the address bar of the chapter's browser frame. */
  domain: string;
  category: string;
  status: ProductStatus;
  statusLabel: string;
  media: ProductMedia;
  /** The product's own app icon. */
  logo: string;
};

export const products: Product[] = [
  {
    slug: "raah",
    name: "Raah",
    tagline: "Revenue analytics and real-user observability in one script",
    headline: {
      lead: "Know what drives revenue.",
      accent: "See where the experience breaks.",
    },
    description:
      "One lightweight script connects payments and conversions with page speed, API latency, errors, and ISP performance, so you see what real users go through and where it costs you.",
    features: [
      {
        key: "revenue",
        label: "Revenue attribution",
        detail:
          "Connect Stripe and see which channels bring paying customers, not just visits.",
        icon: CurrencyDollar,
      },
      {
        key: "funnels",
        label: "Funnels & journeys",
        detail:
          "Follow visitors from the landing page to purchase and find the step where they drop.",
        icon: Funnel,
      },
      {
        key: "vitals",
        label: "Core Web Vitals",
        detail:
          "LCP, INP, and CLS from real visits, split by page, country, and device.",
        icon: Gauge,
      },
      {
        key: "network",
        label: "Network observability",
        detail:
          "Real-user API timing by region, ISP, and browser phase, enriched at the edge.",
        icon: GlobeHemisphereWest,
      },
    ],
    url: "https://raah.dev",
    domain: "raah.dev",
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
    slug: "assetsnip",
    name: "AssetSnip",
    tagline: "Design assets and code, captured from any live website",
    headline: {
      lead: "Colors, fonts, SVGs, and code,",
      accent: "captured from any live page.",
    },
    description:
      "A browser extension that pulls reusable design assets out of real websites and turns them into CSS, Tailwind, or DESIGN.md context for your coding agent, without digging through DevTools.",
    features: [
      {
        key: "inspect",
        label: "Inspect live sections",
        detail:
          "Hover any region to capture its HTML, CSS, Tailwind classes, colors, and fonts.",
        icon: CursorClick,
      },
      {
        key: "media",
        label: "SVGs, video & Lottie",
        detail:
          "Grab images, inline SVGs, video, and Lottie JSON straight from public pages.",
        icon: FileSvg,
      },
      {
        key: "library",
        label: "A tidy asset library",
        detail:
          "Save captures to a cloud library with tags and folders, ready for references and handoff.",
        icon: FolderOpen,
      },
      {
        key: "agents",
        label: "DESIGN.md for agents",
        detail:
          "Turn a live page into design context for Cursor, Codex, or Claude Code.",
        icon: Robot,
      },
    ],
    url: "https://assetsnip.com",
    domain: "assetsnip.com",
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

export function getProduct(slug: Product["slug"]) {
  const product = products.find((item) => item.slug === slug);
  if (!product) throw new Error(`Unknown product: ${slug}`);
  return product;
}
