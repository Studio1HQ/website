/**
 * Studio1 Hackathons: every event shown on /hackathons and its own page.
 *
 * DRAFT: the route is hidden (noindex, not in the sitemap or nav) and every
 * entry below is a placeholder. Swap in real events as partners sign on.
 *
 * Adding one: the community manager opens a "New hackathon" issue
 * (.github/ISSUE_TEMPLATE/new-hackathon.yml; their guide is the dashboard's
 * /internal/hackathons/setup). To build it:
 *  1. Add `hackathon({ ... })` to HACKATHONS (not `placeholder()`). The slug
 *     is the page URL and is saved with every registration, so never change
 *     it once people have registered.
 *  2. Leave out tasks, timeline, deliverables, judging, rules and FAQs to
 *     get the standard ones. To add to them, spread the defaults, e.g.
 *     `tasks: [...DEFAULT_TASKS, { id: "star-acme", ... }]`.
 *  3. Extra form questions go in `questions`; their ids are stored with the
 *     answers, so never rename or reuse one. A task that needs proof (a
 *     sponsor wants to know who did it) also gets a "short" question asking
 *     for that link or username. Choice and yes/no questions become
 *     breakdowns in the dashboard's sponsor report.
 *  4. Keep the timeline milestone labelled WINNERS_MILESTONE: the
 *     dashboard's email plan dates the results email from it (or from
 *     endDate + 7 without one).
 *  5. `pnpm test`, check /hackathons/<slug> and its form, open a PR that
 *     links the issue, and comment the preview link on the issue so the
 *     community manager can check it.
 *  6. With the first real event, delete the placeholders below.
 */

export type HackathonFormat = "online" | "in-person" | "hybrid";

export type HackathonPartner = {
  name: string;
  role: "Host partner" | "Track sponsor" | "Community partner";
  href?: string;
};

export type HackathonPrize = {
  title: string;
  amount: string;
  description: string;
};

export type HackathonTrack = { name: string; description: string };

export type HackathonMilestone = {
  /** YYYY-MM-DD */
  date: string;
  label: string;
  description: string;
};

/** A pre-hack task. Finishing all of them means the participant is ready. */
export type HackathonTask = {
  id: string;
  label: string;
  description: string;
  href?: string;
  /** Shown instead of a link when there is nothing to open yet. */
  note?: string;
};

/**
 * An extra question on one hackathon's registration form, asked after the
 * standard fields. `id` is saved with every answer, so never rename or reuse
 * one once people have registered; add a new question instead.
 */
export type HackathonQuestion = {
  id: string;
  label: string;
  /**
   * short: one line (up to 200 characters). long: a paragraph (up to 1,000).
   * choice: one of `options`. yesno: Yes or No.
   */
  type: "short" | "long" | "choice" | "yesno";
  /** The answers to pick from, for "choice". */
  options?: string[];
  required?: boolean;
  hint?: string;
};

export type HackathonCriterion = {
  name: string;
  /** Percent of the total score. */
  weight: number;
  description: string;
};

export type HackathonFaq = { question: string; answer: string };

export type CoverTone = "print" | "night" | "paper";
export type CoverPattern = "grid" | "rings" | "dots" | "bars";

export type Hackathon = {
  slug: string;
  name: string;
  tagline: string;
  /** One line for cards: the prize pool or the headline perk. */
  summary: string;
  description: string;
  /** YYYY-MM-DD, first building day. */
  startDate: string;
  /** YYYY-MM-DD, last building day (submissions close at its end). */
  endDate: string;
  /** YYYY-MM-DD, last day to register. */
  registrationCloses: string;
  format: HackathonFormat;
  location: string;
  /** Total prize pool in US dollars. */
  prizePoolUsd: number;
  teamSize: string;
  themes: string[];
  cover: { tone: CoverTone; pattern: CoverPattern };
  /** External registration (Luma, Devpost). Replaces the on-page form. */
  registerUrl?: string;
  partners: HackathonPartner[];
  prizes: HackathonPrize[];
  tracks: HackathonTrack[];
  timeline: HackathonMilestone[];
  tasks: HackathonTask[];
  deliverables: string[];
  judging: HackathonCriterion[];
  rules: string[];
  faqs: HackathonFaq[];
  /** This event's own questions, added to the standard registration form. */
  questions?: HackathonQuestion[];
  /** Placeholder content, not a confirmed event. */
  placeholder: boolean;
};

