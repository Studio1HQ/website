/**
 * A form's own questions, asked after its standard fields: each job role
 * lists them in its brief's frontmatter (content/careers/jobs). Answers are
 * stored as [{ id, question, answer }] with the question's wording at the
 * time, so old answers still read right if it changes later.
 *
 * Plain data and checks only, shared by the form and its API route.
 */

export type QuestionType = "short" | "long" | "link" | "choice" | "yesno";

export type FormQuestion = {
  /** Saved with every answer: never rename or reuse one once people have answered. */
  id: string;
  label: string;
  /**
   * short: one line. long: a paragraph. link: a URL (Google Doc, video,
   * repo). choice: one of `options`. yesno: Yes or No.
   */
  type: QuestionType;
  options?: string[];
  required?: boolean;
  hint?: string;
  placeholder?: string;
};

export type StoredAnswer = { id: string; question: string; answer: string };

/** An answer's error key, as used by the form's inputs. */
export type AnswerField = `answer:${string}`;
export const answerField = (id: string): AnswerField => `answer:${id}`;

/** Longest answer per question type, in characters. */
export const ANSWER_MAX = { short: 200, long: 2000, link: 500 } as const;
export const YES_NO = ["Yes", "No"] as const;

const TYPES: readonly QuestionType[] = [
  "short",
  "long",
  "link",
  "choice",
  "yesno",
];
const ID = /^[a-z0-9][a-z0-9-]{0,39}$/;

const text = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";

/** Adds https:// when someone pastes "docs.google.com/…". */
export function withProtocol(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

export function isHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return (
      (url.protocol === "https:" || url.protocol === "http:") &&
      url.hostname.includes(".")
    );
  } catch {
    return false;
  }
}

/**
 * Reads questions from frontmatter. A mistake (unknown type, repeated id, a
 * choice without options) throws with the file's name, so a broken brief
 * fails the build instead of showing a broken form.
 */
export function parseQuestions(raw: unknown, where: string): FormQuestion[] {
  if (raw == null) return [];
  if (!Array.isArray(raw))
    throw new Error(`${where}: "questions" must be a list.`);
  const seen = new Set<string>();
  return raw.map((item, index) => {
    const at = `${where}: question ${index + 1}`;
    if (!item || typeof item !== "object")
      throw new Error(`${at} isn't a question.`);
    const value = item as Record<string, unknown>;
    const id = text(value.id);
    const label = text(value.label);
    const type = text(value.type) as QuestionType;
    if (!ID.test(id))
      throw new Error(
        `${at}: id must be lowercase letters, digits and dashes.`,
      );
    if (seen.has(id)) throw new Error(`${at}: the id "${id}" is used twice.`);
    seen.add(id);
    if (!label) throw new Error(`${at}: add a label.`);
    if (!TYPES.includes(type))
      throw new Error(`${at}: type must be one of ${TYPES.join(", ")}.`);
    const options = Array.isArray(value.options)
      ? value.options.map(text).filter(Boolean)
      : undefined;
    if (type === "choice" && (!options || options.length < 2)) {
      throw new Error(`${at}: a choice needs at least two options.`);
    }
    return {
      id,
      label,
      type,
      ...(type === "choice" ? { options } : {}),
      ...(value.required === true ? { required: true } : {}),
      ...(text(value.hint) ? { hint: text(value.hint) } : {}),
      ...(text(value.placeholder)
        ? { placeholder: text(value.placeholder) }
        : {}),
    };
  });
}

/** The submitted answers to these questions only, trimmed; links get https://. */
export function readAnswers(
  questions: readonly FormQuestion[],
  raw: unknown,
): Record<string, string> {
  const input =
    raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const answers: Record<string, string> = {};
  for (const question of questions) {
    let answer = text(input[question.id]);
    if (question.type === "link") answer = withProtocol(answer);
    if (answer) answers[question.id] = answer;
  }
  return answers;
}

/** Checks one answer; returns an error or null. */
export function answerError(question: FormQuestion, answer: string) {
  if (!answer) return question.required ? "Answer this one." : null;
  switch (question.type) {
    case "short":
    case "long":
      return answer.length > ANSWER_MAX[question.type]
        ? `Keep it under ${ANSWER_MAX[question.type].toLocaleString("en-US")} characters.`
        : null;
    case "link":
      if (answer.length > ANSWER_MAX.link) return "That link is too long.";
      return isHttpUrl(answer)
        ? null
        : "Enter a full link, like docs.google.com/…";
    case "choice":
      return (question.options ?? []).includes(answer)
        ? null
        : "Pick one of the options.";
    case "yesno":
      return (YES_NO as readonly string[]).includes(answer)
        ? null
        : "Pick yes or no.";
  }
}

/** Every answer's error, keyed by its answer field. */
export function answerErrors(
  questions: readonly FormQuestion[],
  answers: Record<string, string>,
) {
  const errors: Partial<Record<AnswerField, string>> = {};
  for (const question of questions) {
    const error = answerError(question, answers[question.id] ?? "");
    if (error) errors[answerField(question.id)] = error;
  }
  return errors;
}

/** The answers to save: answered questions only, in the form's order. */
export function storedAnswers(
  questions: readonly FormQuestion[],
  answers: Record<string, string>,
): StoredAnswer[] {
  return questions
    .filter((question) => answers[question.id])
    .map((question) => ({
      id: question.id,
      question: question.label,
      answer: answers[question.id],
    }));
}

/** Stored answers read back from the database, skipping anything malformed. */
export function readStoredAnswers(value: unknown): StoredAnswer[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) =>
    item &&
    typeof item === "object" &&
    typeof item.question === "string" &&
    typeof item.answer === "string"
      ? [
          {
            id: String(item.id ?? item.question),
            question: item.question,
            answer: item.answer,
          },
        ]
      : [],
  );
}
