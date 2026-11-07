/*
 * Events the Studio1 team has spoken at, run, judged or joined, from the
 * Studio1 Events tracker in Notion. Add a photo by dropping it in
 * /public/assets/events and setting `image` on the event.
 */

export type EventKind =
  | "Conference"
  | "Hackathon"
  | "Meetup"
  | "Podcast"
  | "Livestream"
  | "Webinar"
  | "Community";

export type StudioEvent = {
  slug: string;
  name: string;
  kind: EventKind;
  /** Calendar position, for sorting and the big date. */
  year: number;
  month: number;
  day?: number;
  /** Last day of a multi-day event, same month. */
  endDay?: number;
  /** The date as written when it is not exact, e.g. "Early October". */
  approx?: string;
  /** City or "Online", only where it is known. */
  place?: string;
  /** One or two lines on what happened, from the photos and links. */
  summary?: string;
  /** Cover photo. */
  image?: string;
  /** More photos from the event, cover first. */
  gallery?: string[];
  /** The event's or organiser's logo, shown until a photo is added. */
  logo?: string;
  /** The logo is a full square tile with its own background. */
  logoFill?: boolean;
  /** Brand colour for a single-colour SVG logo. */
  brand?: string;
  /** A recording or post about the event. */
  link?: string;
};

export const EVENTS: StudioEvent[] = [
  {
    slug: "kubecon-na-2026",
    name: "KubeCon North America 2026 co-located events",
    kind: "Conference",
    year: 2026,
    month: 11,
    place: "North America",
    logo: "/assets/logos/events/cncf.svg",
    brand: "#0086FF",
    link: "https://events.linuxfoundation.org/kubecon-cloudnativecon-north-america/",
  },
  {
    slug: "cityjs-athens",
    name: "CityJS Athens",
    kind: "Conference",
    year: 2026,
    month: 10,
    day: 22,
    place: "Athens",
    logo: "/assets/logos/events/javascript.svg",
    brand: "#E8C300",
    image: "/assets/events/cityjs-athens/01.webp",
    gallery: [
      "/assets/events/cityjs-athens/01.webp",
      "/assets/events/cityjs-athens/02.webp",
    ],
  },
  {
    slug: "react-alicante",
    name: "React Alicante",
    kind: "Conference",
    year: 2026,
    month: 9,
    day: 24,
    place: "Alicante",
    link: "https://www.youtube.com/watch?v=COEYk7B7g18",
    logo: "/assets/logos/events/react.svg",
    brand: "#149ECA",
    image: "/assets/events/react-alicante/01.webp",
    gallery: [
      "/assets/events/react-alicante/01.webp",
      "/assets/events/react-alicante/02.webp",
    ],
    summary:
      'Shivay Lamba and Vikash Tiwary ran the workshop "Building AI-Powered React Apps with TanStack AI".',
  },
  {
    slug: "nebius-podcast-dylan-bristot",
    name: "Podcast with Dylan Bristot of Nebius",
    kind: "Podcast",
    year: 2026,
    month: 8,
    day: 24,
    approx: "Week of August 24",
    place: "Online",
    logo: "/assets/logos/nebius.webp",
    logoFill: true,
  },
  {
    slug: "hackathon-session",
    name: "Hackathon session",
    kind: "Hackathon",
    year: 2026,
    month: 10,
    day: 2,
  },
  {
    slug: "ship-it-together",
    name: "Ship It Together talk at a hackathon",
    kind: "Hackathon",
    year: 2026,
    month: 9,
    day: 30,
  },
  {
    slug: "corsair-hackathon",
    name: "Corsair sponsored hackathon visit",
    kind: "Hackathon",
    year: 2026,
    month: 7,
    day: 9,
    logo: "/assets/logos/corsair.webp",
  },
  {
    slug: "synchronicity-s2",
    name: "Synchronicity S2 by Jadavpur University ACM Student Chapter",
    kind: "Community",
    year: 2026,
    month: 5,
    day: 30,
    endDay: 31,
    image: "/assets/events/synchronicity-s2/01.webp",
    gallery: [
      "/assets/events/synchronicity-s2/01.webp",
      "/assets/events/synchronicity-s2/02.webp",
      "/assets/events/synchronicity-s2/03.webp",
    ],
    logo: "/assets/logos/events/acm.svg",
    brand: "#0085CA",
    place: "Jadavpur University, Kolkata",
  },
  {
    slug: "gdg-hackathon",
    name: "GDG Hackathon",
    kind: "Hackathon",
    year: 2026,
    month: 5,
    day: 29,
    endDay: 30,
    logo: "/assets/logos/events/gdg.png",
  },
  {
    slug: "hacktropica",
    name: "Hacktropica",
    kind: "Hackathon",
    year: 2026,
    month: 4,
    day: 4,
    endDay: 5,
    image: "/assets/events/hacktropica/01.webp",
  },
  {
    slug: "kubecon-india-2026",
    name: "KubeCon India 2026",
    kind: "Conference",
    year: 2026,
    month: 6,
    day: 18,
    place: "India",
    link: "https://www.youtube.com/watch?v=xL6-u-LSN4w",
    logo: "/assets/logos/events/cncf.svg",
    brand: "#0086FF",
    image: "/assets/events/kubecon-india-2026/01.webp",
    summary:
      'Chamod Perera and Shivay Lamba presented "From Flaky Builds to Self-Healing Deployments: An OTel-Driven CI/CD Tale".',
  },
  {
    slug: "pytorch-conference-poster",
    name: "PyTorch Conference poster",
    kind: "Conference",
    year: 2026,
    month: 4,
    approx: "Around April",
    logo: "/assets/logos/events/pytorch.svg",
    brand: "#EE4C2C",
    image: "/assets/events/pytorch-conference-poster/01.webp",
  },
  {
    slug: "claude-code-delhi",
    name: "Claude Code Delhi, first chapter meetup",
    kind: "Meetup",
    year: 2026,
    month: 1,
    day: 17,
    logo: "/assets/logos/events/claude.svg",
    brand: "#D97757",
    image: "/assets/events/claude-code-delhi/01.webp",
    gallery: [
      "/assets/events/claude-code-delhi/01.webp",
      "/assets/events/claude-code-delhi/02.webp",
    ],
    summary: "The first Claude Code Delhi chapter meetup, held at IIIT Delhi.",
    place: "IIIT Delhi, New Delhi",
  },
  {
    slug: "hacktoberfest-kalyani",
    name: "Hacktoberfest Hack Day Kalyani x Dev Community KGEC",
    kind: "Hackathon",
    year: 2026,
    month: 10,
    logo: "/assets/logos/events/mlh.svg",
    brand: "#E73427",
    place: "KGEC, Kalyani",
  },
  {
    slug: "aki-hacks",
    name: "AKI Hacks (Hacktoberfest)",
    kind: "Hackathon",
    year: 2026,
    month: 10,
    image: "/assets/events/aki-hacks/01.webp",
    gallery: [
      "/assets/events/aki-hacks/01.webp",
      "/assets/events/aki-hacks/02.webp",
      "/assets/events/aki-hacks/03.webp",
      "/assets/events/aki-hacks/04.webp",
    ],
    summary:
      "A Hacktoberfest hackathon, with Studio1 among the partners on the banner and the team on the floor with the builders.",
    logo: "/assets/logos/events/mlh.svg",
    brand: "#E73427",
  },
  {
    slug: "scee-hackathon",
    name: "SCEE Hackathon",
    kind: "Hackathon",
    year: 2026,
    month: 10,
    approx: "Early October",
    image: "/assets/events/scee-hackathon/01.webp",
    gallery: [
      "/assets/events/scee-hackathon/01.webp",
      "/assets/events/scee-hackathon/02.webp",
      "/assets/events/scee-hackathon/03.webp",
    ],
    summary:
      'Arindam Majumder gave the hackathon talk "Ship it. Together." to the builders in the room.',
  },
  {
    slug: "hackspire-2",
    name: "Hackspire (2nd edition)",
    kind: "Hackathon",
    year: 2026,
    month: 10,
    approx: "Early October",
    image: "/assets/events/hackspire-2/01.webp",
    gallery: [
      "/assets/events/hackspire-2/01.webp",
      "/assets/events/hackspire-2/02.webp",
      "/assets/events/hackspire-2/03.webp",
    ],
    summary:
      'The talk "Meet OpenLore": a knowledge base for AI agents, one place for docs, notes and runbooks that agents and people all read, live.',
    logo: "/assets/logos/events/hackspire.png",
    place: "Kolkata",
  },
  {
    slug: "innofusion-3",
    name: "InnoFusion 3.0",
    kind: "Community",
    year: 2026,
    month: 7,
    day: 25,
    endDay: 26,
    logo: "/assets/logos/events/innofusion.png",
  },
  {
    slug: "buildx-hackathon",
    name: "BuildX Hackathon",
    kind: "Hackathon",
    year: 2026,
    month: 6,
  },
  {
    slug: "gdg-unite-techfest-2026",
    name: "GDG Unite / TechFest 2026",
    kind: "Community",
    year: 2026,
    month: 4,
    day: 18,
    endDay: 19,
    logo: "/assets/logos/events/gdg.png",
  },
  {
    slug: "hacknovate-7",
    name: "Hacknovate 7.0",
    kind: "Hackathon",
    year: 2026,
    month: 4,
    day: 3,
    endDay: 4,
  },
  {
    slug: "hackbyte-4",
    name: "HackByte 4.0",
    kind: "Hackathon",
    year: 2026,
    month: 4,
    logo: "/assets/logos/events/hackbyte.png",
  },
  {
    slug: "couchbase-bangalore-webinar",
    name: "Couchbase Bangalore webinar",
    kind: "Webinar",
    year: 2025,
    month: 9,
    place: "Online",
    link: "https://www.youtube.com/watch?v=mvV_CRYQuyU",
    logo: "/assets/logos/events/couchbase.svg",
    brand: "#EA2328",
    image: "/assets/events/couchbase-bangalore-webinar/01.webp",
    summary:
      "A live session on building AI agents with the Couchbase MCP server.",
  },
  {
    slug: "vcluster-fridays",
    name: "vCluster Fridays livestream with Loft Labs",
    kind: "Livestream",
    year: 2025,
    month: 7,
    day: 4,
    place: "Online",
    link: "https://www.youtube.com/watch?v=chXLB7igo6Q&t=2250s",
    image: "/assets/events/vcluster-fridays/01.webp",
    summary:
      'On vCluster Fridays with Loft Labs, showing KitOps as "the missing link in your AI pipeline".',
    logo: "/assets/logos/events/vcluster.png",
  },
  {
    slug: "platform-cloud-cafe",
    name: "Platform and Cloud Cafe podcast",
    kind: "Podcast",
    year: 2025,
    month: 6,
    day: 26,
    place: "Online",
  },
  {
    slug: "bret-fisher-livestream",
    name: "Bret Fisher Cloud Native DevOps livestream",
    kind: "Livestream",
    year: 2025,
    month: 4,
    day: 17,
    place: "Online",
    link: "https://www.youtube.com/watch?v=fP_OssMlnWI&t=4234s",
    image: "/assets/events/bret-fisher-livestream/01.webp",
    logo: "/assets/logos/events/bret-fisher.png",
  },
  {
    slug: "cncf-projects-tour-kitops",
    name: "CNCF Projects Tour Ep 5: Reproducible AI/ML with KitOps",
    kind: "Livestream",
    year: 2025,
    month: 4,
    day: 16,
    place: "Online",
    link: "https://www.linkedin.com/posts/cncf-kitops-devops-share-7315098822844604416-vHMX/",
    logo: "/assets/logos/kitops.webp",
    logoFill: true,
    image: "/assets/events/cncf-projects-tour-kitops/01.webp",
    summary:
      "Episode 5 of the CNCF Projects Tour: reproducible AI/ML with KitOps, the CNCF-hosted open-source project.",
  },
  {
    slug: "nebius-webinar",
    name: "Nebius webinar",
    kind: "Webinar",
    year: 2025,
    month: 1,
    place: "Online",
    logo: "/assets/logos/nebius.webp",
    logoFill: true,
  },
  {
    slug: "kubecon-na-2025",
    name: "KubeCon + CloudNativeCon North America 2025",
    kind: "Conference",
    year: 2025,
    month: 11,
    place: "North America",
    link: "https://www.youtube.com/watch?v=3QkIRic7mbo",
    logo: "/assets/logos/events/cncf.svg",
    brand: "#0086FF",
    image: "/assets/events/kubecon-na-2025/01.webp",
  },
  {
    slug: "kcd-sri-lanka",
    name: "KCD Sri Lanka",
    kind: "Conference",
    year: 2025,
    month: 10,
    day: 25,
    place: "Sri Lanka",
    logo: "/assets/logos/events/cncf.svg",
    brand: "#0086FF",
  },
  {
    slug: "agentsnexus",
    name: "Agentsnexus",
    kind: "Community",
    year: 2025,
    month: 9,
    day: 27,
    image: "/assets/events/agentsnexus/01.webp",
  },
  {
    slug: "coscup",
    name: "COSCUP",
    kind: "Conference",
    year: 2025,
    month: 8,
    day: 9,
    place: "Taipei",
    image: "/assets/events/coscup/01.webp",
    gallery: [
      "/assets/events/coscup/01.webp",
      "/assets/events/coscup/02.webp",
      "/assets/events/coscup/03.webp",
    ],
    summary:
      'Shivay Lamba spoke at COSCUP x RubyConf TW 2025 on "Trusting your AI models: building a secure cloud-native supply chain".',
  },
  {
    slug: "kubecon-india-2025",
    name: "KubeCon + CloudNativeCon India 2025",
    kind: "Conference",
    year: 2025,
    month: 8,
    day: 6,
    endDay: 7,
    place: "India",
    link: "https://www.youtube.com/watch?v=h-5ev1PdQ8U",
    logo: "/assets/logos/events/cncf.svg",
    brand: "#0086FF",
    image: "/assets/events/kubecon-india-2025/01.webp",
    summary:
      "At the booth at KubeCon + CloudNativeCon India 2025, meeting the cloud native community.",
  },
  {
    slug: "crush-conf",
    name: "Crush Conf",
    kind: "Conference",
    year: 2025,
    month: 5,
    day: 8,
    link: "https://www.crushconf.com/",
  },
  {
    slug: "ctencf-meetup",
    name: "cTENCF online meetup",
    kind: "Meetup",
    year: 2025,
    month: 11,
    day: 1,
    place: "Online",
  },
  {
    slug: "cloud-native-istanbul",
    name: "Cloud Native Istanbul at Amadeus Labs",
    kind: "Meetup",
    year: 2025,
    month: 9,
    approx: "Early September",
    place: "Istanbul",
    logo: "/assets/logos/events/cncf.svg",
    brand: "#0086FF",
  },
  {
    slug: "cncf-taiwan",
    name: "CNCF Taiwan meetup",
    kind: "Meetup",
    year: 2025,
    month: 8,
    day: 14,
    approx: "Around August 14",
    place: "Taiwan",
    logo: "/assets/logos/events/cncf.svg",
    brand: "#0086FF",
    image: "/assets/events/cncf-taiwan/01.webp",
    gallery: [
      "/assets/events/cncf-taiwan/01.webp",
      "/assets/events/cncf-taiwan/02.webp",
    ],
    summary:
      'Shivay Lamba on "Bringing Container-Native Simplicity to AI/ML workflows" with the CNCF Taiwan community.',
  },
  {
    slug: "gittogether",
    name: "GitTogether meetup",
    kind: "Meetup",
    year: 2025,
    month: 8,
    day: 8,
    logo: "/assets/logos/events/github.svg",
    brand: "#181717",
  },
  {
    slug: "bengaluru-cloud-ai",
    name: "Bengaluru Cloud and AI meetup",
    kind: "Meetup",
    year: 2025,
    month: 7,
    day: 27,
    place: "Bengaluru",
    image: "/assets/events/bengaluru-cloud-ai/01.webp",
    gallery: [
      "/assets/events/bengaluru-cloud-ai/01.webp",
      "/assets/events/bengaluru-cloud-ai/02.webp",
    ],
    summary:
      'Shivay Lamba on "Bringing Container-Native Simplicity to AI/ML workflows".',
  },
  {
    slug: "kubernetes-india-red-hat",
    name: "Kubernetes India meetup at Red Hat",
    kind: "Meetup",
    year: 2025,
    month: 4,
    approx: "Late April",
    place: "India",
    logo: "/assets/logos/events/kubernetes.svg",
    brand: "#326CE5",
    image: "/assets/events/kubernetes-india-red-hat/01.webp",
  },
  {
    slug: "pydata-global-2024",
    name: "PyData Global 2024",
    kind: "Conference",
    year: 2024,
    month: 12,
    place: "Online",
    image: "/assets/events/pydata-global-2024/01.webp",
    summary:
      'Shivay Lamba on "Streamlining AI development and deployment with KitOps".',
    logo: "/assets/logos/events/pydata.png",
  },
  {
    slug: "rejekts-na-2024",
    name: "Cloud Native Rejekts North America 2024",
    kind: "Conference",
    year: 2024,
    month: 11,
    place: "North America",
    logo: "/assets/logos/events/cncf.svg",
    brand: "#0086FF",
    image: "/assets/events/rejekts-na-2024/01.webp",
    summary:
      "A live demo on stage: an MLOps pipeline built with Dagger.io and KitOps.",
  },
];
