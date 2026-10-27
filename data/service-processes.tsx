import React from "react";
import {
  IconApi,
  IconBook,
  IconBulb,
  IconChartBar,
  IconFileDescription,
  IconRocket,
  IconSearch,
  IconSettingsCheck,
  IconUsers,
} from "@tabler/icons-react";

export const blogAsServiceProcess = [
    {
      name: "Topic",
      description:
        "We pick the right topic together: from your roadmap, your brief, or our research into what developers are searching for.",
      highlight: "the right topic",
      icon: IconSearch,
      details: [
        <p>Client-provided or Studio1-researched topics</p>,
        <p>Developer audience and search intent</p>,
        <p>Format and publishing-channel decision</p>,
        <p>Goal alignment before writing starts</p>,
      ],
    },
    {
      name: "Outline",
      description:
        "We prepare an outline and overview first, so your team can review the angle, structure, and examples early.",
      highlight: "an outline and overview first",
      icon: IconBulb,
      details: [
        <p>Article outline and technical flow</p>,
        <p>Code example plan</p>,
        <p>Product positioning notes</p>,
        <p>Client approval before full draft</p>,
      ],
    },
    {
      name: "Draft",
      description:
        "Studio1 writes the technical draft, reviews it internally, and sends it to your team for product and engineering feedback.",
      highlight: "the technical draft",
      icon: IconRocket,
      details: [
        <p>Code-rich technical writing</p>,
        <p>Internal review and technical validation</p>,
        <p>Client review and revision cycle</p>,
        <p>SEO and readability polish</p>,
      ],
    },
    {
      name: "Publish",
      description:
        "We help publish on your company channels, Studio1/team profiles, or approved developer platforms.",
      highlight: "company channels, Studio1/team profiles, or approved developer platforms",
      icon: IconChartBar,
      details: [
        <p>Company blog or external profile publishing</p>,
        <p>Dev.to and Medium syndication</p>,
        <p>X, LinkedIn, and community snippets</p>,
        <p>Performance review after publish</p>,
      ],
    },
  ];

export const blogAsServiceTeam = [
    {
      name: "Arindam Majumder",
      role: "Co-founder & Content Lead",
      image: "https://avatars.githubusercontent.com/u/109217591?v=4",
      bio: "Developer Advocate with expertise in technical writing and open-source. Has reached 270k+ developers through technical content, with notable contributions to Next.js and featured in their RC release blog. Specializes in creating developer-centric content that drives engagement and growth.",
      social: {
        twitter: "https://dub.sh/arindam-x",
        linkedin: "https://dub.sh/arindam-linkedin",
        website: "https://arindam-majumder.vercel.app",
      },
    },
    {
      name: "Amitesh Anand",
      role: "Co-founder & Operations Lead",
      image: "/assets/amitesh.webp",
      bio: "Technical writer and developer advocate with expertise in creating scalable content. Published 80k+ words reaching thousands of readers across major tech platforms. Nominated for Noonies 2022 Tech Awards, focused on delivering high-impact technical content.",
      social: {
        twitter: "https://mobile.twitter.com/astrodevil_",
        linkedin: "https://www.linkedin.com/in/amitesh1208/",
        website: "https://mranand.com/",
      },
    },
  ];

