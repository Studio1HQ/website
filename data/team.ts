/*
 * The Studio1 team, top to bottom. Add a person by filling in an open seat:
 * set their name, a portrait in /public/assets/team, named after them (made like the
 * founders' ones) and their links, then drop `open`.
 */

export type TeamMember = {
  /** Shown as the role on an open seat until someone takes it. */
  name?: string;
  role: string;
  /** Dithered portrait, ink dots on a transparent ground. */
  portrait?: string;
  links?: { x?: string; linkedin?: string; website?: string };
  /** A seat that isn't filled yet. */
  open?: boolean;
};

export type TeamTier = {
  title: string;
  description: string;
  members: TeamMember[];
};

export const TEAM: TeamTier[] = [
  {
    title: "Founders",
    description: "Set the direction and stay close to the work.",
    members: [
      {
        name: "Arindam Majumder",
        role: "Co-founder & Content Lead",
        portrait: "/assets/team/arindam-majumder.webp?v=9",
        links: {
          x: "https://dub.sh/arindam-x",
          linkedin: "https://dub.sh/arindam-linkedin",
          website: "https://www.arindammajumder.com",
        },
      },
      {
        name: "Amitesh Anand",
        role: "Co-founder & Operations Lead",
        portrait: "/assets/team/amitesh-anand.webp?v=9",
        links: {
          x: "https://x.com/astrodevil_",
          linkedin: "https://www.linkedin.com/in/amitesh1208/",
          website: "https://mranand.com/",
        },
      },
    ],
  },
  {
    title: "Founding team",
    description: "The first people who shaped how Studio1 works.",
    members: [
      {
        name: "Shivay Lamba",
        role: "Founding Team",
        portrait: "/assets/team/shivay-lamba.webp?v=9",
        links: {
          x: "https://x.com/HowDevelop",
          linkedin: "https://in.linkedin.com/in/shivaylamba",
          website: "https://shivaylamba.me",
        },
      },
      { role: "Head of Developer Relations", open: true },
      { role: "Head of Content", open: true },
    ],
  },
  {
    title: "Leads",
    description: "Own a craft and the people practising it.",
    members: [
      { role: "Technical Content Lead", open: true },
      { role: "DevRel Lead", open: true },
      { role: "Video Lead", open: true },
      { role: "Design Lead", open: true },
    ],
  },
  {
    title: "Team",
    description: "Write, build, film and ship for our clients every week.",
    members: [
      {
        name: "Kathank Raithatha",
        role: "Developer Advocate",
        portrait: "/assets/team/kathank-raithatha.webp?v=9",
      },
      {
        name: "Bhavya Bhardwaj",
        role: "Social Media",
        portrait: "/assets/team/bhavya-bhardwaj.webp?v=2",
      },
      {
        name: "Souradeep Pradhan",
        role: "Design Engineer",
        portrait: "/assets/team/souradeep-pradhan.webp?v=9",
      },
      { role: "Technical Writer", open: true },
      { role: "Video Producer", open: true },
      { role: "Community Manager", open: true },
      { role: "Growth Marketer", open: true },
      { role: "Operations", open: true },
    ],
  },
];
