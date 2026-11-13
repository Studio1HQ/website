import { describe, expect, it } from "vitest";
import type { HackathonQuestion } from "@/data/hackathons";
import { HACKATHONS } from "@/data/hackathons";
import { storedAnswers, validateRegistration } from "@/lib/hackathon-registration";

const TRACKS = ["Reliable tool use", "Evals that matter"];

const QUESTIONS: HackathonQuestion[] = [
  { id: "framework", label: "Which framework?", type: "choice", options: ["LangGraph", "Mastra"], required: true },
  { id: "shipped", label: "Shipped one?", type: "yesno" },
  { id: "college", label: "College or company", type: "short" },
  { id: "story", label: "Tell us more", type: "long" },
];

const BASE = {
  name: "Asha Rao",
  email: "Asha@example.com",
  github: "asharao",
  country: "India",
  role: "Student",
  experience: "Beginner",
  team: "solo",
  track: "Reliable tool use",
  agree: true,
  contactConsent: true,
  emailUpdates: true,
};

describe("hackathon registration questions", () => {
  it("accepts valid answers and drops answers to questions the event doesn't ask", () => {
    const result = validateRegistration(
      { ...BASE, answers: { framework: "Mastra", shipped: "No", college: "  IIT Delhi ", sneaky: "x" } },
      TRACKS,
      QUESTIONS,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.values.answers).toEqual({ framework: "Mastra", shipped: "No", college: "IIT Delhi" });
    expect(storedAnswers(QUESTIONS, result.values.answers)).toEqual([
      { id: "framework", question: "Which framework?", answer: "Mastra" },
      { id: "shipped", question: "Shipped one?", answer: "No" },
      { id: "college", question: "College or company", answer: "IIT Delhi" },
    ]);
  });

  it("flags a missing required answer, an unknown option and a bad yes/no", () => {
    const missing = validateRegistration({ ...BASE, answers: {} }, TRACKS, QUESTIONS);
    expect(missing.ok).toBe(false);
    if (!missing.ok) expect(Object.keys(missing.errors)).toEqual(["answer:framework"]);

    const wrong = validateRegistration(
      { ...BASE, answers: { framework: "AutoGen", shipped: "Maybe" } },
      TRACKS,
      QUESTIONS,
    );
    expect(wrong.ok).toBe(false);
    if (!wrong.ok) {
      expect(wrong.errors["answer:framework"]).toBe("Pick one of the options.");
      expect(wrong.errors["answer:shipped"]).toBe("Pick yes or no.");
    }
  });

  it("caps answer length by question type", () => {
    const result = validateRegistration(
      { ...BASE, answers: { framework: "Mastra", college: "x".repeat(201), story: "y".repeat(1001) } },
      TRACKS,
      QUESTIONS,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors["answer:college"]).toMatch(/200/);
      expect(result.errors["answer:story"]).toMatch(/1,000/);
    }
  });

  it("ignores answers entirely when the event has no questions", () => {
    const result = validateRegistration({ ...BASE, answers: { framework: "Mastra" } }, TRACKS);
    expect(result.ok && result.values.answers).toEqual({});
  });

  it("keeps every event's questions well formed", () => {
    for (const hackathon of HACKATHONS) {
      const ids = (hackathon.questions ?? []).map((question) => question.id);
      expect(new Set(ids).size, `${hackathon.slug} repeats a question id`).toBe(ids.length);
      for (const question of hackathon.questions ?? []) {
        expect(question.id, `${hackathon.slug}: ids are kebab-case`).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
        if (question.type === "choice") expect(question.options?.length, `${hackathon.slug}/${question.id}`).toBeGreaterThan(1);
      }
    }
  });
});
