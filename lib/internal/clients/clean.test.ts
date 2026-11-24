import { describe, expect, it } from "vitest";
import {
  cleanBlock,
  cleanClient,
  cleanDeliverable,
  cleanEngagement,
  cleanInvoice,
  cleanMove,
  cleanPerson,
  cleanScopeLine,
  cleanTemplateLines,
  cleanUrl,
  cleanWeek,
  looksLikeSecret,
  slugify,
  uniqueSlug,
} from "@/lib/internal/clients/clean";

const CYCLE = "11111111-1111-4111-8111-111111111111";
const CLIENT = "22222222-2222-4222-8222-222222222222";

describe("links", () => {
  it("takes http(s) links only, adding https to bare ones", () => {
    expect(cleanUrl("docs.google.com/document/d/abc")).toBe(
      "https://docs.google.com/document/d/abc",
    );
    expect(cleanUrl("http://example.com/a")).toBe("http://example.com/a");
    expect(cleanUrl("")).toBeNull();
    expect(cleanUrl("javascript:alert(1)")).toBeUndefined();
    expect(cleanUrl("ftp://example.com")).toBeUndefined();
    expect(cleanUrl("localhost")).toBeUndefined();
  });

  it("refuses links that carry a login or a key", () => {
    expect(cleanUrl("https://user:pass@example.com")).toBeUndefined();
    expect(cleanUrl("https://api.example.com/x?token=abc")).toBeUndefined();
    expect(
      cleanUrl("https://bucket.s3.amazonaws.com/f?X-Amz-Signature=abc"),
    ).toBeUndefined();
    expect(cleanUrl("https://example.com/post?utm_source=x")).toBe(
      "https://example.com/post?utm_source=x",
    );
  });
});

describe("links: keys, logins and ordinary links", () => {
  it("refuses a token, secret or signature in the query or fragment", () => {
    for (const link of [
      "https://app.x.com/cb#access_token=abc123456",
      "https://app.x.com/cb?client_secret=abcdefgh",
      "https://gitlab.com/api/v4/projects?private_token=glpat-abcdefghijklmnop",
      "https://app.x.com/?jwt=eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.abcdefghijklmnop",
      "https://bucket.s3.amazonaws.com/f?X-Amz-Signature=abc",
    ])
      expect(cleanUrl(link), link).toBeUndefined();
  });

  it("refuses a login in the link and anything but http(s)", () => {
    for (const link of [
      "user:pass@host",
      "user:pass@example.com",
      "https://user:pass@example.com/x",
      "javascript:alert(1)",
      "JavaScript:alert(1)",
      "ftp://example.com/file",
    ])
      expect(cleanUrl(link), link).toBeUndefined();
  });

  it("keeps ordinary links as they are", () => {
    for (const link of [
      "https://www.notion.so/acme/Launch-plan-1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d?v=0123456789abcdef0123456789abcdef",
      "https://docs.google.com/document/d/1AbCdEfGhIjKlMnOpQrStUvWxYz0123456789/edit?tab=t.0#heading=h.abc123",
      "https://drive.google.com/file/d/1a2B3c4D5e6F7g8H9i0J/view?usp=sharing&resourcekey=0-abc",
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42s",
      "https://x.com/studio1hq/status/1856789012345678901",
      "https://twitter.com/studio1hq/status/1856789012345678901",
      "https://github.com/acme/docs/pull/123",
      "https://dev.to/studio1/how-we-ship-docs-4k2j",
      "https://medium.com/@studio1/how-to-write-a-launch-post-3f2a1b4c5d6e",
      "https://example.com/post?utm_source=newsletter&utm_campaign=launch",
      "https://example.com/blog/api-key-rotation-guide",
    ])
      expect(cleanUrl(link), link).toBe(link);
  });
});