/* ------------------------------------------------------------------ */
/* Shared defaults: most events reuse these and override what differs  */
/* ------------------------------------------------------------------ */

/** Label of the milestone that announces winners; pages look it up by this. */
export const WINNERS_MILESTONE = "Winners announced";

function addDays(date: string, days: number) {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function defaultTimeline(
  start: string,
  end: string,
  registrationCloses: string,
): HackathonMilestone[] {
  const milestones: HackathonMilestone[] = [
    {
      date: registrationCloses,
      label: "Registration closes",
      description: "Last day to register and finish the pre-hack tasks.",
    },
    {
      date: start,
      label: "Kickoff",
      description: "Live kickoff stream: tracks, starter repos, and Q&A.",
    },
    {
      date: end,
      label: "Submissions close",
      description: "Projects and demo videos due by 23:59 UTC.",
    },
    {
      date: addDays(end, 3),
      label: "Judging",
      description: "Judges and partner engineers score every valid entry.",
    },
    {
      date: addDays(end, 7),
      label: WINNERS_MILESTONE,
      description: "Results posted here and on Studio1's socials.",
    },
  ];
  // Late registration can close after kickoff, so keep the dates in order.
  return milestones.sort((a, b) => a.date.localeCompare(b.date));
}

const DEFAULT_TASKS: HackathonTask[] = [
  {
    id: "register",
    label: "Submit the registration form",
    description: "One form per person, even if you join as a team.",
  },
  {
    id: "community",
    label: "Join the hackathon Discord",
    description:
      "Announcements, mentor office hours, and team matching happen here.",
    note: "Invite is shared with registered participants",
  },
  {
    id: "follow",
    label: "Follow Studio1 on X",
    description: "We post schedule changes, resources, and winners there.",
    href: "https://x.com/Studio1HQ",
  },
  {
    id: "quickstart",
    label: "Run the partner quickstart",
    description:
      "Get the partner's starter project running locally before kickoff.",
    note: "Starter repo is shared at kickoff",
  },
  {
    id: "rules",
    label: "Read the rules and judging criteria",
    description: "Know what counts as a valid submission before you build.",
    href: "#rules",
  },
];

const DEFAULT_DELIVERABLES = [
  "A public GitHub repository with a clear README and setup steps",
  "A demo video, 3 minutes or less, showing the project working",
  "A short write-up: the problem, how you built it, and what's next",
  "The track you're entering and every team member's GitHub handle",
  "A live link or deploy, if the project has a web interface",
];

const DEFAULT_JUDGING: HackathonCriterion[] = [
  {
    name: "Usefulness",
    weight: 30,
    description: "Does it solve a real problem developers have?",
  },
  {
    name: "Technical execution",
    weight: 30,
    description: "Does it work, and is the code something you'd ship?",
  },
  {
    name: "Use of the partner's product",
    weight: 25,
    description: "Is the partner's tool central to the build, not bolted on?",
  },
  {
    name: "Demo and write-up",
    weight: 15,
    description: "Could another developer understand and run it?",
  },
];

const DEFAULT_RULES = [
  "All code must be written during the hackathon. Libraries, frameworks, and starter repos are fine.",
  "AI coding tools are allowed. You must understand and be able to explain everything you submit.",
  "One submission per team. You can update it until submissions close.",
  "Projects must be original. Reused or plagiarised projects are disqualified.",
  "You keep the IP in what you build. Partners may feature winning projects with credit.",
  "Follow the code of conduct in every channel. Harassment means removal.",
];

const DEFAULT_FAQS: HackathonFaq[] = [
  {
    question: "Does it cost anything to join?",
    answer: "No. Studio1 hackathons are free for participants.",
  },
  {
    question: "Do I need experience with the partner's product?",
    answer:
      "No. The pre-hack tasks get you through the quickstart, and mentors run office hours during the build window.",
  },
  {
    question: "Can I use AI coding tools?",
    answer:
      "Yes. Use whatever tools you like, as long as you understand and can explain the code you submit.",
  },
  {
    question: "How are prizes paid out?",
    answer:
      "Cash prizes are paid after winners are announced and verified, usually within 30 days. Product credits are sent by the partner.",
  },
  {
    question: "Who owns what I build?",
    answer:
      "You do. Partners may feature winning projects in their content, always with credit to the team.",
  },
];

type HackathonInput = Omit<
  Hackathon,
  | "timeline"
  | "tasks"
  | "deliverables"
  | "judging"
  | "rules"
  | "faqs"
  | "registrationCloses"
  | "placeholder"
> &
  Partial<
    Pick<
      Hackathon,
      | "timeline"
      | "tasks"
      | "deliverables"
      | "judging"
      | "rules"
      | "faqs"
      | "registrationCloses"
    >
  >;

/** The team rule and FAQ answer, worded from the event's team size. */
function teamCopy(teamSize: string) {
  const size = teamSize.replace(/ people$/, "");
  const minimum = Number(size.match(/^\d+/)?.[0] ?? 1);
  if (teamSize.toLowerCase() === "solo") {
    return {
      rule: "Solo entries only. One registration per person.",
      answer: "Yes. This one is solo only, so everyone builds on their own.",
    };
  }
  return {
    rule: `Teams of ${size} people. Everyone on the team registers individually.`,
    answer:
      minimum > 1
        ? `No. Teams are ${size} people. Find teammates in the Discord's team-matching channel.`
        : `Yes. Build alone or in a team of ${size} people, and find teammates in the Discord's team-matching channel.`,
  };
}

function placeholder(input: HackathonInput): Hackathon {
  const registrationCloses =
    input.registrationCloses ?? addDays(input.startDate, -1);
  return {
    timeline: defaultTimeline(
      input.startDate,
      input.endDate,
      registrationCloses,
    ),
    tasks: DEFAULT_TASKS,
    deliverables: DEFAULT_DELIVERABLES,
    judging: DEFAULT_JUDGING,
    rules: [teamCopy(input.teamSize).rule, ...DEFAULT_RULES],
    faqs: [
      DEFAULT_FAQS[0],
      { question: "Can I join solo?", answer: teamCopy(input.teamSize).answer },
      ...DEFAULT_FAQS.slice(1),
    ],
    ...input,
    registrationCloses,
    placeholder: true,
  };
}

/**
 * A real, confirmed event: the same standard tasks, timeline, rules,
 * judging and FAQs as a placeholder, for whatever the entry leaves out.
 */
export function hackathon(input: HackathonInput): Hackathon {
  return { ...placeholder(input), placeholder: false };
}

/** Partner slots still open on a placeholder event. */
const OPEN_SLOTS: HackathonPartner[] = [
  { name: "Your company", role: "Host partner" },
  { name: "Your company", role: "Track sponsor" },
  { name: "Your community", role: "Community partner" },
];

/* ------------------------------------------------------------------ */
/* Events (placeholders)                                               */
/* ------------------------------------------------------------------ */

export const HACKATHONS: Hackathon[] = [
  placeholder({
    slug: "docs-sprint",
    name: "Docs Sprint",
    tagline: "Fix the docs developers actually read.",
    summary: "$5,000 in prizes for the best docs and quickstart fixes",
    description:
      "Three weeks to find the gaps in open-source documentation and fix them: broken quickstarts, missing examples, and guides that stop one step short. Every merged docs PR counts, and the best rewrites win.",
    startDate: "2026-10-26",
    endDate: "2026-11-15",
    registrationCloses: "2026-11-08",
    format: "online",
    location: "Remote",
    prizePoolUsd: 5000,
    teamSize: "1–2 people",
    themes: ["Documentation", "Open source", "DX"],
    cover: { tone: "night", pattern: "grid" },
    partners: OPEN_SLOTS,
    prizes: [
      {
        title: "Best rewrite",
        amount: "$2,000",
        description:
          "The docs rewrite that most improves time to first success.",
      },
      {
        title: "Most merged PRs",
        amount: "$1,500",
        description: "The participant with the most merged docs contributions.",
      },
      {
        title: "Best new example",
        amount: "$1,000",
        description: "A runnable example or tutorial a project didn't have.",
      },
      {
        title: "Merged PR raffle",
        amount: "$50 × 10",
        description: "Ten merged PRs picked at random.",
      },
    ],
    tracks: [
      {
        name: "Quickstart rescue",
        description:
          "Take a quickstart that fails on a clean machine and make it work end to end.",
      },
      {
        name: "Missing examples",
        description:
          "Add runnable examples for features that only have API reference.",
      },
      {
        name: "Docs audit",
        description:
          "Audit a project's docs against its README and file the gaps as issues.",
      },
    ],
    deliverables: [
      "Links to your merged or open docs pull requests",
      "A before-and-after note for each change: what was broken and what you fixed",
      "Your GitHub handle, matching the account on the pull requests",
    ],
  }),
  placeholder({
    slug: "agents-in-production",
    name: "Agents in Production",
    tagline: "Ship an AI agent that survives real users.",
    summary: "$10,000 in prizes plus partner credits",
    description:
      "Most agent demos break the moment a real user touches them. Spend two weeks building one that doesn't: evals, retries, tool calls that fail gracefully, and observability you'd trust in production.",
    startDate: "2026-11-23",
    endDate: "2026-12-06",
    format: "online",
    location: "Remote",
    prizePoolUsd: 10000,
    teamSize: "1–4 people",
    themes: ["AI agents", "Evals", "Observability"],
    cover: { tone: "print", pattern: "rings" },
    partners: OPEN_SLOTS,
    prizes: [
      {
        title: "First place",
        amount: "$5,000",
        description: "Best overall agent, judged on every criterion.",
      },
      {
        title: "Second place",
        amount: "$2,500",
        description: "Runner-up across all tracks.",
      },
      {
        title: "Third place",
        amount: "$1,500",
        description: "Third across all tracks.",
      },
      {
        title: "Best evals",
        amount: "$1,000",
        description: "The most convincing eval suite for an agent.",
      },
    ],
    tracks: [
      {
        name: "Reliable tool use",
        description:
          "Agents that call real APIs, handle failures, and recover without a human.",
      },
      {
        name: "Evals that matter",
        description: "Test suites that catch regressions before your users do.",
      },
      {
        name: "Agent observability",
        description:
          "Traces, costs, and dashboards that explain what an agent did and why.",
      },
    ],
    // PLACEHOLDER questions, to show how an event adds its own.
    questions: [
      {
        id: "framework",
        label: "Which agent framework do you use most?",
        type: "choice",
        options: ["LangGraph", "CrewAI", "OpenAI Agents SDK", "Mastra", "My own", "None yet"],
        required: true,
      },
      {
        id: "shipped-agent",
        label: "Have you shipped an agent that real users rely on?",
        type: "yesno",
      },
      {
        id: "college",
        label: "College or company",
        type: "short",
        hint: "Helps us plan campus meetups.",
      },
    ],
  }),
  placeholder({
    slug: "open-source-winter",
    name: "Open Source Winter",
    tagline: "A month of merged pull requests.",
    summary: "$4,000 in prizes for merged contributions",
    description:
      "Spend December contributing to devtool projects that want the help. Maintainers tag the issues, you pick one, get assigned, and ship it. Merged PRs and the write-ups behind them are what count.",
    startDate: "2026-12-01",
    endDate: "2026-12-31",
    registrationCloses: "2026-12-20",
    format: "online",
    location: "Remote",
    prizePoolUsd: 4000,
    teamSize: "Solo",
    themes: ["Open source", "First contributions"],
    cover: { tone: "night", pattern: "dots" },
    partners: OPEN_SLOTS,
    prizes: [
      {
        title: "Top contributor",
        amount: "$2,000",
        description: "Most merged contributions across partner repos.",
      },
      {
        title: "Best write-up",
        amount: "$1,000",
        description: "The clearest blog post about a contribution.",
      },
      {
        title: "Merged PR raffle",
        amount: "$100 × 10",
        description: "Ten merged PRs picked at random.",
      },
    ],
    tracks: [
      {
        name: "Good first issues",
        description: "Scoped issues maintainers have tagged for newcomers.",
      },
      {
        name: "Integrations",
        description:
          "Connectors and plugins that link a project to other tools.",
      },
    ],
  }),
  placeholder({
    slug: "ship-it-weekend",
    name: "Ship It Weekend",
    tagline: "48 hours, one room, a working product.",
    summary: "$7,500 in prizes and demo slots with partner teams",
    description:
      "An in-person build weekend for developers who want to ship something end to end. Partner engineers are in the room, food is on us, and every finished project gets a demo slot on Sunday.",
    startDate: "2027-01-16",
    endDate: "2027-01-17",
    format: "in-person",
    location: "Bengaluru, India",
    prizePoolUsd: 7500,
    teamSize: "2–4 people",
    themes: ["Full stack", "Devtools"],
    cover: { tone: "paper", pattern: "bars" },
    partners: OPEN_SLOTS,
    prizes: [
      {
        title: "Best in show",
        amount: "$4,000",
        description: "The project the judges would use tomorrow.",
      },
      {
        title: "Runner-up",
        amount: "$2,000",
        description: "Second place overall.",
      },
      {
        title: "Audience pick",
        amount: "$1,500",
        description: "Voted by everyone in the room at demo time.",
      },
    ],
    tracks: [
      {
        name: "Developer tools",
        description: "CLIs, extensions, and tools that make developers faster.",
      },
      {
        name: "Open track",
        description: "Anything you can build and demo in 48 hours.",
      },
    ],
  }),
  placeholder({
    slug: "mcp-build-week",
    name: "MCP Build Week",
    tagline: "Give AI assistants new tools.",
    summary: "$8,000 in prizes across three tracks",
    description:
      "A week to build Model Context Protocol servers that connect AI assistants to the tools developers already use. Join online or at the in-person kickoff, then build from anywhere.",
    startDate: "2027-02-08",
    endDate: "2027-02-14",
    format: "hybrid",
    location: "San Francisco + online",
    prizePoolUsd: 8000,
    teamSize: "1–3 people",
    themes: ["MCP", "AI tooling"],
    cover: { tone: "print", pattern: "grid" },
    partners: OPEN_SLOTS,
    prizes: [
      {
        title: "First place",
        amount: "$4,000",
        description: "Best MCP server overall.",
      },
      {
        title: "Best developer tool",
        amount: "$2,000",
        description: "The server developers would install first.",
      },
      {
        title: "Best data connector",
        amount: "$2,000",
        description: "The most useful connection to a data source.",
      },
    ],
    tracks: [
      {
        name: "Developer workflow",
        description: "Servers for repos, CI, issue trackers, and docs.",
      },
      {
        name: "Data connectors",
        description: "Servers that give assistants safe access to data.",
      },
      {
        name: "Wild card",
        description: "Anything else an assistant should be able to do.",
      },
    ],
  }),
  placeholder({
    slug: "demo-day-remix",
    name: "Demo Day Remix",
    tagline: "Rebuild a launch demo in a weekend.",
    summary: "$3,000 in prizes for the best demo videos",
    description:
      "Pick a devtool, build the demo its launch deserved, and record it. Judged on clarity, how fast a developer gets the point, and whether the code runs.",
    startDate: "2026-09-12",
    endDate: "2026-09-14",
    format: "online",
    location: "Remote",
    prizePoolUsd: 3000,
    teamSize: "1–3 people",
    themes: ["Video", "Demos"],
    cover: { tone: "paper", pattern: "rings" },
    partners: OPEN_SLOTS,
    prizes: [
      {
        title: "Best demo",
        amount: "$1,500",
        description: "The clearest demo of a developer tool.",
      },
      {
        title: "Runner-up",
        amount: "$1,000",
        description: "Second place overall.",
      },
      {
        title: "Best short",
        amount: "$500",
        description: "The best demo under 60 seconds.",
      },
    ],
    tracks: [
      {
        name: "Product demo",
        description: "A 3-minute walkthrough of a real workflow.",
      },
      {
        name: "Shorts",
        description: "A vertical demo under 60 seconds.",
      },
    ],
  }),
  placeholder({
    slug: "hello-world-hack",
    name: "Hello World Hack",
    tagline: "The first Studio1 hackathon.",
    summary: "$2,000 in prizes for first-time builders",
    description:
      "A beginner-friendly weekend for developers building and shipping their first public project, with mentors on call the whole time.",
    startDate: "2026-07-18",
    endDate: "2026-07-19",
    format: "hybrid",
    location: "Bengaluru + online",
    prizePoolUsd: 2000,
    teamSize: "1–4 people",
    themes: ["Beginners", "Open track"],
    cover: { tone: "night", pattern: "bars" },
    partners: OPEN_SLOTS,
    prizes: [
      {
        title: "First place",
        amount: "$1,000",
        description: "Best project overall.",
      },
      {
        title: "Best first project",
        amount: "$500",
        description: "Best project from a first-time hackathon team.",
      },
      {
        title: "Best README",
        amount: "$500",
        description: "The repo another developer could run fastest.",
      },
    ],
    tracks: [
      {
        name: "Open track",
        description: "Build anything and ship it publicly.",
      },
    ],
  }),
];

export function getHackathon(slug: string) {
  return HACKATHONS.find((hackathon) => hackathon.slug === slug);
}

/* ------------------------------------------------------------------ */
/* Track record: hackathons Studio1 partnered on before running its own */
/* ------------------------------------------------------------------ */

export type PastPartnership = {
  /** The hackathon's name. */
  name: string;
  city: string;
  /** City coordinates, for the pin on the India map. */
  lat: number;
  lng: number;
  year: number;
  /** What Studio1 did there. */
  role:
    "Community partner" | "Sponsor" | "Mentors & judges" | "Workshop partner";
  href?: string;
  /** Placeholder entry, not a confirmed partnership. */
  placeholder?: boolean;
};

// PLACEHOLDERS: replace with the real hackathons, cities, years and roles.
export const PAST_PARTNERSHIPS: PastPartnership[] = [
  {
    name: "Student hackathon",
    city: "Bengaluru",
    lat: 12.9716,
    lng: 77.5946,
    year: 2026,
    role: "Mentors & judges",
    placeholder: true,
  },
  {
    name: "AI build weekend",
    city: "Delhi NCR",
    lat: 28.6139,
    lng: 77.209,
    year: 2026,
    role: "Community partner",
    placeholder: true,
  },
  {
    name: "College hackfest",
    city: "Mumbai",
    lat: 19.076,
    lng: 72.8777,
    year: 2025,
    role: "Workshop partner",
    placeholder: true,
  },
  {
    name: "Open-source sprint",
    city: "Pune",
    lat: 18.5204,
    lng: 73.8567,
    year: 2025,
    role: "Sponsor",
    placeholder: true,
  },
  {
    name: "Developer hackathon",
    city: "Hyderabad",
    lat: 17.385,
    lng: 78.4867,
    year: 2025,
    role: "Mentors & judges",
    placeholder: true,
  },
  {
    name: "Campus hackathon",
    city: "Chennai",
    lat: 13.0827,
    lng: 80.2707,
    year: 2024,
    role: "Community partner",
    placeholder: true,
  },
  {
    name: "Web hackathon",
    city: "Kolkata",
    lat: 22.5726,
    lng: 88.3639,
    year: 2024,
    role: "Workshop partner",
    placeholder: true,
  },
  {
    name: "Startup hackathon",
    city: "Jaipur",
    lat: 26.9124,
    lng: 75.7873,
    year: 2024,
    role: "Mentors & judges",
    placeholder: true,
  },
];
