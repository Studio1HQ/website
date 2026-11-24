import { describe, expect, it } from "vitest";
import { linkLabel, notePreview, noteParts } from "@/lib/internal/tasks/note-links";
import { engagementLabel } from "@/lib/internal/tasks/shared";

describe("linkLabel", () => {
  it("names a Notion page from its slug, without the page id", () => {
    expect(linkLabel("https://app.notion.com/p/studio1hq/Studio1-Backlink-Plan-41cc71f11048808ea885c4711a8921c9?source=copy_link")).toBe(
      "Notion · Studio1 Backlink Plan",
    );
    expect(linkLabel("https://www.notion.so/studio1hq/41bc71f110488015bfc8f4521436eb84?v=c69c")).toBe("Notion page");
  });

  it("keeps long names short", () => {
    const label = linkLabel(
      "https://accessible-mango-68a.notion.site/Building-an-Agent-That-Fixes-Itself-When-Its-Own-Tools-Break-42124bf1ea0e803b81a3efeb29d4c1a2",
    );
    expect(label.startsWith("Notion · Building an Agent")).toBe(true);
    expect(label.length).toBeLessThanOrEqual(48);
    expect(label.endsWith("…")).toBe(true);
  });

  it("names Google, GitHub, Slack and Claude links", () => {
    expect(linkLabel("https://docs.google.com/document/d/1VDK/edit?tab=t.0")).toBe("Google Doc");
    expect(linkLabel("https://docs.google.com/presentation/d/1ZK")).toBe("Google Slides");
    expect(linkLabel("https://github.com/Arindam200/awesome-ai-apps")).toBe("GitHub · Arindam200/awesome-ai-apps");
    expect(linkLabel("https://github.com/Studio1-OSS/Codetrail/pull/12")).toBe("GitHub · Studio1-OSS/Codetrail #12");
    expect(linkLabel("https://studio1hq-workspace.slack.com/archives/C0CJS737NTU/p179545")).toBe("Slack message");
    expect(linkLabel("https://claude.ai/artifact/7CVjJyWE44oqpGGZ1tyFmB?sk=x")).toBe("Claude artifact");
  });

  it("falls back to the site and the first part of the path", () => {
    expect(linkLabel("https://notes.wisprflow.ai/shared/XnEdvSt2d5q")).toBe("notes.wisprflow.ai/shared");
    expect(linkLabel("https://www.example.com/")).toBe("example.com");
  });
});

describe("noteParts", () => {
  it("splits text and links, leaving a full stop after a link as text", () => {
    expect(noteParts("review the PRs of this. https://github.com/a/b.")).toEqual([
      { text: "review the PRs of this. " },
      { url: "https://github.com/a/b", label: "GitHub · a/b" },
      { text: "." },
    ]);
  });

  it("keeps a bracket the link opened", () => {
    const [part] = noteParts("https://en.wikipedia.org/wiki/Foo_(bar)");
    expect(part).toEqual({ url: "https://en.wikipedia.org/wiki/Foo_(bar)", label: "en.wikipedia.org/wiki" });
  });

  it("leaves a note without links as one piece of text", () => {
    expect(noteParts("Sync with Arindam")).toEqual([{ text: "Sync with Arindam" }]);
  });

  it("previews a note on one line with the links named", () => {
    expect(notePreview("https://docs.google.com/document/d/1\n\nhttps://x.slack.com/archives/C1/p2")).toBe("Google Doc Slack message");
  });
});

describe("engagementLabel", () => {
  it("doesn't say the client twice", () => {
    expect(engagementLabel({ client: "Nebius Token Factory", name: "Nebius Token Factory DevRel", internal: false })).toBe(
      "Nebius Token Factory · DevRel",
    );
    expect(engagementLabel({ client: "Trina", name: "Trina-Launch", internal: false })).toBe("Trina · Launch");
    expect(engagementLabel({ client: "Jozu", name: "Jozu", internal: false })).toBe("Jozu");
  });

  it("keeps a name that doesn't start with the client, and Studio1's own", () => {
    expect(engagementLabel({ client: "Acme", name: "DevRel retainer", internal: false })).toBe("Acme · DevRel retainer");
    expect(engagementLabel({ client: "Studio1", name: "Blog & socials", internal: true })).toBe("Studio1 · Blog & socials");
  });
});