describe("secrets: each shape", () => {
  it("spots every documented key shape", () => {
    for (const text of [
      "-----BEGIN PRIVATE KEY-----",
      "-----BEGIN OPENSSH PRIVATE KEY-----",
      "sk_live_abcdefghijklmnop1234",
      "pk_test_abcdefghijklmnop1234",
      "rk_live_abcdefghijklmnop1234",
      "sk-abcdefghijklmnop1234",
      "gho_abcdefghijklmnopqrstuvwxyz",
      "ghs_abcdefghijklmnopqrstuvwxyz",
      "github_pat_11ABCDEFG0abcdefghijklmnop",
      "xoxp-1234567890-abcdef",
      "AKIAIOSFODNN7EXAMPLE",
      "AIzaSyA1234567890abcdefghijklmnopqrs",
      "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.abcdefghijklmnop",
      "api_key=abcdef123456",
      "API key: abcdef123456",
      "secret = abcdef123456",
      "token: abcdef123456",
      "pwd=hunter22",
    ])
      expect(looksLikeSecret(text), text).toBe(true);
  });

  // The (sk)-(ant|proj) pattern wants 16 plain letters/digits right after the
  // prefix, so "sk-ant-api03-…" and "sk-proj-AbCdEfGh_…" are missed today.
  it("spots keys with dashes or underscores inside", () => {
    expect(looksLikeSecret("sk-ant-api03-AbCdEfGh1234-IjKlMnOp5678_QrSt")).toBe(true);
    expect(looksLikeSecret("sk-proj-AbCd_EfGhIjKl1234MnOpQrSt5678")).toBe(true);
    expect(looksLikeSecret("https://example.com/blog/sk-learn-pipelines-for-beginners")).toBe(false);
  });

  it("leaves prose about tokens and passwords alone", () => {
    expect(looksLikeSecret("A post on the token economy for AI agents")).toBe(
      false,
    );
    expect(looksLikeSecret("Covers the password reset flow end to end")).toBe(
      false,
    );
    expect(looksLikeSecret("Rotate the API key every 90 days")).toBe(false);
    expect(looksLikeSecret("Ask: token? secret? Both in the brief")).toBe(
      false,
    );
  });
});

describe("secrets", () => {
  it("spots pasted keys and passwords", () => {
    expect(looksLikeSecret("sk-proj-abcdefghijklmnop1234")).toBe(true);
    expect(looksLikeSecret("ghp_abcdefghijklmnopqrstuvwxyz12")).toBe(true);
    expect(looksLikeSecret("xoxb-1234567890-abcdef")).toBe(true);
    expect(looksLikeSecret("AKIAABCDEFGHIJKLMNOP")).toBe(true);
    expect(looksLikeSecret("password: hunter22")).toBe(true);
    expect(looksLikeSecret("-----BEGIN RSA PRIVATE KEY-----")).toBe(true);
  });
  it("leaves ordinary notes alone", () => {
    expect(looksLikeSecret("Waiting on the API key from their team")).toBe(
      false,
    );
    expect(
      looksLikeSecret("Draft is in review, password reset flow covered"),
    ).toBe(false);
  });
  it("refuses a note with a key in it", () => {
    const result = cleanClient(
      { name: "Acme", notes: "staging token=abcd1234efgh" },
      "create",
    );
    expect(result).toMatchObject({ ok: false });
  });
});

describe("slugs", () => {
  it("makes a short name from the client's name", () => {
    expect(slugify("Acme Corp.")).toBe("acme-corp");
    expect(slugify("  Nébula & Co  ")).toBe("nebula-and-co");
    expect(slugify("!!!")).toBe("");
  });
  it("adds a number when it's taken", () => {
    expect(uniqueSlug("acme", new Set(["acme", "acme-2"]))).toBe("acme-3");
    expect(uniqueSlug("", new Set())).toBe("client");
  });
  it("never takes the name of one of Clients' own pages", () => {
    expect(uniqueSlug("stats", new Set())).toBe("stats-2");
    expect(uniqueSlug("projects", new Set(["projects-2"]))).toBe("projects-3");
  });
  it("won't rename a client to one of Clients' own pages", () => {
    expect(cleanClient({ slug: "stats" }, "update").ok).toBe(false);
    expect(cleanClient({ slug: "stats-co" }, "update").ok).toBe(true);
  });
});