export const devRelAsServiceProcess = [
    {
      name: "Discovery",
      description:
        "We assess your product, developer audience, communities, open-source surface, and existing DevRel touchpoints.",
      highlight: "developer audience, communities, open-source surface",
      icon: IconSearch,
      details: [
        <p>Audit existing developer programs</p>,
        <p>Review docs, community, social, and GitHub signals</p>,
        <p>Identify growth and partnership opportunities</p>,
        <p>Provide an actionable assessment</p>,
      ],
    },
    {
      name: "Strategy",
      description:
        "We build a DevRel and growth roadmap across content, community, partnerships, integrations, launches, and events.",
      highlight: "a DevRel and growth roadmap",
      icon: IconBulb,
      details: [
        <p>Custom DevRel roadmap</p>,
        <p>Campaign and launch planning</p>,
        <p>Community and partner mapping</p>,
        <p>Success metrics definition</p>,
      ],
    },

    {
      name: "Creation",
      description:
        "Our writers, engineers, and DevRel operators execute the work: docs, blogs, demos, repos, social posts, and community programs.",
      highlight: "docs, blogs, demos, repos, social posts, and community programs",
      icon: IconRocket,
      details: [
        <p>Technical content and repo-led demos</p>,
        <p>Social and community management</p>,
        <p>Open-source maintenance support</p>,
        <p>Hackathon or event collaboration support</p>,
      ],
    },

    {
      name: "Amplification",
      description:
        "We distribute through developer communities, creators, events, partner channels, and social platforms, then iterate based on signals.",
      highlight: "developer communities, creators, events, partner channels, and social platforms",
      icon: IconChartBar,
      details: [
        <p>Creator and influencer management</p>,
        <p>Partner and community outreach</p>,
        <p>X, LinkedIn, Reddit, YouTube, and events</p>,
        <p>Performance reporting and iteration</p>,
      ],
    },
  ];

export const devRelAsServiceTeam = [
    {
      name: "Arindam Majumder",
      role: "Open source developer and DevRel",
      image: "https://avatars.githubusercontent.com/u/109217591?v=4",
      bio: "",
      social: {
        twitter: "https://dub.sh/arindam-x",
        linkedin: "https://dub.sh/arindam-linkedin",
        website: "https://www.arindammajumder.com/",
      },
    },
    {
      name: "Amitesh Anand",
      role: "Technical writer and DevRel",
      image: "/assets/amitesh.webp",
      bio: "",
      social: {
        twitter: "https://mobile.twitter.com/astrodevil_",
        linkedin: "https://www.linkedin.com/in/amitesh1208/",
        website: "https://mranand.com/",
      },
    },
    {
      name: "Shivay Lamba",
      role: "ML Engineer and Open source advocate",
      image: "https://avatars.githubusercontent.com/u/19529592?v=4",
      bio: "",
      social: {
        twitter: "https://x.com/HowDevelop",
        linkedin: "https://in.linkedin.com/in/shivaylamba",
        website: "https://shivaylamba.me",
      },
    },
  ];

export const docsAsServiceProcess = [
    {
      name: "Audit",
      description:
        "We review your existing docs, API and SDK references, onboarding path, dashboard flows, and developer-facing product surfaces.",
      highlight: "API and SDK references, onboarding path",
      icon: IconSearch,
      details: [
        <p>Existing docs assessment</p>,
        <p>API and SDK reference review</p>,
        <p>Dashboard and onboarding review</p>,
        <p>Goal alignment</p>,
      ],
    },
    {
      name: "Analysis",
      description:
        "We map what is missing, outdated, confusing, or blocking developers from first success.",
      highlight: "blocking developers from first success",
      icon: IconChartBar,
      details: [
        <p>Developer journey mapping</p>,
        <p>Missing docs and stale examples</p>,
        <p>API and SDK gap analysis</p>,
        <p>Priority friction ranking</p>,
      ],
    },
    {
      name: "Roadmap",
      description:
        "You get a findings report and prioritized plan for edits, new docs, IA fixes, examples, and onboarding improvements.",
      highlight: "a findings report and prioritized plan",
      icon: IconBulb,
      details: [
        <p>Findings report</p>,
        <p>Docs and DX priority plan</p>,
        <p>Actionable recommendations by severity</p>,
        <p>Implementation roadmap</p>,
      ],
    },
    {
      name: "Implementation",
      description:
        "We can edit existing docs, write missing docs from scratch, update examples, and support follow-up reviews.",
      highlight: "write missing docs from scratch",
      icon: IconRocket,
      details: [
        <p>Existing-doc edits</p>,
        <p>New docs from scratch</p>,
        <p>Example and snippet updates</p>,
        <p>Follow-up assessment</p>,
      ],
    },
  ];
