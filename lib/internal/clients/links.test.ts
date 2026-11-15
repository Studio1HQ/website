import { describe, expect, it } from "vitest";
import {
  MAX_CLIENT_LINKS,
  MAX_LINK_LABEL,
  cleanLinks,
  guessGroup,
  readLinks,
} from "@/lib/internal/clients/links";

describe("readLinks", () => {
  it("treats a missing column or bad data as no links", () => {
    expect(readLinks(undefined)).toEqual([]);
    expect(readLinks(null)).toEqual([]);
    expect(readLinks("x")).toEqual([]);
  });

  it("keeps only web links, naming unnamed ones after the link", () => {
    expect(
      readLinks([
        { label: "Blog plan", url: "https://notion.so/plan" },
        { label: "Bad", url: "javascript:alert(1)" },
        { url: "https://drive.google.com/x" },
        "nope",
      ]),
    ).toEqual([
      { label: "Blog plan", url: "https://notion.so/plan", group: "doc" },
      {
        label: "https://drive.google.com/x",
        url: "https://drive.google.com/x",
        group: "doc",
      },
    ]);
  });
});

describe("cleanLinks", () => {
  it("keeps the order, drops blank rows and names a link without a name", () => {
    expect(
      cleanLinks([
        { label: " Blog plan  (Notion) ", url: "notion.so/plan" },
        { label: "", url: "" },
        { label: "", url: "https://www.example.com/cal" },
      ]),
    ).toEqual({
      ok: true,
      links: [
        {
          label: "Blog plan (Notion)",
          url: "https://notion.so/plan",
          group: "doc",
        },
        {
          label: "example.com",
          url: "https://www.example.com/cal",
          group: "company",
        },
      ],
    });
  });

  it("refuses non-web links, links with a key in them, and secrets", () => {
    expect(cleanLinks([{ label: "FTP", url: "ftp://x.com" }]).ok).toBe(false);
    expect(
      cleanLinks([{ label: "Drive", url: "https://x.com/?token=abc" }]).ok,
    ).toBe(false);
    expect(
      cleanLinks([{ label: "password: hunter2hunter2", url: "https://x.com" }])
        .ok,
    ).toBe(false);
    expect(cleanLinks([{ label: "Plan", url: "" }])).toEqual({
      ok: false,
      message: 'Add the link for "Plan".',
    });
  });

  it("allows at most twelve", () => {
    const many = Array.from({ length: MAX_CLIENT_LINKS + 1 }, (_, index) => ({
      label: `Link ${index}`,
      url: `https://example.com/${index}`,
    }));
    expect(cleanLinks(many).ok).toBe(false);
    expect(cleanLinks(many.slice(0, MAX_CLIENT_LINKS)).ok).toBe(true);
  });

  it("says why thirteen is refused, and doesn't count blank rows", () => {
    expect(MAX_CLIENT_LINKS).toBe(12);
    const many = Array.from({ length: 13 }, (_, index) => ({
      label: `Link ${index}`,
      url: `https://example.com/${index}`,
    }));
    expect(cleanLinks(many)).toEqual({
      ok: false,
      message: "Up to 12 links. Remove some first.",
    });
    const withBlank = [...many.slice(0, 12), { label: "", url: "" }];
    expect(cleanLinks(withBlank).ok).toBe(true);
  });

  it("refuses a name over the limit", () => {
    expect(MAX_LINK_LABEL).toBe(60);
    expect(
      cleanLinks([{ label: "a".repeat(61), url: "https://example.com" }]),
    ).toEqual({ ok: false, message: "Keep link names under 60 characters." });
    expect(
      cleanLinks([{ label: "a".repeat(60), url: "https://example.com" }]).ok,
    ).toBe(true);
  });
});

describe("readLinks: caps and junk", () => {
  it("stops at twelve", () => {
    const many = Array.from({ length: 15 }, (_, index) => ({
      label: `Link ${index}`,
      url: `https://example.com/${index}`,
    }));
    const read = readLinks(many);
    expect(read).toHaveLength(12);
    expect(read.at(-1)?.label).toBe("Link 11");
  });

  it("drops malformed entries without counting them", () => {
    const junk = [
      null,
      5,
      [],
      "https://example.com",
      { label: "No link" },
      { label: "Number", url: 5 },
      { label: "No scheme", url: "notion.so/plan" },
      { label: "FTP", url: "ftp://example.com/x" },
      { label: "Spaced", url: " https://example.com/x" },
    ];
    const good = Array.from({ length: 12 }, (_, index) => ({
      label: ` Link ${index} `,
      url: `https://example.com/${index}`,
    }));
    const read = readLinks([...junk, ...good, ...junk]);
    expect(read).toHaveLength(12);
    expect(read.every((link) => link.url.startsWith("https://"))).toBe(true);
    expect(read[0]).toEqual({
      label: "Link 0",
      url: "https://example.com/0",
      group: "company",
    });
    expect(readLinks([{ label: "   ", url: "https://x.com/a", group: "nope" }]))
      .toEqual([{ label: "https://x.com/a", url: "https://x.com/a", group: "company" }]);
  });
});

describe("link groups", () => {
  it("puts docs apart from the company's own links", () => {
    expect(guessGroup("https://app.notion.com/p/plan")).toBe("doc");
    expect(guessGroup("https://docs.google.com/document/d/x")).toBe("doc");
    expect(guessGroup("https://github.com/measure-sh/measure")).toBe("company");
    expect(guessGroup("https://measure.sh/")).toBe("company");
    expect(guessGroup("not a link")).toBe("company");
  });

  it("doesn't take a look-alike host for a doc", () => {
    expect(guessGroup("https://evilnotion.so/plan")).toBe("company");
    expect(guessGroup("https://notion.so.evil.com/plan")).toBe("company");
    expect(guessGroup("https://docs.google.com.evil.com/d/x")).toBe("company");
    expect(guessGroup("https://www.notion.so/plan")).toBe("doc");
    expect(guessGroup("https://acme.notion.site/plan")).toBe("doc");
    const clean = cleanLinks([
      { label: "Plan", url: "https://evilnotion.so/plan" },
    ]);
    expect(clean.ok && clean.links[0].group).toBe("company");
  });

  it("keeps the group someone picked", () => {
    expect(
      readLinks([
        { label: "Brand kit", url: "https://measure.sh/brand", group: "doc" },
      ])[0].group,
    ).toBe("doc");
    const clean = cleanLinks([
      {
        label: "Their Notion",
        url: "https://measure.notion.site",
        group: "company",
      },
    ]);
    expect(clean.ok && clean.links[0].group).toBe("company");
  });
});
