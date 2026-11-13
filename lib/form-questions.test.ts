import { describe, expect, it } from "vitest";
import { getJobById, getJobIds } from "@/lib/careers";
import { getJobApplicationMailto } from "@/lib/careers-mailto";
import {
  answerError,
  parseQuestions,
  readAnswers,
  readStoredAnswers,
  storedAnswers,
  type FormQuestion,
} from "@/lib/form-questions";
import { EMPTY_APPLICATION, validateApplication } from "@/lib/job-application";

const QUESTIONS: FormQuestion[] = [
  { id: "video", label: "A 60-second video", type: "link", required: true },
  { id: "ideas", label: "Five ideas", type: "long", required: true },
  { id: "numbers", label: "Your numbers", type: "short" },
  {
    id: "tool",
    label: "Favourite tool",
    type: "choice",
    options: ["Loom", "OBS"],
  },
  { id: "shipped", label: "Shipped before?", type: "yesno" },
];

const APPLICATION = {
  ...EMPTY_APPLICATION,
  name: "Asha Rao",
  email: "asha@example.com",
  location: "Pune, India",
  workLinks: "youtube.com/@asha",
  why: "I have made developer explainers for two years and want to do it full time with a team that ships every day.",
  start: "Within 2 weeks",
  contactConsent: true,
  emailUpdates: true,
};

describe("parseQuestions", () => {
  it("reads valid questions and drops unknown keys", () => {
    expect(
      parseQuestions(
        [
          {
            id: "plan",
            label: "Your plan",
            type: "link",
            required: true,
            hint: "One doc.",
            extra: 1,
          },
        ],
        "test.md",
      ),
    ).toEqual([
      {
        id: "plan",
        label: "Your plan",
        type: "link",
        required: true,
        hint: "One doc.",
      },
    ]);
    expect(parseQuestions(undefined, "test.md")).toEqual([]);
  });

  it("throws with the file name on mistakes", () => {
    expect(() =>
      parseQuestions([{ id: "a", label: "A", type: "essay" }], "x.md"),
    ).toThrow(/x\.md: question 1/);
    expect(() =>
      parseQuestions(
        [
          { id: "a", label: "A", type: "short" },
          { id: "a", label: "B", type: "short" },
        ],
        "x.md",
      ),
    ).toThrow(/used twice/);
    expect(() =>
      parseQuestions(
        [{ id: "a", label: "A", type: "choice", options: ["One"] }],
        "x.md",
      ),
    ).toThrow(/two options/);
    expect(() =>
      parseQuestions([{ id: "Bad Id", label: "A", type: "short" }], "x.md"),
    ).toThrow(/lowercase/);
    expect(() => parseQuestions({ id: "a" }, "x.md")).toThrow(/must be a list/);
  });
});

describe("answers", () => {
  it("keeps only this form's questions and adds https:// to links", () => {
    expect(
      readAnswers(QUESTIONS, {
        video: " loom.com/share/abc ",
        other: "dropped",
        numbers: "  ",
      }),
    ).toEqual({
      video: "https://loom.com/share/abc",
    });
  });

  it("checks each type", () => {
    const [video, ideas, numbers, tool, shipped] = QUESTIONS;
    expect(answerError(video, "")).toBe("Answer this one.");
    expect(answerError(video, "https://not a link")).toMatch(/full link/);
    expect(answerError(video, "https://loom.com/share/abc")).toBeNull();
    expect(answerError(ideas, "x".repeat(2001))).toMatch(/under 2,000/);
    expect(answerError(numbers, "")).toBeNull();
    expect(answerError(tool, "Camtasia")).toMatch(/options/);
    expect(answerError(shipped, "Maybe")).toMatch(/yes or no/);
  });

  it("stores answered questions in order, with their wording", () => {
    const stored = storedAnswers(QUESTIONS, {
      ideas: "1. …",
      video: "https://loom.com/x",
    });
    expect(stored).toEqual([
      {
        id: "video",
        question: "A 60-second video",
        answer: "https://loom.com/x",
      },
      { id: "ideas", question: "Five ideas", answer: "1. …" },
    ]);
    expect(readStoredAnswers([...stored, { junk: true }, null])).toEqual(
      stored,
    );
    expect(readStoredAnswers("nope")).toEqual([]);
  });
});

describe("job applications with role questions", () => {
  it("asks the role's questions instead of the plan link", () => {
    const missing = validateApplication(
      { ...APPLICATION, answers: {} },
      QUESTIONS,
    );
    expect(missing.ok).toBe(false);
    if (!missing.ok) {
      expect(missing.errors["answer:video"]).toBe("Answer this one.");
      expect(missing.errors["answer:ideas"]).toBe("Answer this one.");
      expect(missing.errors.planLink).toBeUndefined();
    }

    const done = validateApplication(
      {
        ...APPLICATION,
        planLink: "docs.google.com/ignored",
        answers: { video: "loom.com/share/abc", ideas: "1. …" },
      },
      QUESTIONS,
    );
    expect(done.ok).toBe(true);
    if (done.ok) {
      expect(done.values.planLink).toBe("");
      expect(done.values.answers).toEqual({
        video: "https://loom.com/share/abc",
        ideas: "1. …",
      });
    }
  });

  it("still asks for the plan link when a role has no questions", () => {
    const result = validateApplication(APPLICATION);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.planLink).toMatch(/plan/);
  });
});

describe("role briefs", () => {
  it("every role parses, has its own questions, and none mention subject lines", () => {
    const ids = getJobIds();
    expect(ids.length).toBeGreaterThan(0);
    for (const id of ids) {
      const job = getJobById(id);
      expect(job, id).not.toBeNull();
      expect(job!.questions.length, `${id} has no questions`).toBeGreaterThan(
        0,
      );
      expect(job!.content, id).not.toMatch(/subject line as/i);
      expect(job!.content, id).not.toContain("[...]");
    }
  });

  it("puts the role's questions in the fallback email", () => {
    const job = getJobById("video-creator-intern")!;
    const body = decodeURIComponent(
      getJobApplicationMailto(job).split("body=")[1],
    );
    expect(body).toContain(job.questions[0].label);
    expect(body).not.toContain("1-week plan");
  });
});
