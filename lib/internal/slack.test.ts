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

  it("says what and where, links to the entry, and nothing personal", () => {
    const message = slackMessage(
      { form: "jobs", id: "abc", program: "Growth Lead", place: "  Bengaluru,\n India <b>" },
      "https://www.studio1hq.com",
    );
    expect(message.text).toBe("New job application · Growth Lead · Bengaluru, India &lt;b&gt;");
    expect(JSON.stringify(message)).toContain("https://www.studio1hq.com/internal/jobs/abc");
  });

  it("works without a place", () => {
    expect(slackMessage({ form: "cohort", id: "x", program: "DevRel Cohort 2" }, "https://s").text).toBe(
      "New DevRel Cohort application · DevRel Cohort 2",
    );
  });
});
