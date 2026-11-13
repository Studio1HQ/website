import { describe, expect, it } from "vitest";
import { bannerByKey, bannerFor, isEmailPipeline } from "@/lib/internal/email-banners";
import { composerTemplate, fillTemplate, renderEmail, senderName } from "@/lib/internal/email-templates";

describe("composerTemplate", () => {
  it("takes a template the pipeline has", () => {
    expect(composerTemplate("jobs", "invite")).toEqual({ pipeline: "jobs", key: "invite" });
    expect(composerTemplate("hackathons", "confirm")).toEqual({ pipeline: "hackathons", key: "confirm" });
    expect(composerTemplate("cohort", "custom")).toEqual({ pipeline: "cohort", key: "custom" });
  });

  it("means custom when no template is sent", () => {
    expect(composerTemplate("jobs", undefined)).toEqual({ pipeline: "jobs", key: "custom" });
  });

  it("refuses another pipeline's template, the automatic one and made-up keys", () => {
    expect(composerTemplate("jobs", "confirm")).toBeNull();
    expect(composerTemplate("jobs", "confirmation")).toBeNull();
    expect(composerTemplate("jobs", "constructor")).toBeNull();
    expect(composerTemplate("jobs", "__proto__")).toBeNull();
    expect(composerTemplate("jobs", 7)).toBeNull();
    expect(composerTemplate("jobs", "")).toBeNull();
  });

  it("refuses anything that isn't a pipeline", () => {
    expect(composerTemplate("subscribers", "custom")).toBeNull();
    expect(composerTemplate("constructor", "custom")).toBeNull();
    expect(composerTemplate(undefined, "custom")).toBeNull();
  });
});

describe("email banners", () => {
  it("only knows its own pipelines and keys", () => {
    expect(isEmailPipeline("jobs")).toBe(true);
    expect(isEmailPipeline("toString")).toBe(false);
    expect(bannerFor("jobs", "invite").key).toBe("jobs-invite");
    expect(bannerFor("jobs", "constructor")).toEqual(bannerFor("jobs", "custom"));
    expect(bannerFor("jobs", "__proto__").key).toBe("jobs-custom");
    expect(bannerByKey("jobs-constructor")).toBeNull();
    expect(bannerByKey("jobs-invite")?.title).toBe("Let's talk.");
  });
});

describe("senderName", () => {
  it("is the first name in the address", () => {
    expect(senderName("priya.sharma@studio1hq.com")).toBe("Priya");
    expect(senderName("arindam@studio1hq.com")).toBe("Arindam");
    expect(senderName("a.majumder@studio1hq.com")).toBe("Majumder");
  });

  it("falls back to Studio1", () => {
    expect(senderName("123@studio1hq.com")).toBe("Studio1");
  });
});

describe("email bodies", () => {
  const vars = { first_name: "Priya", program: "Growth Lead", sender: "Amit" };

  it("fills the three names and drops brackets from them", () => {
    expect(fillTemplate("Hi {first_name}, about {program}. {sender} {other}", vars)).toBe(
      "Hi Priya, about Growth Lead. Amit {other}",
    );
    expect(fillTemplate("{program}", { ...vars, program: "[x](https://evil.example)" })).toBe("x(https://evil.example)");
  });

  it("escapes what was typed and only links http(s)", () => {
    const { html, text } = renderEmail({
      body: "Hi <b>there</b> & \"you\"\n\n[site](https://example.com/a?b=1&c=2) [bad](javascript:alert(1))",
      call: { label: "Book a call", url: "https://cal.com/x\"><script>" },
      reason: "Because <reason>.",
      unsubscribeUrl: "https://www.studio1hq.com/unsubscribe?e=a%40b.co&t=x",
      banner: { pipeline: "jobs", template: "invite" },
      program: "<Growth>",
    });
    expect(html).not.toContain("<b>there</b>");
    expect(html).toContain("&#60;b&#62;there&#60;/b&#62; &#38; &#34;you&#34;");
    expect(html).toContain('<a href="https://example.com/a?b=1&#38;c=2"');
    expect(html).not.toContain('href="javascript:');
    expect(html).not.toContain("<script>");
    expect(html).toContain("Because &#60;reason&#62;.");
    expect(html).toContain("&#60;Growth&#62;");
    expect(text).toContain("site (https://example.com/a?b=1&c=2)");
  });
});