describe("clients and engagements", () => {
  it("needs a name and fills the slug", () => {
    expect(cleanClient({}, "create")).toEqual({
      ok: false,
      message: "Name is needed.",
    });
    const result = cleanClient(
      {
        name: "Acme Corp",
        status: "prospect",
        website: "acme.dev",
        contact_name: "",
      },
      "create",
    );
    expect(result).toEqual({
      ok: true,
      row: {
        name: "Acme Corp",
        slug: "acme-corp",
        status: "prospect",
        website: "https://acme.dev/",
        contact_name: "",
      },
    });
  });

  it("checks an engagement's type, links and dates", () => {
    expect(
      cleanEngagement(
        { client_id: CLIENT, name: "Docs", type: "nope" },
        "create",
      ),
    ).toMatchObject({ ok: false });
    expect(
      cleanEngagement(
        {
          client_id: CLIENT,
          name: "Docs",
          type: "blogs_only",
          starts_on: "2026-11-10",
          ends_on: "2026-11-01",
        },
        "create",
      ),
    ).toEqual({ ok: false, message: "It can't end before it starts." });
    expect(
      cleanEngagement(
        {
          client_id: CLIENT,
          name: "Docs",
          type: "blogs_only",
          contract_url: "ftp://x",
        },
        "create",
      ),
    ).toMatchObject({ ok: false });
    const ok = cleanEngagement(
      {
        client_id: CLIENT,
        name: "Docs",
        type: "internal",
        owner: "Priya@Studio1hq.com",
      },
      "create",
    );
    expect(ok).toEqual({
      ok: true,
      row: {
        client_id: CLIENT,
        name: "Docs",
        type: "internal",
        owner: "priya@studio1hq.com",
      },
    });
  });

  it("keeps the client on an engagement fixed after it's made", () => {
    expect(
      cleanEngagement({ client_id: CLIENT, name: "New" }, "update"),
    ).toEqual({ ok: true, row: { name: "New" } });
  });
});

describe("cycles, scope and invoices", () => {
  it("takes an invoice flag and link, nothing else", () => {
    expect(
      cleanInvoice({
        invoice_state: "sent",
        invoice_url: "https://invoices.example.com/1",
        amount: 500,
      }),
    ).toEqual({
      ok: true,
      row: {
        invoice_state: "sent",
        invoice_url: "https://invoices.example.com/1",
      },
    });
    expect(cleanInvoice({ invoice_state: "maybe" })).toMatchObject({
      ok: false,
    });
  });

  it("checks scope lines", () => {
    expect(
      cleanScopeLine({ cycle_id: CYCLE, kind: "blog", planned: "4" }, "create"),
    ).toEqual({
      ok: true,
      row: { cycle_id: CYCLE, kind: "blog", planned: 4 },
    });
    expect(
      cleanScopeLine(
        { cycle_id: CYCLE, kind: "blog", planned: "-1" },
        "create",
      ),
    ).toMatchObject({ ok: false });
    expect(cleanScopeLine({ owner_role: "" }, "update")).toEqual({
      ok: true,
      row: { owner_role: null },
    });
  });
});

