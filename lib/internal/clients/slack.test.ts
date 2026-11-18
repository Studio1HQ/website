import { describe, expect, it } from "vitest";
import {
  blockLine,
  clientWeekSummary,
  clientsWebhook,
  statusLine,
} from "@/lib/internal/clients/slack";
import { weekLines } from "@/lib/internal/clients/week";

describe("client work in Slack", () => {
  it("posts only to Slack's webhook host, and only when set", () => {
    expect(clientsWebhook({})).toBeNull();
    expect(
      clientsWebhook({
        SLACK_WEBHOOK_URL: "https://hooks.slack.com/services/ALL",
      }),
    ).toBeNull();
    expect(
      clientsWebhook({ SLACK_WEBHOOK_URL_CLIENTS: "https://example.com/hook" }),
    ).toBeNull();
    expect(
      clientsWebhook({
        SLACK_WEBHOOK_URL_CLIENTS: " https://hooks.slack.com/services/C ",
      }),
    ).toBe("https://hooks.slack.com/services/C");
  });

  it("says a status change in one line", () => {
    expect(
      statusLine({
        client: "Acme",
        title: "Launch post",
        from: "internal_review",
        to: "client_review",
        by: "Priya",
      }).text,
    ).toBe(
      ":arrow_right: *Acme* · Launch post: Internal review → Client review (Priya)",
    );
    expect(
      statusLine({
        client: "Acme",
        title: "Post",
        from: "approved",
        to: "published",
        by: "",
      }).text,
    ).toBe(":white_check_mark: *Acme* · Post: Approved → Published");
  });

  it("escapes what people typed, so nobody can ping the channel", () => {
    const line = statusLine({
      client: "<!channel>",
      title: "<https://evil|x>",
      from: null,
      to: "planned",
      by: "a&b",
    });
    expect(line.text).not.toContain("<!channel>");
    expect(line.text).not.toContain("<https://evil");
    expect(line.text).toContain("&lt;!channel&gt;");
  });

  it("says when something is blocked and on whom", () => {
    expect(
      blockLine({
        client: "Acme",
        title: "Post",
        blocked: true,
        waitsOn: "the client",
        reason: "Logo files",
        by: "Priya",
      }).text,
    ).toBe(
      ":no_entry: *Acme* · Post: blocked, waiting on the client (Logo files) · Priya",
    );
    expect(
      blockLine({ client: "Acme", title: "Post", blocked: false, by: "Priya" })
        .text,
    ).toBe(":arrow_forward: *Acme* · Post: unblocked · Priya");
  });

  it("builds one client's week with names, groups and live links only", () => {
    const lines = weekLines({
      week: "2026-11-16",
      today: "2026-11-18",
      tasks: [
        {
          id: "t1",
          email: "priya@studio1hq.com",
          title: "Article plan",
          status: "done",
          engagement_id: "e1",
          deliverable_id: null,
          due_on: null,
          done_on: "2026-11-17",
          blocked: false,
          block_reason: "",
        },
      ],
      deliverables: [
        {
          id: "d1",
          engagement_id: "e1",
          title: "Proxy guide",
          owner: "rahul@studio1hq.com",
          status: "client_review",
          status_changed_at: "2026-11-10T04:00:00Z",
          published_at: null,
          published_url: null,
          blocked: false,
          block_reason: "",
          waits_on: null,
          week: null,
          due_on: "2026-11-19",
          client_due_on: "2026-11-16",
        },
      ],
    });
    const message = clientWeekSummary({
      client: "Bright Data",
      week: "2026-11-16",
      lines,
      names: { "priya@studio1hq.com": "Priya" },
      workspaceUrl: "https://s/clients/bright-data?week=2026-11-16",
    });
    expect(message.text).toBe(
      ":spiral_calendar_pad: Bright Data, week of 16–22 Nov: 1 done · 0 in progress · 0 up next · 1 blocked or waiting",
    );
    const body = JSON.stringify(message.blocks);
    expect(body).toContain("• Article plan (Priya) · done Tue 17 Nov");
    expect(body).toContain("• Proxy guide (rahul) · due Thu 19 Nov · _waiting on client_");
    expect(body).toContain("bright-data?week=2026-11-16");
  });
});
