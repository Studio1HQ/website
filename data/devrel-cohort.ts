/**
 * Settings for the DevRel Cohort page (/devrel-cohort). Edit these when a
 * cohort's details are set; the page fills in or hides each detail to match.
 */

export type CohortStatus = "open" | "soon" | "closed";

export type CohortConfig = {
  /** Shown on the badge and in the apply section, e.g. "Cohort 01". */
  edition: string;
  status: CohortStatus;
  /** ISO date ("2026-12-07"). Empty shows "Announced soon". */
  startDate: string;
  /** ISO date. Empty shows "Rolling". */
  applyBy: string;
  /** Number of seats. 0 hides it. */
  seats: number;
  /** Expected time each week, e.g. "6–8 hrs/week". Empty hides it. */
  commitment: string;
  /** Where sessions happen, e.g. "Online". */
  format: string;
  /** How many top participants get Studio1 interviews. */
  interviewSlots: string;
};

export const COHORT: CohortConfig = {
  edition: "Cohort 01",
  status: "open",
  startDate: "",
  applyBy: "",
  seats: 0,
  commitment: "",
  format: "Online",
  interviewSlots: "3–5",
};

/** One week of the program: what it covers and what you ship. */
export type CohortWeek = {
  theme: string;
  /** One short word for the hero badge. */
  short: string;
  title: string;
  topics: string[];
  ship: string;
};

export const COHORT_WEEKS: CohortWeek[] = [
  {
    theme: "Foundations",
    short: "Basics",
    title: "What DevRel actually is",
    topics: [
      "The three jobs of DevRel: education, community and product feedback",
      "DevRel vs. developer marketing vs. developer experience",
      "How DevRel teams are structured, and how they're measured",
      "Reading a product the way a new developer does",
    ],
    ship: "A first-run teardown of a real devtool: how long it took to reach “hello world”, where you got stuck and what you would fix.",
  },
  {
    theme: "Build & write",
    short: "Build",
    title: "Technical content developers finish",
    topics: [
      "Picking topics developers actually search for",
      "Writing tutorials that run end to end",
      "Demo apps, sample repos and READMEs",
      "Docs and quickstarts that cut time to first success",
    ],
    ship: "A tutorial with a working GitHub repo, reviewed and edited by the Studio1 content team.",
  },
  {
    theme: "Show up",
    short: "Show up",
    title: "Video, community and distribution",
    topics: [
      "Recording short demo videos and live-coding sessions",
      "Where developers spend time: Reddit, X, Hacker News, Discord, GitHub",
      "Sharing work in communities without spamming them",
      "Talks, meetups and live streams",
    ],
    ship: "A demo video of your week-two project, shared in at least two developer communities.",
  },
  {
    theme: "Launch & land",
    short: "Launch",
    title: "Launches, metrics and your DevRel career",
    topics: [
      "Planning a developer launch: Product Hunt, Show HN and GitHub",
      "The numbers DevRel teams report: activation, stars, signups, reach",
      "Turning community feedback into product input",
      "Building a DevRel portfolio and preparing for interviews",
    ],
    ship: "A launch plan for a real devtool, presented to the Studio1 team on demo day.",
  },
];

export type CohortFaq = { question: string; answer: string };

export const COHORT_FAQS: CohortFaq[] = [
  {
    question: "Who runs the DevRel Cohort?",
    answer:
      "The Studio1 team. We write tutorials, build demos, record videos, run launches and manage developer communities for devtool, AI and open-source companies, and we teach the cohort from that work.",
  },
  {
    question: "Do I need DevRel experience to apply?",
    answer:
      "No. You need to be comfortable with code, curious about developer tools and ready to ship something public every week. Link to anything you have built, written or recorded, even if it is small.",
  },
  {
    question: "Is a job guaranteed at the end?",
    answer: `No. The top ${COHORT.interviewSlots} participants get interview opportunities at Studio1, and we refer strong participants to companies in our partner network. Hiring depends on open roles and on each company's own process.`,
  },
  {
    question: "How are participants selected?",
    answer:
      "We read every application and look closely at the work you link to. Shortlisted applicants have a short chat with the team before we confirm seats.",
  },
  {
    question: "Where does the cohort happen?",
    answer: `${COHORT.format}. Live sessions, reviews and the cohort community all run online, so you can join from anywhere.`,
  },
  {
    question: "Which companies are in the partner network?",
    answer:
      "Devtool, AI and open-source companies that Studio1 works with. Referrals depend on who is hiring when the cohort ends and whose work fits the role.",
  },
  {
    question: "What will I have at the end of the month?",
    answer:
      "Four pieces of public work: a product teardown, a tutorial with a working repo, a demo video and a launch plan. That is the kind of proof DevRel hiring managers ask for.",
  },
  {
    question: "How do I apply?",
    answer:
      "Use the Apply section at the bottom of this page. Tell us who you are, link to something you have built, written or recorded, and tell us why you want to do DevRel. It takes about five minutes.",
  },
];