describe("deliverables", () => {
  it("starts as Planned, Medium, and saves the week as its Monday", () => {
    const result = cleanDeliverable(
      { cycle_id: CYCLE, title: "Post", kind: "blog", week: "2026-11-12" },
      "create",
    );
    expect(result).toEqual({
      ok: true,
      row: {
        cycle_id: CYCLE,
        title: "Post",
        kind: "blog",
        week: "2026-11-09",
        status: "planned",
        size: "M",
      },
    });
  });

  it("won't start at Published without a link, or at Client review without a date", () => {
    expect(
      cleanDeliverable(
        { cycle_id: CYCLE, title: "P", kind: "blog", status: "published" },
        "create",
      ),
    ).toMatchObject({ ok: false });
    expect(
      cleanDeliverable(
        { cycle_id: CYCLE, title: "P", kind: "blog", status: "client_review" },
        "create",
      ),
    ).toMatchObject({
      ok: false,
    });
  });

  it("never changes the status or month on an edit", () => {
    expect(
      cleanDeliverable(
        { status: "published", cycle_id: CYCLE, title: "New" },
        "update",
      ),
    ).toEqual({
      ok: true,
      row: { title: "New" },
    });
  });

  it("wants people by email", () => {
    expect(cleanDeliverable({ owner: "Priya" }, "update")).toMatchObject({
      ok: false,
    });
    expect(cleanDeliverable({ owner: "" }, "update")).toEqual({
      ok: true,
      row: { owner: null },
    });
  });
});

describe("moves and blocks", () => {
  it("reads a move", () => {
    expect(
      cleanMove({
        to: "published",
        published_url: "x.dev/post",
        comment: " done ",
      }),
    ).toEqual({
      ok: true,
      to: "published",
      published_url: "https://x.dev/post",
      comment: "done",
    });
    expect(cleanMove({ to: "live" })).toMatchObject({ ok: false });
    expect(
      cleanMove({ to: "client_review", client_due_on: "soon" }),
    ).toMatchObject({ ok: false });
  });

  it("needs a reason and who it waits on to block", () => {
    expect(cleanBlock({ reason: "  ", waits_on: "client" })).toMatchObject({
      ok: false,
    });
    expect(cleanBlock({ reason: "Access", waits_on: "nobody" })).toMatchObject({
      ok: false,
    });
    expect(
      cleanBlock({ reason: " Staging access ", waits_on: "client" }),
    ).toEqual({
      ok: true,
      reason: "Staging access",
      waits_on: "client",
    });
  });
});

describe("templates and people", () => {
  it("cleans template lines", () => {
    expect(
      cleanTemplateLines([
        {
          kind: "blog",
          label: "Blogs",
          quantity: "4",
          owner_role: "writer",
          due_rule: "weekly",
        },
      ]),
    ).toEqual({
      ok: true,
      lines: [
        {
          kind: "blog",
          label: "Blogs",
          quantity: 4,
          owner_role: "writer",
          due_rule: "weekly",
        },
      ],
    });
    expect(cleanTemplateLines([{ kind: "blog" }])).toEqual({
      ok: true,
      lines: [
        {
          kind: "blog",
          label: "",
          quantity: 0,
          owner_role: null,
          due_rule: "none",
        },
      ],
    });
    expect(cleanTemplateLines([{ kind: "poem" }])).toMatchObject({ ok: false });
    expect(cleanTemplateLines("blog")).toMatchObject({ ok: false });
  });

  it("cleans a capacity row", () => {
    expect(
      cleanPerson({
        email: "Priya@Studio1hq.com",
        role: "writer",
        weekly_capacity: "6",
      }),
    ).toEqual({
      ok: true,
      row: {
        email: "priya@studio1hq.com",
        role: "writer",
        weekly_capacity: 6,
        active: true,
      },
    });
    expect(
      cleanPerson({
        email: "p@studio1hq.com",
        role: "writer",
        weekly_capacity: "6",
        slack_user_id: "priya",
      }),
    ).toMatchObject({
      ok: false,
    });
    expect(
      cleanPerson({
        email: "p@studio1hq.com",
        role: "writer",
        weekly_capacity: "500",
      }),
    ).toMatchObject({ ok: false });
  });

  it("turns any day into its week", () => {
    expect(cleanWeek("2026-11-15")).toBe("2026-11-09");
    expect(cleanWeek("nope")).toBeNull();
  });
});
