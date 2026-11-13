import { describe, expect, it } from "vitest";
import { slackEscape, slackMessage, webhookFor } from "@/lib/internal/slack";

describe("slack alerts", () => {
  it("escapes what visitors typed", () => {
    expect(slackEscape("<!channel> & <https://evil.example|click>")).toBe("&lt;!channel&gt; &amp; &lt;https://evil.example|click&gt;");
  });

  it("uses a form's own webhook when there is one", () => {
    const env = {
      SLACK_WEBHOOK_URL: "https://hooks.slack.com/services/ALL",
      SLACK_WEBHOOK_URL_JOBS: "https://hooks.slack.com/services/JOBS",
    };
    expect(webhookFor("jobs", env)).toBe("https://hooks.slack.com/services/JOBS");
    expect(webhookFor("hackathons", env)).toBe("https://hooks.slack.com/services/ALL");
    expect(webhookFor("cohort", {})).toBeNull();
  });

  it("only posts to Slack's webhook host", () => {
    expect(webhookFor("jobs", { SLACK_WEBHOOK_URL: "https://example.com/hook" })).toBeNull();
    expect(webhookFor("jobs", { SLACK_WEBHOOK_URL: "http://hooks.slack.com/services/x" })).toBeNull();
  });

  it("is a title with the name, a few points and a button to the entry", () => {
    const message = slackMessage(
      {
        form: "jobs",
        id: "abc",
        name: " Ada\n Lovelace ",
        points: [
          ["Role", "Growth Lead"],
          ["Location", "  Bengaluru,\n India"],
          ["Can start", "Immediately"],
        ],
      },
      "https://www.studio1hq.com",
    );
    expect(message.text).toBe("New job application: Ada Lovelace · Growth Lead · Bengaluru, India · Immediately");
    expect(message.blocks).toEqual([
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: ":briefcase: *New job application: Ada Lovelace*\n• *Role:* Growth Lead\n• *Location:* Bengaluru, India\n• *Can start:* Immediately",
        },
      },
      {
        type: "actions",
        elements: [
          {
            type: "button",
            text: { type: "plain_text", text: "Open in dashboard" },
            url: "https://www.studio1hq.com/internal/jobs/abc",
            style: "primary",
          },
        ],
      },
    ]);
  });

  it("escapes what people typed, so nobody can ping the channel or hide a link", () => {
    const message = slackMessage(
      {
        form: "hackathons",
        id: "x",
        name: "<!channel> & co",
        points: [["Track", "<https://evil.example|click>"]],
      },
      "https://s",
    );
    const json = JSON.stringify(message);
    expect(json).not.toContain("<!channel>");
    expect(json).not.toContain("<https://evil");
    expect(message.text).toBe("New hackathon registration: &lt;!channel&gt; &amp; co · &lt;https://evil.example|click&gt;");
  });

  it("skips empty points and shows at most three", () => {
    const message = slackMessage(
      {
        form: "cohort",
        id: "x",
        name: "Ada",
        points: [
          ["Cohort", "DevRel Cohort 2"],
          ["Background", "  "],
          ["Location", "Pune"],
          ["Experience", "Beginner"],
          ["Extra", "never shown"],
        ],
      },
      "https://s",
    );
    expect(message.text).toBe("New DevRel Cohort application: Ada · DevRel Cohort 2 · Pune · Beginner");
  });
});
