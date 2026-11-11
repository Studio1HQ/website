import type { Metadata } from "next";
import { EventsPage } from "@/components/events/events-page";
import { EVENTS } from "@/data/events";
import {
  ORGANIZATION_ID,
  absoluteImageUrl,
  breadcrumbJsonLd,
  pageMetadata,
  pageUrl,
} from "@/lib/seo";

// Upcoming and past depend on today's date.
export const revalidate = 3600;

const TITLE = "Events: Talks, Hackathons and Meetups";
const DESCRIPTION =
  "Conferences, hackathons, meetups, and livestreams the Studio1 team has spoken at, run, or joined, from KubeCon and CityJS to campus hackathons in India.";

export const metadata: Metadata = pageMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: "/events",
  keywords: [
    "Studio1 events",
    "developer relations talks",
    "KubeCon",
    "hackathons India",
    "cloud native meetups",
    "DevRel speaker",
  ],
});

const ONLINE = new Set(["Podcast", "Livestream", "Webinar"]);

function eventsJsonLd() {
  const iso = (y: number, m: number, d?: number) =>
    [y, String(m).padStart(2, "0"), d ? String(d).padStart(2, "0") : null]
      .filter(Boolean)
      .join("-");
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": `${pageUrl("/events")}#webpage`,
    url: pageUrl("/events"),
    name: `${TITLE} | Studio1`,
    description: DESCRIPTION,
    about: { "@id": ORGANIZATION_ID },
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: EVENTS.length,
      itemListElement: EVENTS.map((e, i) => ({
        "@type": "ListItem",
        position: i + 1,
        item: {
          "@type": "Event",
          name: e.name,
          startDate: iso(e.year, e.month, e.day),
          ...(e.endDay ? { endDate: iso(e.year, e.month, e.endDay) } : {}),
          eventAttendanceMode: ONLINE.has(e.kind)
            ? "https://schema.org/OnlineEventAttendanceMode"
            : "https://schema.org/OfflineEventAttendanceMode",
          ...(e.place && e.place !== "Online"
            ? { location: { "@type": "Place", name: e.place } }
            : {}),
          ...(e.image ? { image: absoluteImageUrl(e.image) } : {}),
          performer: { "@id": ORGANIZATION_ID },
        },
      })),
    },
  };
}

export default function Page() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(eventsJsonLd()) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbJsonLd([
              { name: "Home", path: "/" },
              { name: "Events", path: "/events" },
            ]),
          ),
        }}
      />
      <EventsPage events={EVENTS} now={Date.now()} />
    </>
  );
}
